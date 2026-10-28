import { Op, literal } from 'sequelize';
import { Category, Product, StockMovement, Supplier, User } from '../models/index.js';
import { summarizeMovements } from '../services/financeService.js';

const ACTIVITY_DAYS = 30;

function dayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function getDashboard(req, res, next) {
  try {
    const activityStart = new Date();
    activityStart.setHours(0, 0, 0, 0);
    activityStart.setDate(activityStart.getDate() - (ACTIVITY_DAYS - 1));
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);

    const [activeProducts, stockRows, lowStockProducts, categories, recentMovements, activeSuppliers, activityRows] = await Promise.all([
      Product.count({ where: { is_active: true } }),
      Product.findAll({ attributes: ['warehouse_stock', 'reorder_point', 'purchase_price', 'selling_price', 'currency'], where: { is_active: true } }),
      Product.findAll({
        where: { is_active: true, [Op.and]: [literal('warehouse_stock > 0 AND warehouse_stock <= reorder_point')] },
        include: [
          { model: Category, as: 'category', attributes: ['name'] },
          { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'phone'] },
        ],
        order: [['warehouse_stock', 'ASC'], ['name', 'ASC']],
        limit: 6,
      }),
      Category.findAll({ attributes: ['id', 'name', 'slug'], order: [['name', 'ASC']] }),
      StockMovement.findAll({
        include: [
          { model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'brand'] },
          { model: User, as: 'user', attributes: ['id', 'name'] },
        ],
        order: [['created_at', 'DESC']],
        limit: 6,
      }),
      Supplier.count({ where: { is_active: true } }),
      StockMovement.findAll({
        attributes: ['movement_type', 'reason', 'quantity', 'stock_before', 'stock_after', 'unit_cost', 'unit_price', 'currency', 'createdAt'],
        where: { createdAt: { [Op.gte]: activityStart } },
        order: [['createdAt', 'ASC']],
      }),
    ]);

    const levels = stockRows.map((product) => product.warehouse_stock);
    const totalStock = levels.reduce((sum, value) => sum + value, 0);
    const lowStockCount = stockRows.filter((product) => product.warehouse_stock > 0 && product.warehouse_stock <= product.reorder_point).length;
    const outOfStockCount = levels.filter((value) => value === 0).length;
    const stockStats = levels.length
      ? { min: Math.min(...levels), avg: Math.round(totalStock / levels.length), max: Math.max(...levels) }
      : { min: 0, avg: 0, max: 0 };

    // Inventory value is reported in rupiah only; USD-priced items are not mixed into the IDR total.
    const pricedRows = stockRows.filter((product) => product.purchase_price != null && product.currency === 'IDR');
    const pricedPurchaseProducts = pricedRows.length;
    const inventoryCost = pricedPurchaseProducts
      ? pricedRows.reduce((sum, product) => sum + Number(product.purchase_price) * product.warehouse_stock, 0)
      : null;
    const retailRows = stockRows.filter((product) => product.selling_price != null && product.currency === 'IDR');
    const inventoryRetail = retailRows.length
      ? retailRows.reduce((sum, product) => sum + Number(product.selling_price) * product.warehouse_stock, 0)
      : null;
    // Profit and loss for the last 30 days, rupiah transactions only.
    const finance = {
      ...summarizeMovements(activityRows.filter((movement) => movement.currency === 'IDR')),
      days: ACTIVITY_DAYS,
      excludedForeignCurrency: activityRows.filter((movement) => movement.currency !== 'IDR' && movement.reason === 'SALE').length,
    };

    // One entry per day for the activity heatmap: number of transactions per type and units moved.
    const activityByDate = new Map();
    for (let offset = 0; offset < ACTIVITY_DAYS; offset += 1) {
      const date = new Date(activityStart);
      date.setDate(date.getDate() + offset);
      const key = dayKey(date);
      activityByDate.set(key, { date: key, in: 0, out: 0, adjustment: 0, total: 0, unitsIn: 0, unitsOut: 0 });
    }

    let weeklyNetChange = 0;
    for (const movement of activityRows) {
      const day = activityByDate.get(dayKey(movement.createdAt));
      if (!day) continue;
      const type = movement.movement_type.toLowerCase();
      day[type] += 1;
      day.total += 1;
      if (movement.movement_type === 'IN') day.unitsIn += movement.quantity;
      if (movement.movement_type === 'OUT') day.unitsOut += movement.quantity;
      if (movement.createdAt >= weekStart) weeklyNetChange += movement.stock_after - movement.stock_before;
    }

    const activity = [...activityByDate.values()];
    return res.json({
      summary: {
        activeProducts, totalStock, lowStockCount, outOfStockCount, inventoryCost,
        pricedPurchaseProducts, activeSuppliers, weeklyNetChange, stockStats, inventoryRetail,
      },
      finance,
      categories,
      lowStockProducts,
      activity,
      movementTrend: activity.slice(-7),
      recentMovements,
    });
  } catch (error) {
    return next(error);
  }
}
