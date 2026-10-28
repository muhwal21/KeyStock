import 'dotenv/config';
import bcrypt from 'bcryptjs';
import catalog from './catalog.json' with { type: 'json' };
import { Category, Product, ProductImage, sequelize, StockMovement, Supplier, User } from '../models/index.js';
import { migrateInventoryFields } from '../db/migrations.js';

const categoryLabels = {
  keyboard: 'Keyboard',
  switch: 'Switches',
  aksesoris: 'Accessories',
  keycaps: 'Keycaps',
  deskmat: 'Deskmats',
};

// Simulated on-hand quantities for the demo. A few items sit at or below the reorder
// point (6) and one is out of stock, so the restock list and status badges have data.
const demoStockLevels = [14, 3, 22, 9, 18, 0, 27, 11, 16, 24, 5, 13, 19, 8, 21, 2, 12, 15, 10, 26, 4, 17, 20];
const restockNotes = ['Restock dari supplier', 'Barang datang dari distributor', 'Pembelian ulang batch baru'];
const saleNotes = ['Penjualan toko offline', 'Pesanan marketplace dikirim', 'Penjualan ke pelanggan tetap'];

// Rack layout for the demo: keyboards on rack A (7 slots per shelf), switches and keycaps
// on rack B (3 slots), accessories and deskmats on rack C (4 slots). Code: RAK-TINGKAT-SLOT.
const rackByCategory = { keyboard: 'A', switch: 'B', keycaps: 'B', aksesoris: 'C', deskmat: 'C' };
const slotsPerShelf = { A: 7, B: 3, C: 4 };
const rackCounters = {};
const rackOrder = ['keyboard', 'switch', 'keycaps', 'aksesoris', 'deskmat'];
const demoLocations = new Map();
for (const category of rackOrder) {
  for (const source of catalog.produk.filter((item) => item.kategori === category)) {
    const rack = rackByCategory[category];
    const position = rackCounters[rack] ?? 0;
    rackCounters[rack] = position + 1;
    const level = Math.floor(position / slotsPerShelf[rack]) + 1;
    const slot = (position % slotsPerShelf[rack]) + 1;
    demoLocations.set(source.id, `${rack}-${level}-${String(slot).padStart(2, '0')}`);
  }
}

// Simulated cost ratio per category: purchase price = selling price x ratio.
const costRatio = { keyboard: 0.75, switch: 0.65, aksesoris: 0.6, keycaps: 0.7, deskmat: 0.62 };

function simulatedPrices(source, isUsd, listingPrice) {
  if (listingPrice == null) return { purchase: null, selling: null };
  const ratio = costRatio[source.kategori] ?? 0.7;
  const purchase = isUsd ? Math.round(listingPrice * ratio * 100) / 100 : Math.round((listingPrice * ratio) / 1000) * 1000;
  return { purchase, selling: listingPrice };
}

function daysAgo(days, hour) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, (days * 17) % 60, 0, 0);
  // Never place demo entries in the future when the seed runs early in the day.
  return date > new Date() ? new Date(Date.now() - (24 - hour) * 60 * 1000) : date;
}

// Builds a believable seven-day history for one product: an opening balance followed by
// stock-in and stock-out entries. Every row stores the balance before and after.
function demoHistory(index, targetStock) {
  const events = [];
  if (index % 3 === 0) events.push({ type: 'IN', reason: 'PURCHASE', quantity: 5 + (index % 4), at: daysAgo(index % 7, 10), note: restockNotes[index % 3] });
  if (index % 2 === 0) {
    const damaged = index % 7 === 0;
    events.push({
      type: 'OUT', reason: damaged ? 'DAMAGED' : 'SALE', quantity: damaged ? 1 : 2 + (index % 3),
      at: daysAgo((index + 3) % 7, 15), note: damaged ? 'Unit rusak saat pengiriman' : saleNotes[index % 3],
    });
  }
  if (index % 5 === 1) events.push({ type: 'OUT', reason: 'SALE', quantity: 1 + (index % 2), at: daysAgo((index + 1) % 7, 13), note: saleNotes[(index + 1) % 3] });
  if (index % 4 === 2) events.push({ type: 'IN', reason: 'PURCHASE', quantity: 4, at: daysAgo((index + 5) % 7, 9), note: restockNotes[(index + 1) % 3] });
  events.sort((a, b) => a.at - b.at);

  const netChange = events.reduce((sum, event) => sum + (event.type === 'IN' ? event.quantity : -event.quantity), 0);
  let opening = Math.max(0, targetStock - netChange);
  let balance = opening;
  let lowest = opening;
  for (const event of events) {
    balance += event.type === 'IN' ? event.quantity : -event.quantity;
    lowest = Math.min(lowest, balance);
  }
  if (lowest < 0) opening -= lowest;

  return { opening, openedAt: daysAgo(8, 8), events };
}

