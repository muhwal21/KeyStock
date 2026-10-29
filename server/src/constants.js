// Allowed reasons per stock movement type. Shared by validation, the stock service,
// and the finance summary.
export const MOVEMENT_REASONS = {
  IN: ['PURCHASE', 'RETURN_IN'],
  OUT: ['SALE', 'DAMAGED', 'LOST', 'RETURN_OUT'],
  ADJUSTMENT: ['STOCK_COUNT'],
};

export const ALL_REASONS = [...new Set(Object.values(MOVEMENT_REASONS).flat())];

export const ADMIN_ROLES = ['admin', 'dosen'];

export function hasAdminAccess(role) {
  return ADMIN_ROLES.includes(role);
}
