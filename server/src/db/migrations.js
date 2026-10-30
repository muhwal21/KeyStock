import { DataTypes, Op } from 'sequelize';
import catalog from '../seeders/catalog.json' with { type: 'json' };
import { sequelize, Product, ProductImage } from '../models/index.js';
import { productGalleryAssets } from '../seeders/productGalleryAssets.js';

// Usernames were added after the first release: add the column, fill it for existing
// accounts from the email name, then make it unique.
async function migrateUsernames(queryInterface) {
  const columns = await queryInterface.describeTable('users');
  if (!columns.username) {
    await queryInterface.addColumn('users', 'username', { type: DataTypes.STRING(40), allowNull: true });
  }

  const [rows] = await sequelize.query('SELECT id, email FROM users WHERE username IS NULL');
  for (const row of rows) {
    const base = row.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 30) || 'user';
    let candidate = base.length >= 3 ? base : `${base}user`;
    const [taken] = await sequelize.query('SELECT id FROM users WHERE username = ? LIMIT 1', { replacements: [candidate] });
    if (taken.length) candidate = `${candidate.slice(0, 30)}${row.id}`;
    await sequelize.query('UPDATE users SET username = ? WHERE id = ?', { replacements: [candidate, row.id] });
  }

  const indexes = await queryInterface.showIndex('users');
  const hasUnique = indexes.some((index) => index.unique && index.fields.some((field) => field.attribute === 'username'));
  if (!hasUnique) {
    await queryInterface.addIndex('users', ['username'], { unique: true, name: 'users_username_unique' });
  }
}

async function migrateAuthFields(queryInterface) {
  const columns = await queryInterface.describeTable('users');
  if (!columns.approval_status) {
    await queryInterface.addColumn('users', 'approval_status', {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'), allowNull: false, defaultValue: 'approved',
    });
  }
  if (!columns.token_version) {
    await queryInterface.addColumn('users', 'token_version', { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 });
  }
}

