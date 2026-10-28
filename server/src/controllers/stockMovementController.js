import { Category, Product, StockMovement, User } from '../models/index.js';
import { recordMovement, StockError } from '../services/stockService.js';

export async function listMovements(req, res, next) {
  try {
    // Eager loading (like Eloquent's with('product.category', 'user')) avoids one query per row.
    const movements = await StockMovement.findAll({
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'sku', 'brand', 'storage_location', 'image_url', 'currency'],
          include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
        },
        { model: User, as: 'user', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 200,
    });
    return res.json({ movements });
  } catch (error) {
    return next(error);
  }
}

export async function createMovement(req, res, next) {
  try {
    const result = await recordMovement({
      productId: req.body.product_id,
      userId: req.user.id,
      type: req.body.movement_type,
      reason: req.body.reason,
      quantity: req.body.quantity,
      note: req.body.note,
    });
    const movement = await StockMovement.findByPk(result.movement.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'brand'] },
        { model: User, as: 'user', attributes: ['id', 'name'] },
      ],
    });
    return res.status(201).json({ movement, product: result.product });
  } catch (error) {
    if (error instanceof StockError) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
}
