// Profit and loss from stock movements. Each movement stores the purchase cost and
// selling price that were valid at that moment, so old reports do not change when a
// product price is edited later.
export function summarizeMovements(movements) {
  const summary = {
    revenue: 0, // pendapatan penjualan
    cogs: 0, // harga pokok penjualan (HPP)
    grossProfit: 0,
    stockLoss: 0, // nilai modal barang rusak / hilang
    netProfit: 0,
    purchases: 0, // pengeluaran pembelian stok
    unitsSold: 0,
    unpricedSales: 0, // penjualan tanpa harga beli/jual tercatat
  };

  for (const movement of movements) {
    const quantity = Number(movement.quantity);
    const cost = movement.unit_cost == null ? null : Number(movement.unit_cost);
    const price = movement.unit_price == null ? null : Number(movement.unit_price);

    if (movement.reason === 'SALE' || movement.reason === 'RETURN_IN') {
      const sign = movement.reason === 'SALE' ? 1 : -1;
      if (movement.reason === 'SALE') summary.unitsSold += quantity;
      if (price == null || cost == null) {
        if (movement.reason === 'SALE') summary.unpricedSales += 1;
        continue;
      }
      summary.revenue += sign * quantity * price;
      summary.cogs += sign * quantity * cost;
    }
    if ((movement.reason === 'DAMAGED' || movement.reason === 'LOST') && cost != null) {
      summary.stockLoss += quantity * cost;
    }
    if (movement.reason === 'PURCHASE' && cost != null) {
      summary.purchases += quantity * cost;
    }
  }

  summary.grossProfit = summary.revenue - summary.cogs;
  summary.netProfit = summary.grossProfit - summary.stockLoss;
  return summary;
}
