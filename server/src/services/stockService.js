import { sequelize, Product, StockMovement } from '../models/index.js';

export class StockError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function recordMovement({ productId, userId, type, reason, quantity, note }) {
  return sequelize.transaction(async (transaction) => {
    const product = await Product.findByPk(productId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!product || !product.is_active) throw new StockError('Produk tidak ditemukan.', 404);

    const stockBefore = product.warehouse_stock;
    let stockAfter = stockBefore;
    if (type === 'IN') stockAfter += quantity;
    if (type === 'OUT') {
      if (quantity > stockBefore) throw new StockError('Stok keluar melebihi stok yang tersedia.');
      stockAfter -= quantity;
    }
    if (type === 'ADJUSTMENT') {
      stockAfter = quantity;
      if (stockAfter === stockBefore) throw new StockError('Jumlah penyesuaian sama dengan stok saat ini.');
    }

    product.warehouse_stock = stockAfter;
    await product.save({ transaction });

    // Snapshot of the prices at this moment, used later for profit and loss reports.
    const sellsAtPrice = reason === 'SALE' || reason === 'RETURN_IN';
    const movement = await StockMovement.create({
      product_id: product.id,
      user_id: userId,
      movement_type: type,
      reason,
      quantity: Math.abs(stockAfter - stockBefore),
      stock_before: stockBefore,
      stock_after: stockAfter,
      unit_cost: product.purchase_price,
      unit_price: sellsAtPrice ? product.selling_price : null,
      currency: product.currency,
      note: note || null,
    }, { transaction });

    return { movement, product };
  });
}
