import { Op, literal } from 'sequelize';
import { Category, Product, ProductImage, StockMovement, Supplier, User } from '../models/index.js';
import { serializeImage } from './productImageController.js';
import { summarizeMovements } from '../services/financeService.js';

const productIncludes = [
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
  { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'contact_person', 'phone', 'email', 'city', 'website'] },
];

export async function listProducts(req, res, next) {
  try {
    const where = { is_active: true };
    const search = req.query.search?.trim();
    const categoryId = Number(req.query.categoryId);

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
      ];
    }
    if (Number.isInteger(categoryId) && categoryId > 0) where.category_id = categoryId;
    if (req.query.lowStock === 'true') where[Op.and] = [literal('warehouse_stock <= reorder_point')];

    const products = await Product.findAll({ where, include: productIncludes, order: [['name', 'ASC']] });
    return res.json({ products });
  } catch (error) {
    return next(error);
  }
}

export async function listCategories(req, res, next) {
  try {
    const categories = await Category.findAll({
      attributes: ['id', 'slug', 'name'],
      order: [['name', 'ASC']],
    });
    const counts = await Promise.all(categories.map(async (category) => ({
      ...category.toJSON(),
      product_count: await Product.count({ where: { category_id: category.id, is_active: true } }),
    })));
    return res.json({ categories: counts });
  } catch (error) {
    return next(error);
  }
}

// One active product per rack slot, so the rack map never shows two boxes in one place.
async function slotTakenBy(location, exceptId = null) {
  if (!location) return null;
  const where = { storage_location: location, is_active: true };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  return Product.findOne({ where, attributes: ['id', 'name'] });
}

function slotConflict(res, product) {
  return res.status(409).json({
    message: 'Lokasi rak sudah dipakai produk lain.',
    errors: [{ field: 'storage_location', message: `Slot ini sudah dipakai ${product.name}.` }],
  });
}

export async function createProduct(req, res, next) {
  try {
    const occupant = await slotTakenBy(req.body.storage_location);
    if (occupant) return slotConflict(res, occupant);
    const product = await Product.create({ ...req.body, warehouse_stock: 0 });
    const saved = await Product.findByPk(product.id, { include: productIncludes });
    return res.status(201).json({ product: saved });
  } catch (error) {
    return next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findByPk(Number(req.params.id));
    if (!product || !product.is_active) return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    const occupant = await slotTakenBy(req.body.storage_location, product.id);
    if (occupant) return slotConflict(res, occupant);
    await product.update(req.body);
    const saved = await Product.findByPk(product.id, { include: productIncludes });
    return res.json({ product: saved });
  } catch (error) {
    return next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByPk(Number(req.params.id));
    if (!product || !product.is_active) return res.status(404).json({ message: 'Produk tidak ditemukan.' });
    await product.update({ is_active: false });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

// Detail for the product dialog: relations, ordered photos, and the latest movements.
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findByPk(Number(req.params.id), {
      include: [
        ...productIncludes,
        { model: ProductImage, as: 'images' },
      ],
      order: [[{ model: ProductImage, as: 'images' }, 'sort_order', 'ASC'], [{ model: ProductImage, as: 'images' }, 'id', 'ASC']],
    });
    if (!product || !product.is_active) return res.status(404).json({ message: 'Produk tidak ditemukan.' });

    const movements = await StockMovement.findAll({
      where: { product_id: product.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: 8,
    });
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const recent = await StockMovement.findAll({
      attributes: ['reason', 'quantity', 'unit_cost', 'unit_price'],
      where: { product_id: product.id, createdAt: { [Op.gte]: since } },
    });
    const data = product.toJSON();
    data.images = product.images.map(serializeImage);
    return res.json({ product: data, movements, stats: { ...summarizeMovements(recent), days: 30 } });
  } catch (error) {
    return next(error);
  }
}
