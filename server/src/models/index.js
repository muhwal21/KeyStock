import { Sequelize, DataTypes } from 'sequelize';
import { config } from '../config.js';

export const sequelize = new Sequelize(config.database.name, config.database.user, config.database.password, {
  host: config.database.host,
  port: config.database.port,
  dialect: 'mysql',
  logging: false,
  define: { underscored: true, timestamps: true },
  dialectOptions: { charset: 'utf8mb4' },
  pool: { max: 8, min: 0, acquire: 30000, idle: 10000 },
});

export const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  username: { type: DataTypes.STRING(40), allowNull: true, unique: true },
  email: { type: DataTypes.STRING(190), allowNull: false, unique: true, validate: { isEmail: true } },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'staff'), allowNull: false, defaultValue: 'staff' },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'users', defaultScope: { attributes: { exclude: ['password_hash'] } }, scopes: { withPassword: { attributes: {} } } });

export const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
}, { tableName: 'categories', timestamps: false });

export const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  contact_person: { type: DataTypes.STRING(120), allowNull: true },
  phone: { type: DataTypes.STRING(40), allowNull: true },
  email: { type: DataTypes.STRING(190), allowNull: true, validate: { isEmail: true } },
  city: { type: DataTypes.STRING(100), allowNull: true },
  website: { type: DataTypes.STRING(500), allowNull: true },
  notes: { type: DataTypes.STRING(500), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'suppliers', indexes: [{ fields: ['name'] }, { fields: ['is_active'] }] });

export const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  sku: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(190), allowNull: false },
  brand: { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  price_min: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  price_max: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  purchase_price: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  selling_price: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'IDR' },
  listing_status: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Ready' },
  warehouse_stock: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  reorder_point: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 5 },
  storage_location: { type: DataTypes.STRING(80), allowNull: true },
  supplier_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  source_url: { type: DataTypes.STRING(500), allowNull: true },
  image_url: { type: DataTypes.STRING(1000), allowNull: true },
  specifications: { type: DataTypes.JSON, allowNull: false },
  variants: { type: DataTypes.JSON, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'products', indexes: [{ fields: ['category_id'] }, { fields: ['name'] }, { fields: ['warehouse_stock'] }] });

export const StockMovement = sequelize.define('StockMovement', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  movement_type: { type: DataTypes.ENUM('IN', 'OUT', 'ADJUSTMENT'), allowNull: false },
  quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  stock_before: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  stock_after: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  reason: { type: DataTypes.ENUM('PURCHASE', 'RETURN_IN', 'SALE', 'DAMAGED', 'LOST', 'RETURN_OUT', 'STOCK_COUNT'), allowNull: false, defaultValue: 'STOCK_COUNT' },
  unit_cost: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  unit_price: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'IDR' },
  note: { type: DataTypes.STRING(500), allowNull: true },
}, { tableName: 'stock_movements', updatedAt: false, indexes: [{ fields: ['product_id', 'created_at'] }, { fields: ['user_id', 'created_at'] }] });

// Product photos for the gallery. Uploaded files are stored in MySQL (LONGBLOB) so they
// survive redeploys on hosts with an ephemeral disk; seeded photos only keep a URL.
export const ProductImage = sequelize.define('ProductImage', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  url: { type: DataTypes.STRING(1000), allowNull: true },
  data: { type: DataTypes.BLOB('long'), allowNull: true },
  mime_type: { type: DataTypes.STRING(40), allowNull: true },
  byte_size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'product_images',
  updatedAt: false,
  indexes: [{ fields: ['product_id', 'sort_order'] }],
  defaultScope: { attributes: { exclude: ['data'] } },
});

Category.hasMany(Product, { foreignKey: 'category_id', as: 'products', onDelete: 'RESTRICT' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Supplier.hasMany(Product, { foreignKey: 'supplier_id', as: 'products', onDelete: 'SET NULL' });
Product.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier', onDelete: 'SET NULL' });
Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'movements', onDelete: 'RESTRICT' });
StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
User.hasMany(StockMovement, { foreignKey: 'user_id', as: 'movements', onDelete: 'RESTRICT' });
StockMovement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { DataTypes };
