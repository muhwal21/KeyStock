// Formatting and small business helpers shared by App.vue and the components.

export function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value ?? 0));
}

export function formatMoney(value, currency = 'IDR', emptyText = 'Belum diisi') {
  if (value == null || value === '') return emptyText;
  const code = currency || 'IDR';
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: code, maximumFractionDigits: code === 'IDR' ? 0 : 2,
    }).format(Number(value));
  } catch {
    return `${code} ${formatNumber(value)}`;
  }
}

// Signed amount for profit/loss figures, e.g. "+Rp 300.000" or "−Rp 974.000".
export function formatSignedMoney(value, currency = 'IDR') {
  const amount = Number(value ?? 0);
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : '';
  return `${sign}${formatMoney(Math.abs(amount), currency, '—')}`;
}

export function formatPercent(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value)}%`;
}

export function formatDate(date) {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(parsed);
}

export function stockState(product) {
  if (Number(product.warehouse_stock) === 0) return { label: 'Habis', tone: 'empty' };
  if (Number(product.warehouse_stock) <= Number(product.reorder_point)) return { label: 'Perlu restock', tone: 'low' };
  return { label: 'Tersedia', tone: 'good' };
}

// Unit profit and margin (profit as a share of the selling price), plus stock totals.
export function pricing(product) {
  const cost = product.purchase_price == null ? null : Number(product.purchase_price);
  const price = product.selling_price == null ? null : Number(product.selling_price);
  const stock = Number(product.warehouse_stock ?? 0);
  const unitProfit = cost != null && price != null ? price - cost : null;
  return {
    cost,
    price,
    unitProfit,
    margin: unitProfit != null && price > 0 ? (unitProfit / price) * 100 : null,
    stockCost: cost != null ? cost * stock : null,
    stockRetail: price != null ? price * stock : null,
    potentialProfit: unitProfit != null ? unitProfit * stock : null,
  };
}

export const REASONS = {
  PURCHASE: { label: 'Pembelian', type: 'IN' },
  RETURN_IN: { label: 'Retur pelanggan', type: 'IN' },
  SALE: { label: 'Penjualan', type: 'OUT' },
  DAMAGED: { label: 'Rusak', type: 'OUT' },
  LOST: { label: 'Hilang', type: 'OUT' },
  RETURN_OUT: { label: 'Retur ke supplier', type: 'OUT' },
  STOCK_COUNT: { label: 'Stock opname', type: 'ADJUSTMENT' },
};

export function reasonsFor(type) {
  return Object.entries(REASONS).filter(([, reason]) => reason.type === type).map(([id, reason]) => ({ id, ...reason }));
}

export function reasonLabel(reason) {
  return REASONS[reason]?.label ?? reason ?? '—';
}

// Money effect of a stock movement, following server/src/services/financeService.js.
// `unitCost`/`unitPrice` are the prices used (the snapshot for saved rows, current prices
// for the preview in the form). `amount` is signed from the business' point of view:
// sales are income, refunds and damaged or lost stock are losses, purchases are spending.
const VALUE_KINDS = {
  SALE: { label: 'Pendapatan', unit: 'price', sign: 1, tone: 'positive' },
  RETURN_IN: { label: 'Refund pelanggan', unit: 'price', sign: -1, tone: 'negative' },
  PURCHASE: { label: 'Belanja stok', unit: 'cost', sign: 1, tone: 'neutral' },
  RETURN_OUT: { label: 'Retur ke supplier', unit: 'cost', sign: 1, tone: 'neutral' },
  DAMAGED: { label: 'Kerugian stok', unit: 'cost', sign: -1, tone: 'negative' },
  LOST: { label: 'Kerugian stok', unit: 'cost', sign: -1, tone: 'negative' },
  STOCK_COUNT: { label: 'Selisih opname', unit: 'cost', sign: 1, tone: 'signed' },
};

export function movementValue({ reason, quantity, unitCost, unitPrice, stockBefore, stockAfter }) {
  const kind = VALUE_KINDS[reason];
  if (!kind) return null;
  const unit = kind.unit === 'price' ? unitPrice : unitCost;
  if (unit == null || unit === '') return null;
  const units = reason === 'STOCK_COUNT' ? Number(stockAfter) - Number(stockBefore) : Number(quantity);
  if (!Number.isFinite(units)) return null;
  const amount = units * Number(unit) * kind.sign;
  const tone = kind.tone === 'signed' ? (amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'neutral') : kind.tone;
  const profit = reason === 'SALE' && unitCost != null ? units * (Number(unitPrice) - Number(unitCost)) : null;
  return { label: kind.label, amount, tone, profit, signed: kind.tone !== 'neutral' };
}

// Value of a saved movement row (uses the price snapshot taken when it was recorded).
export function recordedValue(movement) {
  return movementValue({
    reason: movement.reason,
    quantity: movement.quantity,
    unitCost: movement.unit_cost,
    unitPrice: movement.unit_price,
    stockBefore: movement.stock_before,
    stockAfter: movement.stock_after,
  });
}

export function formatValue(value, currency = 'IDR') {
  if (!value) return '—';
  return value.signed ? formatSignedMoney(value.amount, currency) : formatMoney(value.amount, currency, '—');
}

// Indonesian numbers: "0812-3456-7890" or "+62 812..." → "https://wa.me/6281234567890".
export function whatsappUrl(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  return digits.length >= 9 ? `https://wa.me/${digits}` : null;
}

export function telUrl(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : null;
}

export const PLACEHOLDER_IMAGE = '/keyboard-placeholder.svg';

export function onImageError(event) {
  if (!event.target.src.endsWith(PLACEHOLDER_IMAGE)) event.target.src = PLACEHOLDER_IMAGE;
}

// "A-1-05" → "Rak A · Tingkat 1 · Slot 05"; other values are shown as typed.
export function parseLocation(code) {
  const match = /^([A-Z])-(\d{1,2})-(\d{1,2})$/.exec(code ?? '');
  if (!match) return null;
  return { rack: match[1], level: Number(match[2]), slot: Number(match[3]), slotLabel: match[3].padStart(2, '0') };
}

export function describeLocation(code) {
  const location = parseLocation(code);
  if (!location) return code || 'Belum ditentukan';
  return `Rak ${location.rack} · Tingkat ${location.level} · Slot ${location.slotLabel}`;
}