const supplierSources = [
  { host: 'www.noirgear.com', name: 'Noir Gear Official Store', website: 'https://www.noirgear.com' },
  { host: 'worklouder.cc', name: 'Work Louder Official Store', website: 'https://worklouder.cc' },
];

function productDefaults(source, categoryId, supplierId, index) {
  const isUsd = source.harga_usd != null;
  const priceMin = source.harga_idr_min ?? source.harga_usd ?? null;
  const priceMax = source.harga_idr_max ?? source.harga_usd ?? null;
  const specs = source.spek && typeof source.spek === 'object' ? source.spek : {};
  const simulatedStock = demoStockLevels[index % demoStockLevels.length];
  const imageExtension = source.gambar?.[0]
    ? new URL(source.gambar[0]).pathname.split('.').pop().toLowerCase()
    : null;
  const localImageExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(imageExtension) ? imageExtension : null;
  const prices = simulatedPrices(source, isUsd, priceMin);

  return {
    category_id: categoryId,
    sku: source.id,
    name: source.nama,
    brand: source.brand ?? 'Unknown brand',
    description: source.deskripsi ?? '',
    price_min: priceMin,
    price_max: priceMax,
    purchase_price: prices.purchase,
    selling_price: prices.selling,
    currency: isUsd ? 'USD' : 'IDR',
    listing_status: source.status ?? 'Ready',
    warehouse_stock: simulatedStock,
    reorder_point: 6,
    storage_location: demoLocations.get(source.id) ?? null,
    supplier_id: supplierId,
    source_url: source.url ?? source.url_sumber ?? null,
    image_url: localImageExtension ? `/images/${source.id}.${localImageExtension}` : null,
    specifications: specs,
    variants: Array.isArray(source.varian) ? source.varian : [],
    is_active: true,
  };
}

// Demo accounts come from environment variables, never from the code. ADMIN is required;
// DOSEN (lecturer, admin role) and STAFF are created when their email and password are set.
const accountSpecs = [
  { key: 'ADMIN', role: 'admin', name: 'KeyStock Admin', username: 'admin', required: true },
  { key: 'DOSEN', role: 'lecturer', name: 'Dosen Penguji', username: 'dosen' },
  { key: 'STAFF', role: 'staff', name: 'Staff Gudang', username: 'staff' },
];

function readAccount(spec) {
  const env = process.env;
  const email = env[`SEED_${spec.key}_EMAIL`]?.trim().toLowerCase();
  const password = env[`SEED_${spec.key}_PASSWORD`];
  if (!email || !password) {
    if (spec.required) throw new Error(`Set SEED_${spec.key}_EMAIL dan SEED_${spec.key}_PASSWORD di .env.`);
    if (email || password) console.warn(`Akun ${spec.key.toLowerCase()} dilewati: isi email dan password bersamaan.`);
    return null;
  }
  if (password.length < 12 || password.length > 128 || password.toLowerCase().includes('replace-with')) {
    throw new Error(`SEED_${spec.key}_PASSWORD harus 12–128 karakter dan bukan nilai contoh.`);
  }
  const username = (env[`SEED_${spec.key}_USERNAME`]?.trim() || spec.username).toLowerCase();
  if (!/^[a-z0-9._]{3,30}$/.test(username)) throw new Error(`SEED_${spec.key}_USERNAME tidak valid.`);
  return { email, password, username, role: spec.role, name: env[`SEED_${spec.key}_NAME`]?.trim() || spec.name };
}

// Creates the account or brings it back to the configured name, role, username, and password.
async function upsertAccount(account) {
  let user = await User.unscoped().findOne({ where: { email: account.email } });
  const usernameOwner = await User.unscoped().findOne({ where: { username: account.username } });
  const usernameFree = !usernameOwner || (user && usernameOwner.id === user.id);
  if (!usernameFree) console.warn(`Username "${account.username}" sudah dipakai akun lain; username tidak diubah.`);

  if (!user) {
    return User.unscoped().create({
      name: account.name,
      username: usernameFree ? account.username : null,
      email: account.email,
      password_hash: await bcrypt.hash(account.password, 12),
      role: account.role,
      is_active: true,
      approval_status: 'approved',
    });
  }
  const updates = { name: account.name, role: account.role, is_active: true, approval_status: 'approved' };
  if (usernameFree) updates.username = account.username;
  if (!(await bcrypt.compare(account.password, user.password_hash))) {
    updates.password_hash = await bcrypt.hash(account.password, 12);
    updates.token_version = user.token_version + 1;
  }
  await user.update(updates);
  return user;
}