// Normalize old role values without silently changing access for unrelated accounts.
async function migrateRoleNames() {
  const [columns] = await sequelize.query("SHOW COLUMNS FROM users WHERE Field = 'role'");
  const roleType = String(columns[0]?.Type ?? columns[0]?.type ?? '');
  const currentRoles = [...roleType.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  if (!currentRoles.includes('admin') || !currentRoles.includes('staff')) {
    throw new Error('Tipe users.role tidak sesuai dengan skema yang diharapkan; role tidak diubah.');
  }
  const supportedRoles = new Set(['admin', 'staff', 'dosen']);
  const hasOlderRoleValues = currentRoles.some((role) => !supportedRoles.has(role));
  if (hasOlderRoleValues) {
    const [unmappedRows] = await sequelize.query("SELECT COUNT(*) AS count FROM users WHERE role NOT IN ('admin', 'staff', 'dosen') AND COALESCE(username, '') <> 'dosen'");
    if (Number(unmappedRows[0]?.count ?? 0) > 0) {
      throw new Error('Ada akun selain username dosen dengan peran lama; tentukan perannya sebelum migrasi.');
    }
  }

  if (!currentRoles.includes('dosen')) {
    const widenedRoles = [...currentRoles, 'dosen'];
    await sequelize.query(`ALTER TABLE users MODIFY role ENUM(${widenedRoles.map((role) => `'${role}'`).join(',')}) NOT NULL DEFAULT 'staff'`);
  }

  await sequelize.query("UPDATE users SET name = 'Dosen', role = 'dosen', token_version = token_version + 1 WHERE username = 'dosen' AND (name <> 'Dosen' OR role <> 'dosen')");

  const [unexpectedRows] = await sequelize.query("SELECT COUNT(*) AS count FROM users WHERE role NOT IN ('admin', 'staff', 'dosen')");
  if (Number(unexpectedRows[0]?.count ?? 0) > 0) {
    throw new Error('Masih ada akun dengan peran lama yang belum dipetakan; role enum tidak diubah.');
  }

  if (currentRoles.join(',') !== 'admin,staff,dosen') {
    await sequelize.query("ALTER TABLE users MODIFY role ENUM('admin','staff','dosen') NOT NULL DEFAULT 'staff'");
  }
}

// Products created before the gallery existed get their single image_url as the first photo.
async function migrateProductImages() {
  const products = await Product.findAll({ attributes: ['id', 'image_url'], where: { image_url: { [Op.ne]: null } } });
  for (const product of products) {
    const count = await ProductImage.count({ where: { product_id: product.id } });
    if (count === 0) await ProductImage.create({ product_id: product.id, url: product.image_url, sort_order: 0 });
  }
}

// Add bundled official gallery angles without duplicating images on repeated syncs.
async function migrateProductGalleryAssets() {
  for (const [sku, urls] of Object.entries(productGalleryAssets)) {
    const product = await Product.findOne({ attributes: ['id'], where: { sku } });
    if (!product) continue;

    const images = await ProductImage.findAll({
      attributes: ['url', 'sort_order'],
      where: { product_id: product.id },
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });
    const existingUrls = new Set(images.map((image) => image.url));
    let nextOrder = images.reduce((max, image) => Math.max(max, Number(image.sort_order)), -1) + 1;
    for (const url of urls) {
      if (existingUrls.has(url)) continue;
      await ProductImage.create({ product_id: product.id, url, sort_order: nextOrder });
      existingUrls.add(url);
      nextOrder += 1;
    }
  }
}

// Catalog image assets were normalized to WebP. Change only the known local catalog
// paths; uploaded blobs and externally managed image URLs remain untouched.
async function migrateCatalogImageUrls() {
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  await sequelize.transaction(async (transaction) => {
    const catalogSkus = new Set(catalog.produk.map((item) => item.id));
    const products = await Product.findAll({ attributes: ['id', 'sku', 'image_url'], transaction });
    for (const product of products) {
      if (!catalogSkus.has(product.sku)) continue;
      const oldPaths = extensions.map((extension) => `/images/${product.sku}.${extension}`);
      const newPath = `/images/${product.sku}.webp`;
      if (oldPaths.includes(product.image_url)) {
        await sequelize.query('UPDATE products SET image_url = :newPath WHERE id = :id AND image_url IN (:oldPaths)', {
          replacements: { newPath, id: product.id, oldPaths },
          transaction,
        });
      }
      await sequelize.query('UPDATE product_images SET url = :newPath WHERE product_id = :id AND url IN (:oldPaths)', {
        replacements: { newPath, id: product.id, oldPaths },
        transaction,
      });
    }
  });
}

// Movement reasons and price snapshots were added for profit and loss. Older rows get the
// default reason for their type and the product's current prices.
async function migrateMovementFinance(queryInterface) {
  const columns = await queryInterface.describeTable('stock_movements');
  if (columns.reason) return;
  await queryInterface.addColumn('stock_movements', 'reason', {
    type: DataTypes.ENUM('PURCHASE', 'RETURN_IN', 'SALE', 'DAMAGED', 'LOST', 'RETURN_OUT', 'STOCK_COUNT'),
    allowNull: false,
    defaultValue: 'STOCK_COUNT',
  });
  await queryInterface.addColumn('stock_movements', 'unit_cost', { type: DataTypes.DECIMAL(14, 2), allowNull: true });
  await queryInterface.addColumn('stock_movements', 'unit_price', { type: DataTypes.DECIMAL(14, 2), allowNull: true });
  await queryInterface.addColumn('stock_movements', 'currency', { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'IDR' });
  await sequelize.query(`
    UPDATE stock_movements m JOIN products p ON p.id = m.product_id
    SET m.reason = CASE m.movement_type WHEN 'IN' THEN 'PURCHASE' WHEN 'OUT' THEN 'SALE' ELSE 'STOCK_COUNT' END,
        m.unit_cost = p.purchase_price,
        m.unit_price = CASE WHEN m.movement_type = 'OUT' THEN p.selling_price ELSE NULL END,
        m.currency = p.currency
  `);
}

// Password reset records belong to an account and are disposable once that account
// is removed. Refuse to add the FK if any orphaned reset rows need manual review.
async function migratePasswordResetForeignKey(queryInterface) {
  const [foreignKeys] = await sequelize.query(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'password_resets'
      AND COLUMN_NAME = 'user_id'
      AND REFERENCED_TABLE_NAME = 'users'
    LIMIT 1
  `);
  if (foreignKeys.length) return;

  const [rows] = await sequelize.query(`
    SELECT COUNT(*) AS orphan_count
    FROM password_resets r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE u.id IS NULL
  `);
  if (Number(rows[0]?.orphan_count ?? 0) > 0) {
    throw new Error('password_resets memiliki user_id yatim; tinjau data tersebut sebelum menambahkan foreign key.');
  }

  await queryInterface.addConstraint('password_resets', {
    fields: ['user_id'],
    type: 'foreign key',
    name: 'fk_password_resets_user',
    references: { table: 'users', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });
}

export async function migrateInventoryFields() {
  const queryInterface = sequelize.getQueryInterface();
  await migratePasswordResetForeignKey(queryInterface);
  await migrateUsernames(queryInterface);
  await migrateAuthFields(queryInterface);
  await migrateRoleNames();
  await migrateMovementFinance(queryInterface);
  await sequelize.query(`
    UPDATE stock_movements
    SET note = 'Stok awal setelah penghitungan inventaris.'
    WHERE note = 'Stok awal simulasi untuk demo UAS.'
  `);
  const columns = await queryInterface.describeTable('products');

  if (!columns.purchase_price) {
    await queryInterface.addColumn('products', 'purchase_price', { type: DataTypes.DECIMAL(14, 2), allowNull: true });
  }
  if (!columns.selling_price) {
    await queryInterface.addColumn('products', 'selling_price', { type: DataTypes.DECIMAL(14, 2), allowNull: true });
  }
  if (!columns.storage_location) {
    await queryInterface.addColumn('products', 'storage_location', { type: DataTypes.STRING(80), allowNull: true });
  }
  if (!columns.supplier_id) {
    await queryInterface.addColumn('products', 'supplier_id', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true });
  }

  const [foreignKeys] = await sequelize.query(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'supplier_id'
      AND REFERENCED_TABLE_NAME = 'suppliers'
    LIMIT 1
  `);
  if (foreignKeys.length === 0) {
    await queryInterface.addConstraint('products', {
      fields: ['supplier_id'],
      type: 'foreign key',
      name: 'fk_products_supplier',
      references: { table: 'suppliers', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }
  await migrateProductImages();
  await migrateCatalogImageUrls();
  await migrateProductGalleryAssets();
}