async function seed({ fresh = false } = {}) {
  const accounts = accountSpecs.map((spec) => ({ spec, account: readAccount(spec) }));

  await sequelize.authenticate();
  if (fresh) {
    // --fresh drops and recreates the domain tables (demo reset). Sessions are kept.
    await sequelize.sync({ force: true });
    console.log('Tabel dihapus dan dibuat ulang (--fresh).');
  } else {
    await sequelize.sync();
  }
  await migrateInventoryFields();

  const seededUsers = {};
  for (const { spec, account } of accounts) {
    if (!account) continue;
    seededUsers[spec.key] = await upsertAccount(account);
    console.log(`Akun ${spec.key.toLowerCase()}: ${account.username} / ${account.email} (${account.role})`);
  }
  const admin = seededUsers.ADMIN;
  const staffUser = seededUsers.STAFF ?? null;

  const supplierIds = new Map();
  for (const source of supplierSources) {
    const [supplier] = await Supplier.findOrCreate({
      where: { name: source.name },
      defaults: {
        website: source.website,
        notes: 'Referensi dari sumber produk; kontak supplier belum diverifikasi.',
        is_active: true,
      },
    });
    supplierIds.set(source.host, supplier.id);
  }

  const categoryIds = new Map();
  for (const [slug, name] of Object.entries(categoryLabels)) {
    const [category] = await Category.findOrCreate({ where: { slug }, defaults: { slug, name } });
    categoryIds.set(slug, category.id);
  }

  let inserted = 0;
  for (const [index, source] of catalog.produk.entries()) {
    const categoryId = categoryIds.get(source.kategori);
    if (!categoryId) continue;
    const host = new URL(source.url ?? source.url_sumber).hostname;
    const supplierId = supplierIds.get(host) ?? null;

    await sequelize.transaction(async (transaction) => {
      const [product, created] = await Product.findOrCreate({
        where: { sku: source.id },
        defaults: productDefaults(source, categoryId, supplierId, index),
        transaction,
      });

      if (created) {
        inserted += 1;
        if (product.image_url) await ProductImage.create({ product_id: product.id, url: product.image_url, sort_order: 0 }, { transaction });
        const history = demoHistory(index, product.warehouse_stock);
        await StockMovement.create({
          product_id: product.id,
          user_id: admin.id,
          movement_type: 'ADJUSTMENT',
          quantity: history.opening,
          stock_before: 0,
          stock_after: history.opening,
          reason: 'STOCK_COUNT',
          unit_cost: product.purchase_price,
          currency: product.currency,
          note: 'Stok awal simulasi untuk demo UAS.',
          createdAt: history.openedAt,
        }, { transaction });

        let balance = history.opening;
        for (const [eventIndex, event] of history.events.entries()) {
          const before = balance;
          balance += event.type === 'IN' ? event.quantity : -event.quantity;
          await StockMovement.create({
            product_id: product.id,
            user_id: (staffUser && eventIndex % 2 === 0) ? staffUser.id : admin.id,
            movement_type: event.type,
            reason: event.reason,
            quantity: event.quantity,
            stock_before: before,
            stock_after: balance,
            unit_cost: product.purchase_price,
            unit_price: event.reason === 'SALE' ? product.selling_price : null,
            currency: product.currency,
            note: event.note,
            createdAt: event.at,
          }, { transaction });
        }
        // Keep the product balance equal to the last movement.
        if (balance !== product.warehouse_stock) await product.update({ warehouse_stock: balance }, { transaction });
      } else {
        // Re-seeding fills missing values only; anything an admin already entered is kept.
        const defaults = productDefaults(source, categoryId, supplierId, index);
        const pricesWereEmpty = product.purchase_price == null;
        await product.update({
          supplier_id: product.supplier_id ?? defaults.supplier_id,
          purchase_price: product.purchase_price ?? defaults.purchase_price,
          selling_price: product.selling_price ?? defaults.selling_price,
          // Old demo codes (A-01) move to the rack format; a location typed by an admin is kept.
          storage_location: !product.storage_location || /^A-\d{2}$/.test(product.storage_location) ? defaults.storage_location : product.storage_location,
        }, { transaction });
        // A database from before prices existed: give its unpriced demo history the
        // simulated prices too, so the profit and loss card is not empty after upgrading.
        if (pricesWereEmpty && product.purchase_price != null) {
          await sequelize.query(`
            UPDATE stock_movements
            SET unit_cost = :cost,
                unit_price = CASE WHEN reason IN ('SALE', 'RETURN_IN') THEN :price ELSE NULL END,
                currency = :currency
            WHERE product_id = :productId AND unit_cost IS NULL
          `, {
            replacements: { cost: product.purchase_price, price: product.selling_price, currency: product.currency, productId: product.id },
            transaction,
          });
        }
      }
    });
  }

  console.log(`Seed selesai: ${inserted} produk baru, ${catalog.produk.length} produk pada katalog sumber.`);
}

try {
  await seed({ fresh: process.argv.includes('--fresh') });
} catch (error) {
  console.error('Seed gagal:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
