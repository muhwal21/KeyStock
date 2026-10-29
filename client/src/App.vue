<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue';
import {
  AlertTriangle, ArrowDownToLine, ArrowDownUp, ArrowRight, ArrowUpFromLine, ArrowUpRight, AtSign,
  Boxes, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, Eye,
  EyeOff, History, Keyboard, LayoutDashboard, Lock, LogIn, LogOut, Mail, MapPin, MessageCircle,
  Moon, Package, PackageX, Phone, Plus, Search, Settings, ShieldCheck, Sun,
  TrendingDown, TrendingUp, Truck, User, UserCheck, UserPlus, UserX, Users, Wallet, X,
} from '@lucide/vue';
import { get, patch, post, put, remove, setCsrfToken } from './api.js';
import ActivityHeatmap from './components/ActivityHeatmap.vue';
import PageSkeleton from './components/PageSkeleton.vue';
import ProductDetailModal from './components/ProductDetailModal.vue';
import RackMap from './components/RackMap.vue';
import {
  formatDate, formatMoney, formatNumber, formatPercent, formatSignedMoney, formatValue, movementValue,
  onImageError, pricing, reasonLabel, reasonsFor, recordedValue, stockState, telUrl, whatsappUrl,
} from './utils/format.js';

const user = ref(null);
function readThemePreference() {
  try {
    const saved = localStorage.getItem('keystock-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Browser storage can be blocked; fall back to the system preference below.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const themeMode = ref(readThemePreference());
document.documentElement.dataset.theme = themeMode.value;

function setTheme(mode) {
  themeMode.value = mode;
  document.documentElement.dataset.theme = mode;
  try {
    localStorage.setItem('keystock-theme', mode);
  } catch {
    // Theme still applies for this page even if browser storage is unavailable.
  }
}

function toggleTheme() {
  setTheme(themeMode.value === 'dark' ? 'light' : 'dark');
}

const checkingSession = ref(true);
const apiUnavailable = ref(false);
const passwordRecoveryAvailable = ref(false);
const PAGE_STORAGE_KEY = 'keystock-active-page';
const PAGE_IDS = new Set(['overview', 'products', 'suppliers', 'movements', 'users']);

function readActivePage() {
  try {
    const page = window.sessionStorage.getItem(PAGE_STORAGE_KEY);
    return PAGE_IDS.has(page) ? page : 'overview';
  } catch {
    return 'overview';
  }
}

function saveActivePage(page) {
  try {
    window.sessionStorage.setItem(PAGE_STORAGE_KEY, page);
  } catch {
    // The current page still works if browser storage is unavailable.
  }
}

const activePage = ref(readActivePage());
const loading = ref(false);
const busy = ref(false);
const syncStatus = ref('online');
const updateAvailable = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const csrfToken = ref('');
const dashboard = ref({ summary: {}, categories: [], lowStockProducts: [], activity: [], movementTrend: [], recentMovements: [] });
// Overview widgets
const heatmapDays = ref(14);
const overviewProductId = ref('');
const activityFilter = ref('');
const activityPage = ref(1);
const ACTIVITY_PAGE_SIZE = 8;
const products = ref([]); // rows shown in the product table (may be filtered)
const catalog = ref([]); // every active product, used by dropdowns and counts
const categories = ref([]);
const suppliers = ref([]);
const movements = ref([]);
const users = ref([]);
const searchQuery = ref('');
const selectedCategory = ref('');
const selectedSupplier = ref('');
const stockFilter = ref('all');
const movementSearch = ref('');
const movementTypeFilter = ref('');
const productModalOpen = ref(false);
const supplierModalOpen = ref(false);
const movementModalOpen = ref(false);
const pendingConfirmation = ref(null);
const editingProduct = ref(null);
const editingSupplier = ref(null);
// Product detail dialog: id of the open product, and the product to reopen after an edit.
const detailProductId = ref(null);
const detailBusy = ref(false);
const detailReturnId = ref(null);
// Validation feedback shown inside the open dialog (page notices sit behind the backdrop).
const formError = ref('');
const fieldErrors = ref({});

const resetToken = ref(new URLSearchParams(window.location.search).get('resetToken') ?? '');
const authMode = ref(resetToken.value ? 'reset' : 'login');
const registrationSubmitted = ref(false);
const showPassword = ref(false);
const loginForm = reactive({ identifier: '', password: '', rememberMe: false });
const registerForm = reactive({ name: '', username: '', email: '', password: '', password_confirmation: '' });
const forgotForm = reactive({ email: '' });
const resetForm = reactive({ password: '', password_confirmation: '' });
const hasUnsavedChanges = computed(() => {
  if (busy.value || loading.value || productModalOpen.value || supplierModalOpen.value || movementModalOpen.value
    || pendingConfirmation.value || detailBusy.value) return true;
  if (user.value) return false;
  if (authMode.value === 'register') return Object.values(registerForm).some(Boolean);
  if (authMode.value === 'forgot') return Boolean(forgotForm.email);
  if (authMode.value === 'reset') return Boolean(resetForm.password || resetForm.password_confirmation);
  return Boolean(loginForm.identifier || loginForm.password);
});
const productForm = reactive({
  sku: '', name: '', brand: '', category_id: '', supplier_id: '', description: '',
  price_min: '', price_max: '', purchase_price: '', selling_price: '', currency: 'IDR',
  listing_status: 'Ready', reorder_point: 10, storage_location: '', source_url: '',
  specifications: {}, variants: [], is_active: true,
});
const supplierForm = reactive({
  name: '', contact_person: '', phone: '', email: '', city: '', website: '', notes: '', is_active: true,
});
const movementForm = reactive({ product_id: '', movement_type: 'IN', reason: 'PURCHASE', quantity: '', note: '' });
let dataSyncTimer = null;
let versionCheckTimer = null;
let versionReloadTimer = null;
let autoSyncInProgress = false;

const pageTitle = computed(() => ({
  overview: 'Ringkasan stok',
  products: 'Produk',
  suppliers: 'Supplier',
  movements: 'Pergerakan stok',
  users: 'Pengguna',
}[activePage.value]));

const baseNavItems = [
  { id: 'overview', label: 'Ringkasan', short: 'Ringkasan', icon: LayoutDashboard },
  { id: 'products', label: 'Produk', short: 'Produk', icon: Package },
  { id: 'suppliers', label: 'Supplier', short: 'Supplier', icon: Truck },
  { id: 'movements', label: 'Pergerakan stok', short: 'Stok', icon: ArrowDownUp },
];
// Admin and Dosen share administrative permissions; the API enforces the same rule.
const isAdmin = computed(() => ['admin', 'dosen'].includes(user.value?.role));
const navItems = computed(() => (isAdmin.value
  ? [...baseNavItems, { id: 'users', label: 'Pengguna', short: 'Pengguna', icon: Users }]
  : baseNavItems));

const roleRules = [
  { action: 'Melihat ringkasan, laba rugi, produk, supplier, dan riwayat stok', admin: true, dosen: true, staff: true },
  { action: 'Mencatat stok masuk, stok keluar, dan penyesuaian beserta alasannya', admin: true, dosen: true, staff: true },
  { action: 'Menambah, mengubah, dan mengarsipkan produk (harga dan lokasi rak)', admin: true, dosen: true, staff: false },
  { action: 'Mengunggah, mengurutkan, dan menghapus foto produk', admin: true, dosen: true, staff: false },
  { action: 'Menambah, mengubah, dan mengarsipkan supplier', admin: true, dosen: true, staff: false },
  { action: 'Mengubah peran, menyetujui, dan menonaktifkan pengguna', admin: true, dosen: true, staff: false },
];

watchEffect(() => {
  document.title = user.value ? `${pageTitle.value} · KeyStock` : 'KeyStock — Mechanical Keyboard Inventory';
});

const today = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date());
const filteredProducts = computed(() => products.value.filter((product) => (
  !selectedSupplier.value || String(product.supplier_id) === selectedSupplier.value
)));
const productStats = computed(() => {
  const rows = filteredProducts.value;
  return {
    sku: rows.length,
    units: rows.reduce((sum, product) => sum + Number(product.warehouse_stock || 0), 0),
    lowStock: rows.filter((product) => Number(product.warehouse_stock) > 0 && Number(product.warehouse_stock) <= Number(product.reorder_point)).length,
    supplied: rows.filter((product) => product.supplier_id).length,
  };
});

const selectedMovementProduct = computed(() => (
  catalog.value.find((product) => String(product.id) === String(movementForm.product_id)) ?? null
));

// Preview of the balance after saving, mirroring the rules in server/src/services/stockService.js.
const movementPreview = computed(() => {
  const product = selectedMovementProduct.value;
  if (!product || movementForm.quantity === '' || movementForm.quantity == null) return null;
  const quantity = Number(movementForm.quantity);
  if (!Number.isInteger(quantity) || quantity < 0) return null;
  const before = Number(product.warehouse_stock);
  const after = {
    IN: before + quantity,
    OUT: before - quantity,
    ADJUSTMENT: quantity,
  }[movementForm.movement_type];
  const value = movementValue({
    reason: movementForm.reason,
    quantity,
    unitCost: product.purchase_price,
    unitPrice: product.selling_price,
    stockBefore: before,
    stockAfter: after,
  });
  return { before, after, invalid: after < 0, value };
});

// Rupiah profit and loss for the overview card (last 30 days, from the dashboard API).
const finance = computed(() => {
  const data = dashboard.value.finance ?? {};
  const revenue = Number(data.revenue ?? 0);
  const cogs = Number(data.cogs ?? 0);
  const grossProfit = Number(data.grossProfit ?? 0);
  const summary = dashboard.value.summary ?? {};
  const potential = summary.inventoryCost != null && summary.inventoryRetail != null
    ? Number(summary.inventoryRetail) - Number(summary.inventoryCost)
    : null;
  return {
    ...data,
    revenue,
    cogs,
    grossProfit,
    stockLoss: Number(data.stockLoss ?? 0),
    netProfit: Number(data.netProfit ?? 0),
    purchases: Number(data.purchases ?? 0),
    unitsSold: Number(data.unitsSold ?? 0),
    grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : null,
    cogsShare: revenue > 0 ? Math.min(100, Math.max(0, (cogs / revenue) * 100)) : 0,
    potential,
  };
});

function setMovementType(type) {
  movementForm.movement_type = type;
  movementForm.reason = reasonsFor(type)[0]?.id ?? '';
}

const filteredMovements = computed(() => {
  const term = movementSearch.value.trim().toLowerCase();
  return movements.value.filter((item) => {
    if (movementTypeFilter.value && item.movement_type !== movementTypeFilter.value) return false;
    if (!term) return true;
    return [item.product?.name, item.product?.sku, item.product?.brand, item.user?.name, item.note, reasonLabel(item.reason)]
      .some((value) => value?.toLowerCase().includes(term));
  });
});

// Live checklist under the register password field; mirrors registerSchema on the server.
const passwordChecks = computed(() => {
  const value = registerForm.password;
  return [
    { label: '9–64 karakter', ok: value.length >= 9 && value.length <= 64 },
    { label: 'Huruf besar', ok: /[A-Z]/.test(value) },
    { label: 'Huruf kecil', ok: /[a-z]/.test(value) },
    { label: 'Angka', ok: /[0-9]/.test(value) },
    { label: 'Simbol', ok: /[^A-Za-z0-9\s]/.test(value) },
    { label: 'Tanpa spasi', ok: !/\s/.test(value) },
  ];
});

const outOfStockProducts = computed(() => catalog.value
  .filter((product) => Number(product.warehouse_stock) === 0)
  .sort((a, b) => a.name.localeCompare(b.name)));
const restockProducts = computed(() => catalog.value
  .filter((product) => Number(product.warehouse_stock) > 0 && Number(product.warehouse_stock) <= Number(product.reorder_point))
  .sort((a, b) => Number(a.warehouse_stock) - Number(b.warehouse_stock) || a.name.localeCompare(b.name)));
const outOfStockCount = computed(() => Number(dashboard.value.summary?.outOfStockCount ?? outOfStockProducts.value.length));
const restockCount = computed(() => Number(dashboard.value.summary?.lowStockCount ?? restockProducts.value.length));

const activityFilters = [
  { id: '', label: 'Semua' },
  { id: 'IN', label: 'Masuk' },
  { id: 'OUT', label: 'Keluar' },
  { id: 'ADJUSTMENT', label: 'Penyesuaian' },
];

const overviewActivities = computed(() => (
  activityFilter.value ? movements.value.filter((item) => item.movement_type === activityFilter.value) : movements.value
));

const activityPageCount = computed(() => Math.max(1, Math.ceil(overviewActivities.value.length / ACTIVITY_PAGE_SIZE)));

const pagedActivities = computed(() => {
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE;
  return overviewActivities.value.slice(start, start + ACTIVITY_PAGE_SIZE);
});

const activityRange = computed(() => {
  const total = overviewActivities.value.length;
  if (!total) return '0 dari 0';
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE + 1;
  return `${start}–${Math.min(total, start + ACTIVITY_PAGE_SIZE - 1)} dari ${total}`;
});

function setActivityFilter(id) {
  activityFilter.value = id;
  activityPage.value = 1;
}

// Keep the selected rack product pointed at a real product for its detail highlight.
function ensureOverviewProduct() {
  const exists = catalog.value.some((product) => String(product.id) === String(overviewProductId.value));
  if (exists) return;
  const first = dashboard.value.lowStockProducts?.[0] ?? catalog.value[0];
  overviewProductId.value = first ? String(first.id) : '';
}

function openProductDetail(productOrId) {
  const id = typeof productOrId === 'object' ? productOrId?.id : productOrId;
  if (!id) return;
  detailProductId.value = id;
}

function closeProductDetail() {
  detailProductId.value = null;
  detailBusy.value = false;
}

function editFromDetail(product) {
  detailReturnId.value = product.id;
  closeProductDetail();
  openEditProduct(product);
}

function recordFromDetail(product) {
  closeProductDetail();
  openMovement(product);
}

function setDetailBusy(value) {
  detailBusy.value = value;
}

function focusProductSearch() {
  navigate('products').then(() => nextTick(() => document.querySelector('.table-toolbar input[type="search"]')?.focus()));
}

function movementCode(item) {
  return `#MV-${String(item.id).padStart(4, '0')}`;
}

// Export the active catalog as CSV. Cells that start with = + - @ are prefixed with a
// quote so spreadsheet apps do not run them as formulas (CSV injection).
function exportInventoryCsv() {
  const header = [
    'SKU', 'Nama produk', 'Brand', 'Kategori', 'Supplier', 'Lokasi rak', 'Stok', 'Batas minimum', 'Kondisi',
    'Harga beli', 'Harga jual', 'Laba per unit', 'Margin (%)', 'Nilai stok (modal)', 'Nilai stok (jual)', 'Mata uang',
  ];
  const rows = catalog.value.map((product) => {
    const price = pricing(product);
    const money = (value) => (value == null ? '' : Math.round(value * 100) / 100);
    return [
      product.sku, product.name, product.brand, product.category?.name ?? '', product.supplier?.name ?? '',
      product.storage_location ?? '', product.warehouse_stock, product.reorder_point, stockState(product).label,
      money(price.cost), money(price.price), money(price.unitProfit), price.margin == null ? '' : Number(price.margin.toFixed(1)),
      money(price.stockCost), money(price.stockRetail), product.currency,
    ];
  });
  // Text cells that start with = + - @ are prefixed so spreadsheets do not run them as formulas.
  const escapeCell = (value) => {
    if (typeof value === 'number') return String(value);
    let text = String(value ?? '');
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `keystock-stok-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showSuccess(`${rows.length} produk diekspor ke CSV.`);
}

function clearNotices() {
  errorMessage.value = '';
  successMessage.value = '';
}

function showSuccess(message) {
  errorMessage.value = '';
  successMessage.value = message;
  window.setTimeout(() => { successMessage.value = ''; }, 3500);
}

function handleError(error) {
  errorMessage.value = error.message || 'Terjadi kesalahan. Coba lagi.';
  successMessage.value = '';
}

function clearFormErrors() {
  formError.value = '';
  fieldErrors.value = {};
}

async function handleFormError(error) {
  formError.value = error.message || 'Data belum bisa disimpan. Coba lagi.';
  fieldErrors.value = error.fields ?? {};
  // Bring the first invalid field (or the summary notice) into view inside the dialog.
  await nextTick();
  document.querySelector('.modal-body .invalid, .modal-body .error-notice')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function toFormNumber(value) {
  return value == null || value === '' ? '' : Number(value);
}

async function refreshCsrf() {
  const response = await get('/auth/csrf');
  csrfToken.value = response.csrfToken;
  setCsrfToken(response.csrfToken);
}

async function loadAll({ clear = true, background = false } = {}) {
  if (!background) loading.value = true;
  if (clear) clearNotices();
  try {
    const supplierPath = isAdmin.value ? '/suppliers?includeArchived=true' : '/suppliers';
    const requests = [get('/dashboard'), get('/categories'), get('/products'), get(supplierPath), get('/stock-movements')];
    if (hasProductFilters()) requests.push(get(productQuery()));
    const [summary, categoryData, catalogData, supplierData, movementData, filteredData] = await Promise.all(requests);
    dashboard.value = summary;
    categories.value = categoryData.categories;
    catalog.value = catalogData.products;
    products.value = (filteredData ?? catalogData).products;
    suppliers.value = supplierData.suppliers;
    movements.value = movementData.movements;
    ensureOverviewProduct();
    if (activityPage.value > activityPageCount.value) activityPage.value = 1;
    syncStatus.value = 'online';
    return true;
  } catch (error) {
    if (background) {
      handleBackgroundSyncError(error);
    } else {
      if (error.message.includes('API belum tersambung')) apiUnavailable.value = true;
      handleError(error);
    }
    return false;
  } finally {
    if (!background) loading.value = false;
  }
}

function hasOpenWork() {
  return busy.value || loading.value || productModalOpen.value || supplierModalOpen.value || movementModalOpen.value
    || Boolean(pendingConfirmation.value) || Boolean(detailProductId.value);
}

function canSyncAutomatically() {
  return Boolean(user.value) && document.visibilityState === 'visible' && !hasOpenWork();
}

function handleBackgroundSyncError(error) {
  syncStatus.value = 'offline';
  if (error.status === 401) {
    user.value = null;
    csrfToken.value = '';
    setCsrfToken('');
  }
}

async function syncAutomatically() {
  if (!canSyncAutomatically() || autoSyncInProgress) return;
  autoSyncInProgress = true;
  try {
    const synced = await loadAll({ clear: false, background: true });
    if (!synced) return;
    if (activePage.value === 'users') {
      try {
        const data = await get('/users');
        users.value = data.users;
      } catch (error) {
        handleBackgroundSyncError(error);
      }
    }
  } finally {
    autoSyncInProgress = false;
  }
}

async function checkForNewVersion() {
  if (!import.meta.env.PROD || document.visibilityState !== 'visible' || updateAvailable.value) return;
  try {
    const response = await fetch(`/version.json?check=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const latest = await response.json();
    if (latest.version && latest.version !== __APP_BUILD_VERSION__) updateAvailable.value = true;
  } catch {
    // Keep the current page usable when the version check cannot reach the server.
  }
}

function reloadForNewVersion() {
  window.location.reload();
}

function maybeReloadForNewVersion() {
  if (!updateAvailable.value || hasUnsavedChanges.value || document.visibilityState !== 'visible') return;
  window.clearTimeout(versionReloadTimer);
  versionReloadTimer = window.setTimeout(() => {
    if (updateAvailable.value && !hasUnsavedChanges.value && document.visibilityState === 'visible') {
      window.location.reload();
    }
  }, 700);
}

function handlePageVisibility() {
  if (document.visibilityState !== 'visible') return;
  maybeReloadForNewVersion();
  void checkForNewVersion();
  void syncAutomatically();
}

watch([updateAvailable, hasUnsavedChanges], maybeReloadForNewVersion, { flush: 'post' });

function hasProductFilters() {
  return Boolean(searchQuery.value.trim() || selectedCategory.value || stockFilter.value !== 'all');
}

function productQuery() {
  const params = new URLSearchParams();
  if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim());
  if (selectedCategory.value) params.set('categoryId', selectedCategory.value);
  if (stockFilter.value === 'low') params.set('lowStock', 'true');
  if (stockFilter.value === 'out') params.set('outOfStock', 'true');
  const query = params.toString() ? `?${params}` : '';
  return `/products${query}`;
}

async function navigate(page) {
  const requestedPage = PAGE_IDS.has(page) ? page : 'overview';
  const targetPage = requestedPage === 'users' && !isAdmin.value ? 'overview' : requestedPage;
  activePage.value = targetPage;
  saveActivePage(targetPage);
  clearNotices();
  if (targetPage === 'overview') {
    await loadAll();
    return;
  }

  loading.value = true;
  try {
    if (targetPage === 'products') {
      const supplierPath = isAdmin.value ? '/suppliers?includeArchived=true' : '/suppliers';
      const [catalogData, categoryData, supplierData, filteredData] = await Promise.all([
        get('/products'), get('/categories'), get(supplierPath), hasProductFilters() ? get(productQuery()) : null,
      ]);
      catalog.value = catalogData.products;
      products.value = (filteredData ?? catalogData).products;
      categories.value = categoryData.categories;
      suppliers.value = supplierData.suppliers;
    } else if (targetPage === 'suppliers') {
      const supplierPath = isAdmin.value ? '/suppliers?includeArchived=true' : '/suppliers';
      const [supplierData, productData] = await Promise.all([get(supplierPath), get('/products')]);
      suppliers.value = supplierData.suppliers;
      catalog.value = productData.products;
    } else if (targetPage === 'users') {
      const data = await get('/users');
      users.value = data.users;
    } else {
      const data = await get('/stock-movements');
      movements.value = data.movements;
    }
  } catch (error) {
    handleError(error);
  } finally {
    loading.value = false;
  }
}

function showLowStock() {
  stockFilter.value = 'low';
  navigate('products');
}

function showOutOfStock() {
  stockFilter.value = 'out';
  navigate('products');
}

async function submitLogin() {
  busy.value = true;
  clearNotices();
  try {
    if (!csrfToken.value) await refreshCsrf();
    const result = await post('/auth/login', loginForm);
    user.value = result.user;
    csrfToken.value = result.csrfToken;
    setCsrfToken(result.csrfToken);
    apiUnavailable.value = false;
    await navigate(activePage.value);
  } catch (error) {
    handleError(error);
  } finally {
    busy.value = false;
  }
}

function switchAuthMode(mode) {
  authMode.value = mode;
  registrationSubmitted.value = false;
  showPassword.value = false;
  clearNotices();
  clearFormErrors();
}

async function submitRegister() {
  busy.value = true;
  clearNotices();
  clearFormErrors();
  try {
    if (!csrfToken.value) await refreshCsrf();
    await post('/auth/register', registerForm);
    Object.assign(registerForm, { name: '', username: '', email: '', password: '', password_confirmation: '' });
    registrationSubmitted.value = true;
    authMode.value = 'login';
    apiUnavailable.value = false;
  } catch (error) {
    errorMessage.value = error.message || 'Pendaftaran gagal. Coba lagi.';
    fieldErrors.value = error.fields ?? {};
  } finally {
    busy.value = false;
  }
}

async function submitForgotPassword() {
  busy.value = true;
  clearNotices();
  try {
    if (!csrfToken.value) await refreshCsrf();
    const result = await post('/auth/forgot-password', forgotForm);
    successMessage.value = result.message;
  } catch (error) {
    handleError(error);
  } finally {
    busy.value = false;
  }
}

async function submitPasswordReset() {
  busy.value = true;
  clearNotices();
  try {
    if (!csrfToken.value) await refreshCsrf();
    const result = await post('/auth/reset-password', { token: resetToken.value, ...resetForm });
    resetToken.value = '';
    user.value = null;
    Object.assign(resetForm, { password: '', password_confirmation: '' });
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    switchAuthMode('login');
    successMessage.value = result.message;
  } catch (error) {
    handleError(error);
  } finally {
    busy.value = false;
  }
}

async function logout() {
  busy.value = true;
  clearNotices();
  try {
    await post('/auth/logout', {});
    user.value = null;
    activePage.value = 'overview';
    saveActivePage('overview');
    csrfToken.value = '';
    setCsrfToken('');
    await refreshCsrf();
  } catch (error) {
    handleError(error);
  } finally {
    busy.value = false;
  }
}

function resetProductForm() {
  Object.assign(productForm, {
    sku: '', name: '', brand: '', category_id: categories.value[0]?.id ?? '',
    supplier_id: suppliers.value.find((supplier) => supplier.is_active)?.id ?? '', description: '',
    price_min: '', price_max: '', purchase_price: '', selling_price: '', currency: 'IDR',
    listing_status: 'Ready', reorder_point: 10, storage_location: '', source_url: '',
    specifications: {}, variants: [], is_active: true,
  });
}

function openCreateProduct() {
  clearFormErrors();
  editingProduct.value = null;
  resetProductForm();
  productModalOpen.value = true;
}

function openEditProduct(product) {
  clearFormErrors();
  editingProduct.value = product;
  Object.assign(productForm, {
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    category_id: String(product.category_id),
    supplier_id: product.supplier_id ? String(product.supplier_id) : '',
    description: product.description ?? '',
    price_min: toFormNumber(product.price_min),
    price_max: toFormNumber(product.price_max),
    purchase_price: toFormNumber(product.purchase_price),
    selling_price: toFormNumber(product.selling_price),
    currency: product.currency ?? 'IDR',
    listing_status: product.listing_status ?? 'Ready',
    reorder_point: product.reorder_point,
    storage_location: product.storage_location ?? '',
    source_url: product.source_url ?? '',
    specifications: product.specifications ?? {},
    variants: product.variants ?? [],
    is_active: product.is_active,
  });
  productModalOpen.value = true;
}

function productPayload() {
  const numeric = (value) => value === '' || value == null ? null : Number(value);
  return {
    ...productForm,
    category_id: Number(productForm.category_id),
    supplier_id: productForm.supplier_id ? Number(productForm.supplier_id) : null,
    price_min: numeric(productForm.price_min),
    price_max: numeric(productForm.price_max),
    purchase_price: numeric(productForm.purchase_price),
    selling_price: numeric(productForm.selling_price),
    reorder_point: Number(productForm.reorder_point),
  };
}

async function saveProduct() {
  busy.value = true;
  clearNotices();
  clearFormErrors();
  try {
    let reopenId = detailReturnId.value;
    if (editingProduct.value) {
      await put(`/products/${editingProduct.value.id}`, productPayload());
      showSuccess('Perubahan produk disimpan.');
    } else {
      const created = await post('/products', productPayload());
      reopenId = created.product.id;
      showSuccess('Produk baru ditambahkan. Tambahkan foto, lalu catat stok awal lewat pergerakan stok.');
    }
    productModalOpen.value = false;
    detailReturnId.value = null;
    await loadAll({ clear: false });
    activePage.value = 'products';
    if (reopenId) detailProductId.value = reopenId;
  } catch (error) {
    handleFormError(error);
  } finally {
    busy.value = false;
  }
}

function archiveProduct(product) {
  clearNotices();
  pendingConfirmation.value = {
    title: 'Arsipkan produk ini?',
    message: `${product.name} tidak akan muncul di katalog aktif. Riwayat stoknya tetap disimpan.`,
    confirmLabel: 'Arsipkan produk',
    action: async () => {
      await remove(`/products/${product.id}`);
      showSuccess('Produk diarsipkan; riwayat stok tetap tersimpan.');
      await loadAll({ clear: false });
      activePage.value = 'products';
    },
  };
}

function resetSupplierForm() {
  Object.assign(supplierForm, { name: '', contact_person: '', phone: '', email: '', city: '', website: '', notes: '', is_active: true });
}

function openCreateSupplier() {
  clearFormErrors();
  editingSupplier.value = null;
  resetSupplierForm();
  supplierModalOpen.value = true;
}

function openEditSupplier(supplier) {
  clearFormErrors();
  editingSupplier.value = supplier;
  Object.assign(supplierForm, {
    name: supplier.name,
    contact_person: supplier.contact_person ?? '',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    city: supplier.city ?? '',
    website: supplier.website ?? '',
    notes: supplier.notes ?? '',
    is_active: supplier.is_active,
  });
  supplierModalOpen.value = true;
}

async function saveSupplier() {
  busy.value = true;
  clearNotices();
  clearFormErrors();
  try {
    if (editingSupplier.value) {
      await put(`/suppliers/${editingSupplier.value.id}`, supplierForm);
      showSuccess('Informasi supplier diperbarui.');
    } else {
      await post('/suppliers', supplierForm);
      showSuccess('Supplier ditambahkan.');
    }
    supplierModalOpen.value = false;
    await loadAll({ clear: false });
    activePage.value = 'suppliers';
  } catch (error) {
    handleFormError(error);
  } finally {
    busy.value = false;
  }
}

function archiveSupplier(supplier) {
  clearNotices();
  pendingConfirmation.value = {
    title: 'Arsipkan supplier ini?',
    message: `${supplier.name} akan dinonaktifkan. Produk dan riwayat stok yang terhubung tetap disimpan.`,
    confirmLabel: 'Arsipkan supplier',
    action: async () => {
      await remove(`/suppliers/${supplier.id}`);
      showSuccess('Supplier diarsipkan; data produk tetap tersimpan.');
      await loadAll({ clear: false });
      activePage.value = 'suppliers';
    },
  };
}

async function saveUserAccess(target, changes) {
  busy.value = true;
  clearNotices();
  try {
    const result = await patch(`/users/${target.id}`, { role: target.role, is_active: target.is_active, ...changes });
    Object.assign(target, result.user);
    showSuccess(`Akses ${result.user.name} diperbarui.`);
  } catch (error) {
    handleError(error);
    const data = await get('/users').catch(() => null);
    if (data) users.value = data.users;
  } finally {
    busy.value = false;
  }
}

function changeUserRole(target, role) {
  if (role === target.role) return;
  saveUserAccess(target, { role });
}

function toggleUserActive(target) {
  if (!target.is_active) {
    saveUserAccess(target, { is_active: true });
    return;
  }
  clearNotices();
  pendingConfirmation.value = {
    title: 'Nonaktifkan pengguna ini?',
    message: `${target.name} tidak dapat masuk lagi. Riwayat stok yang dicatatnya tetap tersimpan.`,
    confirmLabel: 'Nonaktifkan',
    busyLabel: 'Menonaktifkan...',
    action: () => saveUserAccess(target, { is_active: false }),
  };
}

function reviewAccount(target, action) {
  pendingConfirmation.value = {
    title: action === 'approve' ? 'Setujui pendaftaran ini?' : 'Tolak pendaftaran ini?',
    message: action === 'approve'
      ? `${target.name} akan dapat masuk sebagai staff setelah disetujui.`
      : `Pendaftaran ${target.name} akan ditolak dan akunnya tidak dapat masuk.`,
    confirmLabel: action === 'approve' ? 'Setujui akun' : 'Tolak akun',
    busyLabel: action === 'approve' ? 'Menyetujui...' : 'Menolak...',
    action: async () => {
      busy.value = true;
      clearNotices();
      try {
        const result = await patch(`/users/${target.id}/review`, { action });
        Object.assign(target, result.user);
        showSuccess(result.emailSent
          ? `Pendaftaran ${target.name} diperbarui dan email hasil review dikirim.`
          : `Pendaftaran ${target.name} diperbarui. Silakan beri tahu pengguna secara langsung.`);
      } catch (error) {
        handleError(error);
      } finally {
        busy.value = false;
      }
    },
  };
}

function cancelPendingConfirmation() {
  if (!busy.value) pendingConfirmation.value = null;
}

async function confirmPendingAction() {
  const request = pendingConfirmation.value;
  if (!request || busy.value) return;
  busy.value = true;
  clearNotices();
  try {
    await request.action();
    pendingConfirmation.value = null;
  } catch (error) {
    pendingConfirmation.value = null;
    handleError(error);
  } finally {
    busy.value = false;
  }
}

function openMovement(product = null, type = 'IN') {
  clearFormErrors();
  Object.assign(movementForm, {
    product_id: String(product?.id ?? catalog.value[0]?.id ?? ''),
    movement_type: type, reason: reasonsFor(type)[0]?.id ?? '', quantity: '', note: '',
  });
  movementModalOpen.value = true;
}

async function saveMovement() {
  busy.value = true;
  clearNotices();
  clearFormErrors();
  try {
    const movementType = movementForm.movement_type;
    const reason = movementForm.reason;
    await post('/stock-movements', {
      product_id: Number(movementForm.product_id),
      movement_type: movementType,
      reason: movementForm.reason,
      quantity: Number(movementForm.quantity),
      note: movementForm.note,
    });
    movementModalOpen.value = false;
    showSuccess(movementType === 'ADJUSTMENT' ? 'Saldo stok berhasil disesuaikan.' : `${reasonLabel(reason)} berhasil dicatat.`);
    await loadAll({ clear: false });
    activePage.value = 'movements';
  } catch (error) {
    handleFormError(error);
  } finally {
    busy.value = false;
  }
}

async function applyProductFilters() {
  loading.value = true;
  clearNotices();
  try {
    const response = await get(productQuery());
    products.value = response.products;
  } catch (error) {
    handleError(error);
  } finally {
    loading.value = false;
  }
}

function formatReferencePrice(product) {
  const min = product.price_min;
  const max = product.price_max;
  if (min == null && max == null) return '—';
  if (min == null) return formatMoney(max, product.currency);
  if (max == null || Number(min) === Number(max)) return formatMoney(min, product.currency);
  return `${formatMoney(min, product.currency)}–${formatMoney(max, product.currency)}`;
}

function movementLabel(type) {
  return { IN: 'Stok masuk', OUT: 'Stok keluar', ADJUSTMENT: 'Penyesuaian' }[type] ?? type;
}

function movementSign(type) {
  return { IN: '+', OUT: '−', ADJUSTMENT: '↔' }[type] ?? '';
}

function movementTone(type) {
  return { IN: 'positive-value', OUT: 'negative-value' }[type] ?? '';
}

function movementIcon(type) {
  return { IN: ArrowDownToLine, OUT: ArrowUpFromLine, ADJUSTMENT: ArrowDownUp }[type] ?? History;
}

function productsForSupplier(supplierId) {
  return catalog.value.filter((product) => Number(product.supplier_id) === Number(supplierId)).length;
}

onMounted(async () => {
  document.addEventListener('visibilitychange', handlePageVisibility);
  window.addEventListener('online', handlePageVisibility);
  try {
    await refreshCsrf();
    const [session, health] = await Promise.all([
      get('/auth/me'),
      get('/health').catch(() => ({ features: {} })),
    ]);
    user.value = session.user;
    passwordRecoveryAvailable.value = health.features?.passwordRecovery === true;
    if (user.value) await navigate(activePage.value);
  } catch (error) {
    apiUnavailable.value = true;
    handleError(error);
  } finally {
    checkingSession.value = false;
  }
  dataSyncTimer = window.setInterval(syncAutomatically, 30_000);
  if (import.meta.env.PROD) {
    versionCheckTimer = window.setInterval(checkForNewVersion, 60_000);
    void checkForNewVersion();
  }
});

onBeforeUnmount(() => {
  window.clearInterval(dataSyncTimer);
  window.clearInterval(versionCheckTimer);
  window.clearTimeout(versionReloadTimer);
  document.removeEventListener('visibilitychange', handlePageVisibility);
  window.removeEventListener('online', handlePageVisibility);
});
</script>

<template>
  <PageSkeleton v-if="checkingSession" :page="activePage" />

  <div v-else-if="apiUnavailable && !user" class="unavailable-screen">
    <div class="unavailable-card">
      <div class="loading-mark"><Keyboard :size="24" /></div>
      <h1>Layanan inventaris belum tersedia</h1>
      <p>Koneksi sedang bermasalah. Silakan muat ulang halaman beberapa saat lagi.</p>
    </div>
  </div>

  <div v-else-if="!user || resetToken" class="auth-page">
    <div v-if="updateAvailable && hasUnsavedChanges" class="update-notice" role="status">
      <span>Pembaruan tersedia. Halaman akan diperbarui setelah formulir selesai.</span>
      <button type="button" @click="reloadForNewVersion">Perbarui sekarang</button>
    </div>
    <header class="auth-topbar">
      <span class="brand"><span class="brand-mark"><Keyboard :size="18" /></span><strong>KeyStock</strong></span>
      <button class="round-button" type="button" :title="themeMode === 'dark' ? 'Mode terang' : 'Mode gelap'" :aria-label="themeMode === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'" @click="toggleTheme"><Sun v-if="themeMode === 'dark'" :size="17" /><Moon v-else :size="17" /></button>
    </header>

    <main class="auth-main">
      <section class="auth-card" aria-labelledby="auth-title">
        <div class="auth-card-head">
          <span class="auth-icon"><component :is="authMode === 'register' ? UserPlus : LogIn" :size="22" /></span>
          <span class="auth-kicker"><span class="eyebrow-dot"></span> Inventaris gudang keyboard</span>
          <h1 id="auth-title">{{ authMode === 'login' ? 'Masuk ke KeyStock' : authMode === 'register' ? 'Daftar akun' : authMode === 'forgot' ? 'Lupa kata sandi?' : 'Buat kata sandi baru' }}</h1>
          <p>{{ authMode === 'login' ? 'Pantau produk, supplier, dan pergerakan stok dari satu tempat.' : authMode === 'register' ? 'Pendaftaran akun staff akan ditinjau oleh admin.' : authMode === 'forgot' ? 'Kami akan mengirim tautan pemulihan ke email akun Anda.' : 'Pilih kata sandi baru untuk akun KeyStock Anda.' }}</p>
        </div>

        <div v-if="!registrationSubmitted && ['login', 'register'].includes(authMode)" class="auth-tabs" role="tablist" aria-label="Pilih masuk atau daftar">
          <button type="button" role="tab" :aria-selected="authMode === 'login'" :class="{ active: authMode === 'login' }" @click="switchAuthMode('login')">Masuk</button>
          <button type="button" role="tab" :aria-selected="authMode === 'register'" :class="{ active: authMode === 'register' }" @click="switchAuthMode('register')">Daftar akun</button>
        </div>

        <div v-if="errorMessage" class="notice error-notice" role="alert"><AlertTriangle :size="17" />{{ errorMessage }}</div>
        <div v-if="successMessage" class="notice success-notice" role="status"><Check :size="17" />{{ successMessage }}</div>

        <section v-if="registrationSubmitted" class="auth-form">
          <div class="empty-state"><div class="empty-icon"><ShieldCheck :size="22" /></div><strong>Pendaftaran diterima</strong><span>Admin akan meninjau permintaan akun Anda. Silakan masuk setelah akun disetujui.</span></div>
          <button class="button primary full" type="button" @click="switchAuthMode('login')">Kembali ke login</button>
        </section>

        <form v-else-if="authMode === 'login'" class="auth-form" @submit.prevent="submitLogin">
          <div class="auth-field">
            <label for="identifier">Username atau email</label>
            <div class="input-wrap"><AtSign :size="17" /><input id="identifier" v-model="loginForm.identifier" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="Username atau email" required /></div>
          </div>
          <div class="auth-field">
            <label for="password">Kata sandi</label>
            <div class="input-wrap"><Lock :size="17" /><input id="password" v-model="loginForm.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="Masukkan kata sandi" required /><button class="reveal-button" type="button" :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" :aria-pressed="showPassword" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div>
          </div>
          <label class="remember-check"><input v-model="loginForm.rememberMe" type="checkbox" /><span>Ingat saya</span></label>
          <button class="button primary full auth-submit" type="submit" :disabled="busy">
            <span class="spinner small-spinner" v-if="busy"></span>
            {{ busy ? 'Memeriksa...' : 'Masuk ke inventaris' }}
            <ArrowRight v-if="!busy" :size="17" />
          </button>
          <button v-if="passwordRecoveryAvailable" class="button secondary full" type="button" @click="switchAuthMode('forgot')">Lupa kata sandi?</button>
        </form>

        <form v-else-if="authMode === 'register'" class="auth-form" novalidate @submit.prevent="submitRegister">
          <div class="auth-field">
            <label for="register-name">Nama lengkap</label>
            <div class="input-wrap" :class="{ invalid: fieldErrors.name }"><User :size="17" /><input id="register-name" v-model="registerForm.name" autocomplete="name" maxlength="120" placeholder="Nama Anda" required /></div>
            <small v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</small>
          </div>
          <div class="auth-field">
            <label for="register-username">Username</label>
            <div class="input-wrap" :class="{ invalid: fieldErrors.username }"><AtSign :size="17" /><input id="register-username" v-model="registerForm.username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="30" placeholder="huruf kecil, angka, titik, _" required /></div>
            <small v-if="fieldErrors.username" class="field-error">{{ fieldErrors.username }}</small>
          </div>
          <div class="auth-field">
            <label for="register-email">Email</label>
            <div class="input-wrap" :class="{ invalid: fieldErrors.email }"><Mail :size="17" /><input id="register-email" v-model="registerForm.email" type="email" autocomplete="email" maxlength="190" placeholder="nama@email.com" required /></div>
            <small v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</small>
          </div>
          <div class="auth-field">
            <label for="register-password">Kata sandi</label>
            <div class="input-wrap" :class="{ invalid: fieldErrors.password }"><Lock :size="17" /><input id="register-password" v-model="registerForm.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="9" maxlength="64" placeholder="9–64 karakter" title="Gunakan 9–64 karakter dengan huruf besar, huruf kecil, angka, dan simbol. Tanpa spasi." required /><button class="reveal-button" type="button" :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" :aria-pressed="showPassword" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div>
            <small class="field-hint">Gunakan huruf besar, huruf kecil, angka, dan simbol. Kata sandi tidak boleh memakai spasi.</small>
            <ul class="password-checks" aria-label="Syarat kata sandi">
              <li v-for="rule in passwordChecks" :key="rule.label" :class="{ ok: rule.ok }"><Check :size="13" />{{ rule.label }}</li>
            </ul>
            <small v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</small>
          </div>
          <div class="auth-field">
            <label for="register-confirmation">Ulangi kata sandi</label>
            <div class="input-wrap" :class="{ invalid: fieldErrors.password_confirmation }"><Lock :size="17" /><input id="register-confirmation" v-model="registerForm.password_confirmation" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Ketik ulang kata sandi" required /></div>
            <small v-if="fieldErrors.password_confirmation" class="field-error">{{ fieldErrors.password_confirmation }}</small>
          </div>
          <button class="button primary full auth-submit" type="submit" :disabled="busy">
            <span class="spinner small-spinner" v-if="busy"></span>
            {{ busy ? 'Menyimpan...' : 'Kirim pendaftaran' }}
            <ArrowRight v-if="!busy" :size="17" />
          </button>
        </form>

        <form v-else-if="authMode === 'forgot'" class="auth-form" @submit.prevent="submitForgotPassword">
          <div class="auth-field"><label for="forgot-email">Email akun</label><div class="input-wrap"><Mail :size="17" /><input id="forgot-email" v-model="forgotForm.email" type="email" autocomplete="email" maxlength="190" placeholder="nama@email.com" required /></div></div>
          <button class="button primary full auth-submit" type="submit" :disabled="busy">{{ busy ? 'Mengirim...' : 'Kirim tautan pemulihan' }}<ArrowRight v-if="!busy" :size="17" /></button>
          <button class="button secondary full" type="button" @click="switchAuthMode('login')">Kembali ke login</button>
        </form>

        <form v-else class="auth-form" @submit.prevent="submitPasswordReset">
          <div class="auth-field"><label for="reset-password">Kata sandi baru</label><div class="input-wrap"><Lock :size="17" /><input id="reset-password" v-model="resetForm.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="9" maxlength="64" placeholder="9–64 karakter" title="Gunakan 9–64 karakter dengan huruf besar, huruf kecil, angka, dan simbol. Tanpa spasi." required /><button class="reveal-button" type="button" :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div><small class="field-hint">Gunakan huruf besar, huruf kecil, angka, dan simbol. Kata sandi tidak boleh memakai spasi.</small></div>
          <div class="auth-field"><label for="reset-confirmation">Ulangi kata sandi</label><div class="input-wrap"><Lock :size="17" /><input id="reset-confirmation" v-model="resetForm.password_confirmation" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" maxlength="64" placeholder="Ketik ulang kata sandi" required /></div></div>
          <button class="button primary full auth-submit" type="submit" :disabled="busy">{{ busy ? 'Menyimpan...' : 'Simpan kata sandi' }}<ArrowRight v-if="!busy" :size="17" /></button>
        </form>

      </section>

      <ul class="auth-points">
        <li><Boxes :size="16" /> Stok real-time</li>
        <li><History :size="16" /> Riwayat tercatat</li>
        <li><Users :size="16" /> Akses tim inventaris</li>
      </ul>
    </main>

    <footer class="auth-footer">© 2026 KeyStock · Manajemen inventaris keyboard</footer>
  </div>

  <div v-else class="app-shell">
    <div v-if="updateAvailable && hasUnsavedChanges" class="update-notice" role="status">
      <span>Pembaruan tersedia. Halaman akan diperbarui setelah pekerjaan selesai.</span>
      <button type="button" @click="reloadForNewVersion">Perbarui sekarang</button>
    </div>
    <header class="app-header">
      <a class="brand" href="#" aria-label="KeyStock — ringkasan" @click.prevent="navigate('overview')">
        <span class="brand-mark"><Keyboard :size="18" /></span>
        <strong>KeyStock</strong>
      </a>
      <nav class="top-nav" aria-label="Navigasi inventaris">
        <button v-for="item in navItems" :key="item.id" type="button" class="nav-item" :class="{ active: activePage === item.id }" :aria-current="activePage === item.id ? 'page' : undefined" @click="navigate(item.id)">
          <component :is="item.icon" class="nav-icon" :size="18" :stroke-width="1.8" />
          <span class="nav-label">{{ item.label }}</span>
          <span class="nav-short">{{ item.short }}</span>
        </button>
      </nav>
      <div class="header-actions">
        <button class="round-button hide-mobile" type="button" title="Cari produk" aria-label="Cari produk" @click="focusProductSearch"><Search :size="17" /></button>
        <button class="round-button" type="button" :title="themeMode === 'dark' ? 'Mode terang' : 'Mode gelap'" :aria-label="themeMode === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'" @click="toggleTheme"><Sun v-if="themeMode === 'dark'" :size="17" /><Moon v-else :size="17" /></button>
        <div class="user-chip">
          <div class="avatar">{{ user.name?.slice(0, 1).toUpperCase() }}</div>
          <div class="user-meta"><strong>{{ user.name }}</strong><span>@{{ user.username }} · {{ user.role === 'dosen' ? 'Dosen' : user.role === 'admin' ? 'Admin' : 'Staff' }}</span></div>
        </div>
        <button class="round-button" type="button" title="Keluar" aria-label="Keluar" :disabled="busy" @click="logout"><LogOut :size="17" /></button>
      </div>
    </header>

    <main class="main-area">
      <div class="content-wrap">
        <div v-if="errorMessage" class="notice error-notice page-notice"><AlertTriangle :size="17" />{{ errorMessage }}<button class="icon-button quiet" @click="errorMessage = ''"><X :size="15" /></button></div>
        <div v-if="successMessage" class="notice success-notice page-notice"><Check :size="17" />{{ successMessage }}<button class="icon-button quiet" @click="successMessage = ''"><X :size="15" /></button></div>

        <template v-if="activePage === 'overview'">
          <section class="page-head">
            <div class="page-title"><h1>Ringkasan stok</h1><p>Stok real-time keyboard dan aksesori di gudang utama.</p></div>
            <div class="kpi-row">
              <article class="kpi-chip">
                <span class="kpi-icon"><Boxes :size="18" /></span>
                <div><small>Total unit stok</small><strong>{{ formatNumber(dashboard.summary?.totalStock) }}</strong></div>
                <span class="kpi-delta" :class="(dashboard.summary?.weeklyNetChange ?? 0) >= 0 ? 'up' : 'down'"><component :is="(dashboard.summary?.weeklyNetChange ?? 0) >= 0 ? TrendingUp : TrendingDown" :size="13" />{{ (dashboard.summary?.weeklyNetChange ?? 0) >= 0 ? '+' : '' }}{{ formatNumber(dashboard.summary?.weeklyNetChange) }} / 7 hari</span>
              </article>
              <article class="kpi-chip">
                <span class="kpi-icon"><AlertTriangle :size="18" /></span>
                <div><small>Perlu restock</small><strong>{{ formatNumber(dashboard.summary?.lowStockCount) }}</strong></div>
                <span class="kpi-delta" :class="dashboard.summary?.lowStockCount ? 'warn' : 'up'">dari {{ formatNumber(dashboard.summary?.activeProducts) }} SKU</span>
              </article>
              <article class="kpi-chip">
                <span class="kpi-icon"><PackageX :size="18" /></span>
                <div><small>Stok habis</small><strong>{{ formatNumber(dashboard.summary?.outOfStockCount) }}</strong></div>
                <span class="kpi-delta" :class="dashboard.summary?.outOfStockCount ? 'down' : 'up'">{{ dashboard.summary?.outOfStockCount ? 'segera isi ulang' : 'aman' }}</span>
              </article>
            </div>
          </section>

          <section class="panel overview-toolbar">
            <div class="toolbar-title"><span class="icon-box"><Package :size="18" /></span><div><strong>Inventory overview</strong><small>Hari ini — {{ today }}</small></div></div>
            <button v-if="dashboard.summary?.lowStockCount" type="button" class="restock-alert" @click="showLowStock"><AlertTriangle :size="15" /> {{ formatNumber(dashboard.summary.lowStockCount) }} produk perlu restock</button>
            <span v-else class="restock-alert is-ok"><Check :size="15" /> Semua stok di atas batas minimum</span>
            <div class="toolbar-actions">
              <button class="round-button" type="button" title="Unduh stok (CSV)" aria-label="Unduh stok (CSV)" @click="exportInventoryCsv"><Download :size="17" /></button>
              <span class="sync-status" :class="{ offline: syncStatus === 'offline' }" :title="syncStatus === 'offline' ? 'Akan mencoba kembali secara otomatis' : 'Data disinkronkan otomatis setiap 30 detik saat halaman aktif'"><span class="sync-status-dot"></span>{{ syncStatus === 'offline' ? 'Mencoba menyambungkan' : 'Sinkron otomatis' }}</span>
              <button class="button primary pill" type="button" @click="openMovement()"><Plus :size="16" /> Catat pergerakan</button>
            </div>
          </section>

          <section class="overview-grid">
            <article class="panel analytic-card">
              <div class="card-head">
                <h2>Aktivitas stok</h2>
                <div class="segmented" role="tablist" aria-label="Periode heatmap">
                  <button v-for="days in [7, 14, 30]" :key="days" type="button" role="tab" :aria-selected="heatmapDays === days" :class="{ active: heatmapDays === days }" @click="heatmapDays = days">{{ days }} hari</button>
                </div>
                <button class="round-button small" type="button" title="Buka riwayat stok" aria-label="Buka riwayat stok" @click="navigate('movements')"><ArrowUpRight :size="16" /></button>
              </div>
              <div class="stat-trio">
                <div><strong>{{ formatNumber(dashboard.summary?.stockStats?.min) }}<ArrowUpRight :size="15" /></strong><span>Stok terendah</span></div>
                <div><strong>{{ formatNumber(dashboard.summary?.stockStats?.avg) }}<ArrowUpRight :size="15" /></strong><span>Rata-rata stok</span></div>
                <div><strong>{{ formatNumber(dashboard.summary?.stockStats?.max) }}<ArrowUpRight :size="15" /></strong><span>Stok tertinggi</span></div>
              </div>
              <ActivityHeatmap :activity="dashboard.activity ?? []" :days="heatmapDays" />
            </article>

            <section class="panel rack-panel" aria-labelledby="rack-map-title">
              <div class="card-head"><h2 id="rack-map-title">Peta rak gudang</h2><span class="card-note">Tinggi kardus = jumlah stok</span></div>
              <RackMap compact :products="catalog" :selected-id="overviewProductId" @select="(id) => { overviewProductId = String(id); openProductDetail(id); }" />
            </section>

            <article class="panel stock-priority-card" aria-labelledby="stock-priority-title">
              <div class="card-head stock-priority-card-head">
                <div><h2 id="stock-priority-title">Prioritas stok</h2><p>Produk yang habis atau mendekati batas minimum.</p></div>
              </div>
              <div class="stock-priority-grid">
                <section class="stock-priority-group is-empty" aria-labelledby="out-of-stock-title">
                  <div class="stock-priority-heading">
                    <span class="stock-priority-icon"><PackageX :size="17" /></span>
                    <div><h3 id="out-of-stock-title">Stok habis</h3><small>{{ formatNumber(outOfStockCount) }} SKU</small></div>
                    <button v-if="outOfStockCount > 3" class="stock-priority-link" type="button" @click="showOutOfStock">Lihat semua <ArrowRight :size="13" /></button>
                  </div>
                  <ul v-if="outOfStockProducts.length" class="stock-priority-list">
                    <li v-for="product in outOfStockProducts.slice(0, 3)" :key="product.id">
                      <button class="stock-priority-item" type="button" :aria-label="`Buka detail ${product.name}, stok habis`" @click="openProductDetail(product)">
                        <span class="priority-product-copy"><strong>{{ product.name }}</strong><small>#{{ product.sku }} · {{ product.storage_location || 'Lokasi belum dicatat' }}</small></span>
                        <span class="priority-stock is-empty"><strong>{{ formatNumber(product.warehouse_stock) }}</strong><small>min. {{ formatNumber(product.reorder_point) }}</small></span>
                      </button>
                    </li>
                  </ul>
                  <div v-else class="stock-priority-empty"><Check :size="15" /> Tidak ada stok habis</div>
                </section>

                <section class="stock-priority-group is-low" aria-labelledby="restock-title">
                  <div class="stock-priority-heading">
                    <span class="stock-priority-icon"><AlertTriangle :size="17" /></span>
                    <div><h3 id="restock-title">Perlu restock</h3><small>{{ formatNumber(restockCount) }} SKU</small></div>
                    <button v-if="restockCount > 3" class="stock-priority-link" type="button" @click="showLowStock">Lihat semua <ArrowRight :size="13" /></button>
                  </div>
                  <ul v-if="restockProducts.length" class="stock-priority-list">
                    <li v-for="product in restockProducts.slice(0, 3)" :key="product.id">
                      <button class="stock-priority-item" type="button" :aria-label="`Buka detail ${product.name}, tersisa ${formatNumber(product.warehouse_stock)} unit`" @click="openProductDetail(product)">
                        <span class="priority-product-copy"><strong>{{ product.name }}</strong><small>#{{ product.sku }} · {{ product.storage_location || 'Lokasi belum dicatat' }}</small></span>
                        <span class="priority-stock is-low"><strong>{{ formatNumber(product.warehouse_stock) }}</strong><small>min. {{ formatNumber(product.reorder_point) }}</small></span>
                      </button>
                    </li>
                  </ul>
                  <div v-else class="stock-priority-empty"><Check :size="15" /> Tidak ada produk perlu restock</div>
                </section>
              </div>
            </article>

            <article class="panel finance-card" aria-labelledby="finance-title">
              <div class="card-head"><h2 id="finance-title">Laba &amp; rugi</h2><span class="card-note">{{ finance.days ?? 30 }} hari · Rupiah</span><button class="round-button small" type="button" title="Buka riwayat transaksi" aria-label="Buka riwayat transaksi" @click="navigate('movements')"><ArrowUpRight :size="16" /></button></div>
              <div class="finance-hero">
                <span class="icon-box"><Wallet :size="18" /></span>
                <div><small>Laba bersih</small><strong :class="finance.netProfit > 0 ? 'positive-value' : finance.netProfit < 0 ? 'negative-value' : ''">{{ formatSignedMoney(finance.netProfit) }}</strong></div>
                <span class="kpi-delta" :class="finance.grossMargin == null ? '' : finance.grossMargin >= 0 ? 'up' : 'down'">Margin kotor {{ formatPercent(finance.grossMargin) }}</span>
              </div>
              <div class="finance-bar" role="img" :aria-label="`Pendapatan terdiri dari HPP ${formatPercent(finance.cogsShare)} dan laba kotor`"><span class="cogs" :style="{ width: `${finance.cogsShare}%` }"></span><span class="profit"></span></div>
              <div class="finance-bar-legend"><span><i class="cogs"></i>HPP</span><span><i class="profit"></i>Laba kotor</span></div>
              <dl class="finance-list">
                <div><dt>Pendapatan penjualan</dt><dd>{{ formatMoney(finance.revenue, 'IDR', '—') }}</dd></div>
                <div><dt>HPP (modal barang terjual)</dt><dd>{{ formatSignedMoney(-finance.cogs) }}</dd></div>
                <div class="subtotal"><dt>Laba kotor</dt><dd>{{ formatSignedMoney(finance.grossProfit) }}</dd></div>
                <div><dt>Rugi stok (rusak/hilang)</dt><dd :class="{ 'negative-value': finance.stockLoss > 0 }">{{ formatSignedMoney(-finance.stockLoss) }}</dd></div>
              </dl>
              <div class="finance-foot">
                <div><small>Belanja stok</small><strong>{{ formatMoney(finance.purchases, 'IDR', '—') }}</strong></div>
                <div><small>Unit terjual</small><strong>{{ formatNumber(finance.unitsSold) }}</strong></div>
                <div><small>Nilai stok (modal)</small><strong>{{ formatMoney(dashboard.summary?.inventoryCost, 'IDR', '—') }}</strong></div>
                <div><small>Potensi laba stok</small><strong>{{ finance.potential == null ? '—' : formatSignedMoney(finance.potential) }}</strong></div>
              </div>
              <p v-if="finance.unpricedSales || finance.excludedForeignCurrency" class="finance-note">{{ formatNumber((finance.unpricedSales ?? 0) + (finance.excludedForeignCurrency ?? 0)) }} penjualan tanpa harga rupiah tidak dihitung.</p>
            </article>
          </section>

          <section class="panel activity-card">
            <div class="card-head activity-head">
              <h2>Aktivitas terbaru</h2>
              <div class="pill-filters" role="tablist" aria-label="Filter aktivitas">
                <button v-for="filter in activityFilters" :key="filter.id" type="button" role="tab" :aria-selected="activityFilter === filter.id" :class="{ active: activityFilter === filter.id }" @click="setActivityFilter(filter.id)">{{ filter.label }}</button>
              </div>
              <div class="pager">
                <span>{{ activityRange }}</span>
                <button class="round-button small" type="button" aria-label="Halaman sebelumnya" :disabled="activityPage <= 1" @click="activityPage -= 1"><ChevronLeft :size="16" /></button>
                <button class="round-button small" type="button" aria-label="Halaman berikutnya" :disabled="activityPage >= activityPageCount" @click="activityPage += 1"><ChevronRight :size="16" /></button>
              </div>
            </div>
            <div v-if="loading && !movements.length" class="loading-inline"><span class="spinner"></span> Memuat aktivitas...</div>
            <div v-else-if="pagedActivities.length" class="table-scroll"><table class="data-table activity-table stack-table"><thead><tr><th>ID</th><th>Produk</th><th>Kategori</th><th>Stok</th><th>Lokasi</th><th>Waktu</th><th>Dicatat oleh</th><th>Jenis</th></tr></thead><tbody>
              <tr v-for="item in pagedActivities" :key="item.id">
                <td data-label="ID" class="mono-cell">{{ movementCode(item) }}</td>
                <td class="cell-primary"><button type="button" class="clickable-name" @click="openProductDetail(item.product)"><strong>{{ item.product?.name }}</strong></button><small class="cell-subtext">{{ item.product?.sku }}</small></td>
                <td data-label="Kategori">{{ item.product?.category?.name ?? '—' }}</td>
                <td data-label="Stok"><strong :class="movementTone(item.movement_type)">{{ movementSign(item.movement_type) }}{{ formatNumber(item.quantity) }} unit</strong><small class="cell-subtext">{{ formatNumber(item.stock_before) }} → {{ formatNumber(item.stock_after) }}</small></td>
                <td data-label="Lokasi">{{ item.product?.storage_location || '—' }}</td>
                <td data-label="Waktu">{{ formatDate(item.createdAt ?? item.created_at) }}</td>
                <td data-label="Dicatat oleh">{{ item.user?.name }}</td>
                <td data-label="Jenis"><span class="status-pill" :class="`kind-${item.movement_type.toLowerCase()}`">{{ movementLabel(item.movement_type) }}</span><small class="cell-subtext">{{ reasonLabel(item.reason) }}</small></td>
              </tr>
            </tbody></table></div>
            <div v-else class="empty-state compact-empty"><div class="empty-icon"><History :size="21" /></div><strong>Belum ada aktivitas</strong><span>Catat stok masuk, keluar, atau penyesuaian untuk mengisi daftar ini.</span></div>
          </section>
        </template>

        <template v-else-if="activePage === 'products'">
          <section class="page-heading">
            <div><h1>Produk</h1><p>Kelola SKU, brand, supplier, harga, dan lokasi penyimpanan.</p></div>
            <div class="heading-actions"><button v-if="isAdmin" class="button primary" @click="openCreateProduct()"><Plus :size="16" /> Tambah produk</button></div>
          </section>
          <section class="product-stat-grid" aria-label="Ringkasan produk yang ditampilkan">
            <article class="product-stat-card"><span>SKU ditampilkan</span><strong>{{ formatNumber(productStats.sku) }}</strong></article>
            <article class="product-stat-card"><span>Jumlah unit stok</span><strong>{{ formatNumber(productStats.units) }}</strong></article>
            <article class="product-stat-card"><span>Perlu restock</span><strong :class="productStats.lowStock ? 'stat-warning' : ''">{{ formatNumber(productStats.lowStock) }}</strong></article>
            <article class="product-stat-card"><span>SKU dengan supplier</span><strong>{{ formatNumber(productStats.supplied) }}</strong></article>
          </section>
          <section class="panel table-panel">
            <div class="table-toolbar"><div class="search-field"><Search :size="17" /><input v-model="searchQuery" type="search" placeholder="Cari nama, SKU, atau brand..." @keydown.enter="applyProductFilters" /><button v-if="searchQuery" class="clear-search" aria-label="Hapus pencarian" @click="searchQuery = ''; applyProductFilters()"><X :size="14" /></button></div>
              <select v-model="selectedCategory" class="filter-select" aria-label="Filter kategori" @change="applyProductFilters"><option value="">Semua kategori</option><option v-for="category in categories" :key="category.id" :value="String(category.id)">{{ category.name }}</option></select>
              <select v-model="selectedSupplier" class="filter-select" aria-label="Filter supplier"><option value="">Semua supplier</option><option v-for="supplier in suppliers.filter((entry) => entry.is_active)" :key="supplier.id" :value="String(supplier.id)">{{ supplier.name }}</option></select>
              <select v-model="stockFilter" class="filter-select stock-filter" aria-label="Filter kondisi stok" @change="applyProductFilters"><option value="all">Semua stok</option><option value="out">Stok habis</option><option value="low">Perlu restock</option></select>
            </div>
            <div v-if="loading" class="loading-inline"><span class="spinner"></span> Memuat produk...</div>
            <div v-else-if="filteredProducts.length" class="table-scroll"><table class="data-table product-table stack-table"><thead><tr><th>Produk</th><th>Supplier / kontak</th><th>Harga beli / jual</th><th>Stok</th><th>Lokasi</th><th>Kondisi</th><th>Aksi</th></tr></thead><tbody>
              <tr v-for="product in filteredProducts" :key="product.id">
                <td class="cell-primary"><button type="button" class="product-cell clickable-name" :aria-label="`Buka detail ${product.name}`" @click="openProductDetail(product)"><img class="product-thumb" :src="product.image_url || '/keyboard-placeholder.svg'" :alt="product.name" loading="lazy" @error="onImageError" /><div><strong :title="product.name">{{ product.name }}</strong><small>{{ product.brand }} · {{ product.category?.name ?? 'Lainnya' }} · {{ product.sku }}</small></div></button></td>
                <td data-label="Supplier"><div class="supplier-cell"><strong>{{ product.supplier?.name ?? 'Belum ditentukan' }}</strong><small>{{ product.supplier?.phone || product.supplier?.email || 'Kontak belum dicatat' }}</small></div></td>
                <td data-label="Harga beli / jual" class="money-pair-cell"><div><span>Beli</span><strong :class="{ 'is-empty': product.purchase_price == null }">{{ formatMoney(product.purchase_price, product.currency, '—') }}</strong></div><div><span>Jual</span><strong :class="{ 'is-empty': product.selling_price == null }">{{ formatMoney(product.selling_price, product.currency, '—') }}</strong></div><small v-if="pricing(product).unitProfit != null" class="margin-tag" :class="pricing(product).unitProfit > 0 ? 'up' : pricing(product).unitProfit < 0 ? 'down' : ''">Untung {{ formatSignedMoney(pricing(product).unitProfit, product.currency) }}/unit · {{ formatPercent(pricing(product).margin) }}</small><small v-if="product.price_min != null || product.price_max != null" class="cell-subtext">Ref. {{ formatReferencePrice(product) }}</small></td>
                <td data-label="Stok" class="span-2"><span class="stock-count" :class="stockState(product).tone">{{ formatNumber(product.warehouse_stock) }} <small>unit</small></span><small class="cell-subtext">min. {{ formatNumber(product.reorder_point) }}</small></td>
                <td data-label="Lokasi" class="span-2"><span class="location-tag">{{ product.storage_location || '—' }}</span></td>
                <td data-label="Kondisi" class="span-2"><span class="stock-badge" :class="stockState(product).tone"><span></span>{{ stockState(product).label }}</span></td>
                <td class="cell-actions"><div class="row-actions"><button class="icon-button subtle" type="button" title="Lihat detail" aria-label="Lihat detail produk" @click="openProductDetail(product)"><Eye :size="15" /></button><button class="icon-button subtle" title="Catat pergerakan stok" aria-label="Catat pergerakan stok" @click="openMovement(product)"><ArrowDownUp :size="15" /></button><template v-if="isAdmin"><button class="icon-button subtle" title="Edit produk" aria-label="Edit produk" @click="openEditProduct(product)"><Settings :size="15" /></button><button class="icon-button danger-quiet" title="Arsipkan produk" aria-label="Arsipkan produk" @click="archiveProduct(product)"><X :size="15" /></button></template></div></td>
              </tr>
            </tbody></table></div>
          <div v-else class="empty-state"><div class="empty-icon"><Package :size="22" /></div><strong>Produk tidak ditemukan</strong><span>Ubah kata pencarian atau filter, lalu coba lagi.</span><button v-if="isAdmin" class="button secondary small-button" @click="openCreateProduct()"><Plus :size="15" /> Tambah produk pertama</button></div>
            <div class="table-footer"><span>Menampilkan <strong>{{ filteredProducts.length }}</strong> produk</span><span class="table-footer-note"><ShieldCheck :size="14" /> Harga beli tidak diasumsikan dari harga katalog.</span></div>
          </section>
        </template>

        <template v-else-if="activePage === 'suppliers'">
          <section class="page-heading">
            <div><h1>Supplier</h1><p>Catat toko atau distributor tempat produk diperoleh. Brand produk dikelola terpisah.</p></div>
            <div class="heading-actions"><button v-if="isAdmin" class="button primary" @click="openCreateSupplier()"><Plus :size="16" /> Tambah supplier</button></div>
          </section>
          <section class="supplier-summary-grid"><article class="supplier-summary-card"><span class="supplier-summary-icon"><Truck :size="17" /></span><div><small>Supplier aktif</small><strong>{{ suppliers.filter((supplier) => supplier.is_active).length }}</strong></div></article><article class="supplier-summary-card"><span class="supplier-summary-icon contact-icon"><Building2 :size="17" /></span><div><small>Produk dengan supplier</small><strong>{{ catalog.filter((product) => product.supplier_id).length }}</strong></div></article><article class="supplier-summary-card"><span class="supplier-summary-icon warning-icon"><AlertTriangle :size="17" /></span><div><small>Kontak perlu dilengkapi</small><strong>{{ suppliers.filter((supplier) => supplier.is_active && !supplier.phone && !supplier.email).length }}</strong></div></article></section>
          <div v-if="loading" class="loading-inline panel"><span class="spinner"></span> Memuat supplier...</div>
          <section v-else-if="suppliers.length" class="supplier-grid"><article v-for="supplier in suppliers" :key="supplier.id" class="panel supplier-card" :class="{ archived: !supplier.is_active }">
            <div class="supplier-card-head"><div class="supplier-avatar"><Truck :size="18" /></div><span class="stock-badge" :class="supplier.is_active ? 'good' : 'empty'"><span></span>{{ supplier.is_active ? 'Aktif' : 'Diarsipkan' }}</span><div v-if="isAdmin" class="supplier-actions"><button class="icon-button subtle" title="Edit supplier" aria-label="Edit supplier" @click="openEditSupplier(supplier)"><Settings :size="15" /></button><button v-if="supplier.is_active" class="icon-button danger-quiet" title="Arsipkan supplier" aria-label="Arsipkan supplier" @click="archiveSupplier(supplier)"><X :size="15" /></button></div></div>
            <h2>{{ supplier.name }}</h2><p class="supplier-contact-person">{{ supplier.contact_person || 'Kontak person belum dicatat' }}</p>
            <div class="supplier-contact-list"><span v-if="supplier.phone"><Phone :size="15" />{{ supplier.phone }}</span><span v-else class="missing-contact"><Phone :size="15" />Nomor telepon belum dicatat</span><a v-if="supplier.email" :href="`mailto:${supplier.email}`"><Mail :size="15" />{{ supplier.email }}</a><span v-else class="missing-contact"><Mail :size="15" />Email belum dicatat</span><span v-if="supplier.city"><MapPin :size="15" />{{ supplier.city }}</span><a v-if="supplier.website" :href="supplier.website" target="_blank" rel="noopener noreferrer"><ExternalLink :size="15" />Buka situs supplier</a></div>
            <div v-if="supplier.phone || supplier.email" class="supplier-quick-actions"><a v-if="whatsappUrl(supplier.phone)" class="wa-button" :href="whatsappUrl(supplier.phone)" target="_blank" rel="noopener noreferrer" :aria-label="`Chat WhatsApp ${supplier.name}`"><MessageCircle :size="15" /> WhatsApp</a><a v-if="telUrl(supplier.phone)" class="button secondary small-action" :href="telUrl(supplier.phone)"><Phone :size="14" /> Telepon</a><a v-if="supplier.email" class="button secondary small-action" :href="`mailto:${supplier.email}`"><Mail :size="14" /> Email</a></div>
            <div class="supplier-card-footer"><span><Package :size="14" /> {{ productsForSupplier(supplier.id) }} produk terhubung</span><span v-if="supplier.notes" class="supplier-note">{{ supplier.notes }}</span></div>
          </article></section>
          <section v-else class="panel empty-state supplier-empty"><div class="empty-icon"><Truck :size="22" /></div><strong>Belum ada supplier</strong><span>Tambahkan supplier untuk menghubungkan produk dengan sumber pembelian.</span><button v-if="isAdmin" class="button secondary small-button" @click="openCreateSupplier()"><Plus :size="15" /> Tambah supplier</button></section>
        </template>

        <template v-else-if="activePage === 'users'">
          <section class="page-heading">
            <div><h1>Pengguna</h1><p>Tinjau pendaftaran, atur peran, dan kelola akses akun.</p></div>
          </section>
          <section class="supplier-summary-grid user-summary-grid">
            <article class="supplier-summary-card"><span class="supplier-summary-icon"><UserCheck :size="17" /></span><div><small>Pengguna aktif</small><strong>{{ users.filter((entry) => entry.is_active).length }}</strong></div></article>
            <article class="supplier-summary-card"><span class="supplier-summary-icon contact-icon"><ShieldCheck :size="17" /></span><div><small>Admin aktif</small><strong>{{ users.filter((entry) => entry.is_active && entry.role === 'admin').length }}</strong></div></article>
            <article class="supplier-summary-card"><span class="supplier-summary-icon contact-icon"><ShieldCheck :size="17" /></span><div><small>Dosen aktif</small><strong>{{ users.filter((entry) => entry.is_active && entry.role === 'dosen').length }}</strong></div></article>
            <article class="supplier-summary-card"><span class="supplier-summary-icon warning-icon"><UserPlus :size="17" /></span><div><small>Menunggu review</small><strong>{{ users.filter((entry) => entry.approval_status === 'pending').length }}</strong></div></article>
            <article class="supplier-summary-card"><span class="supplier-summary-icon warning-icon"><UserX :size="17" /></span><div><small>Nonaktif</small><strong>{{ users.filter((entry) => !entry.is_active).length }}</strong></div></article>
          </section>
          <section class="panel table-panel">
            <div v-if="loading" class="loading-inline"><span class="spinner"></span> Memuat pengguna...</div>
            <div v-else class="table-scroll"><table class="data-table user-table stack-table"><thead><tr><th>Pengguna</th><th>Peran</th><th>Status</th><th>Catatan stok</th><th>Bergabung</th><th>Aksi</th></tr></thead><tbody>
              <tr v-for="entry in users" :key="entry.id" :class="{ 'is-inactive': !entry.is_active }">
                <td class="cell-primary"><div class="user-cell"><div class="avatar">{{ entry.name?.slice(0, 1).toUpperCase() }}</div><div><strong>{{ entry.name }} <span v-if="entry.id === user.id" class="you-tag">Anda</span></strong><small>@{{ entry.username ?? '—' }} · {{ entry.email }}</small></div></div></td>
                <td data-label="Peran"><select class="filter-select role-select" :value="entry.role" :disabled="busy || entry.id === user.id || entry.username === 'admin'" :aria-label="`Peran ${entry.name}`" @change="changeUserRole(entry, $event.target.value)"><option value="admin">Admin</option><option value="dosen">Dosen</option><option value="staff">Staff</option></select></td>
                <td data-label="Status"><span class="stock-badge" :class="entry.approval_status === 'pending' ? 'low' : entry.is_active ? 'good' : 'empty'"><span></span>{{ entry.approval_status === 'pending' ? 'Menunggu review' : entry.approval_status === 'rejected' ? 'Ditolak' : entry.is_active ? 'Aktif' : 'Nonaktif' }}</span></td>
                <td data-label="Catatan stok">{{ formatNumber(entry.movement_count) }} catatan</td>
                <td data-label="Bergabung">{{ formatDate(entry.createdAt ?? entry.created_at) }}</td>
                <td class="cell-actions"><div class="row-actions"><template v-if="entry.approval_status === 'pending' && entry.username !== 'admin'"><button class="button primary small-action" type="button" :disabled="busy" @click="reviewAccount(entry, 'approve')">Setujui</button><button class="button secondary small-action danger-outline" type="button" :disabled="busy" @click="reviewAccount(entry, 'reject')">Tolak</button></template><button v-else-if="entry.id !== user.id && entry.username !== 'admin'" class="button secondary small-action" :class="{ 'danger-outline': entry.is_active }" type="button" :disabled="busy" @click="toggleUserActive(entry)"><component :is="entry.is_active ? UserX : UserCheck" :size="15" />{{ entry.is_active ? 'Nonaktifkan' : 'Aktifkan' }}</button><span v-else-if="entry.username === 'admin'" class="you-tag">Akun utama dilindungi</span></div></td>
              </tr>
            </tbody></table></div>
            <div class="table-footer"><span>Akun baru menunggu persetujuan Admin atau Dosen dan akan aktif sebagai Staff.</span><span class="table-footer-note"><ShieldCheck :size="14" /> Akun Admin utama tidak dapat diubah atau dinonaktifkan.</span></div>
          </section>
          <section class="panel access-panel">
            <div class="panel-heading"><div><div class="panel-kicker">AKSES PENGGUNA</div><h2>Rincian hak akses</h2><p>Setiap peran memiliki akses sesuai tanggung jawabnya.</p></div></div>
            <div class="table-scroll"><table class="data-table access-table"><thead><tr><th>Aksi</th><th>Admin</th><th>Dosen</th><th>Staff</th></tr></thead><tbody>
              <tr v-for="rule in roleRules" :key="rule.action"><td>{{ rule.action }}</td><td><span class="access-mark" :class="rule.admin ? 'yes' : 'no'">{{ rule.admin ? 'Boleh' : 'Tidak' }}</span></td><td><span class="access-mark" :class="rule.dosen ? 'yes' : 'no'">{{ rule.dosen ? 'Boleh' : 'Tidak' }}</span></td><td><span class="access-mark" :class="rule.staff ? 'yes' : 'no'">{{ rule.staff ? 'Boleh' : 'Tidak' }}</span></td></tr>
            </tbody></table></div>
          </section>
        </template>

        <template v-else>
          <section class="page-heading">
            <div><h1>Pergerakan stok</h1><p>Riwayat stok masuk, stok keluar, dan penyesuaian.</p></div>
            <div class="heading-actions"><button class="button primary" @click="openMovement()"><Plus :size="16" /> Catat pergerakan</button></div>
          </section>
          <section class="panel movement-panel">
            <div class="panel-heading"><div><div class="panel-kicker">STOCK MOVEMENTS</div><h2>Riwayat inventaris</h2><p>{{ filteredMovements.length }} dari {{ movements.length }} catatan terbaru</p></div><div class="audit-tag"><History :size="15" /> Riwayat tercatat</div></div>
            <div class="table-toolbar"><div class="search-field"><Search :size="17" /><input v-model="movementSearch" type="search" placeholder="Cari produk, SKU, pengguna, atau catatan..." aria-label="Cari riwayat stok" /><button v-if="movementSearch" class="clear-search" type="button" aria-label="Hapus pencarian" @click="movementSearch = ''"><X :size="14" /></button></div><select v-model="movementTypeFilter" class="filter-select" aria-label="Filter jenis pergerakan"><option value="">Semua aktivitas</option><option value="IN">Stok masuk</option><option value="OUT">Stok keluar</option><option value="ADJUSTMENT">Penyesuaian</option></select></div>
            <div v-if="loading" class="loading-inline"><span class="spinner"></span> Memuat riwayat...</div>
            <div v-else-if="filteredMovements.length" class="table-scroll"><table class="data-table movement-table stack-table"><thead><tr><th>Aktivitas</th><th>Produk</th><th>Stok sebelum / sesudah</th><th>Jumlah</th><th>Nilai</th><th>Dicatat oleh</th><th>Waktu</th><th>Catatan</th></tr></thead><tbody>
              <tr v-for="item in filteredMovements" :key="item.id"><td data-label="Aktivitas"><span class="movement-kind" :class="`kind-${item.movement_type.toLowerCase()}`"><component :is="movementIcon(item.movement_type)" :size="14" /> {{ movementLabel(item.movement_type) }}</span><small class="cell-subtext">{{ reasonLabel(item.reason) }}</small></td><td class="cell-primary"><button type="button" class="clickable-name" @click="openProductDetail(item.product)"><strong>{{ item.product?.name }}</strong></button><small class="cell-subtext">{{ item.product?.brand }} · {{ item.product?.sku }}</small></td><td data-label="Sebelum → sesudah"><span class="balance-pair">{{ formatNumber(item.stock_before) }} <span>→</span> <strong>{{ formatNumber(item.stock_after) }}</strong></span></td><td data-label="Jumlah"><strong :class="movementTone(item.movement_type)">{{ movementSign(item.movement_type) }}{{ formatNumber(item.quantity) }}</strong> unit</td><td data-label="Nilai" class="value-cell"><template v-if="recordedValue(item)"><strong :class="`${recordedValue(item).tone}-value`">{{ formatValue(recordedValue(item), item.currency) }}</strong><small class="cell-subtext">{{ recordedValue(item).label }}</small></template><span v-else class="is-empty">—</span></td><td data-label="Dicatat oleh">{{ item.user?.name }}</td><td data-label="Waktu">{{ formatDate(item.createdAt ?? item.created_at) }}</td><td data-label="Catatan" class="note-cell">{{ item.note || '—' }}</td></tr>
            </tbody></table></div>
            <div v-else class="empty-state"><div class="empty-icon"><History :size="22" /></div><strong>{{ movements.length ? 'Tidak ada catatan yang cocok' : 'Belum ada riwayat' }}</strong><span>{{ movements.length ? 'Ubah kata pencarian atau filter aktivitas.' : 'Setiap perubahan saldo akan dicatat di halaman ini.' }}</span></div>
          </section>
        </template>

        <footer class="app-footer"><span>KEYSTOCK <i>·</i> MECHANICAL KEYBOARD INVENTORY</span><span>© 2026 KeyStock</span></footer>
      </div>
    </main>

    <div v-if="productModalOpen" class="modal-backdrop" @click.self="productModalOpen = false">
      <section class="modal-card product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <header class="modal-header"><div><div class="eyebrow muted-eyebrow">PRODUCT REGISTER</div><h2 id="product-modal-title">{{ editingProduct ? 'Edit produk' : 'Tambah produk' }}</h2></div><button class="icon-button subtle" type="button" title="Tutup" aria-label="Tutup" @click="productModalOpen = false"><X :size="18" /></button></header>
        <form class="modal-form" @submit.prevent="saveProduct">
          <div class="modal-body">
            <div v-if="formError" class="notice error-notice" role="alert"><AlertTriangle :size="17" />{{ formError }}</div>
            <fieldset class="form-section">
              <legend>Identitas produk</legend>
              <div class="form-grid">
                <label class="full-field" :class="{ invalid: fieldErrors.name }">Nama produk<input v-model="productForm.name" required maxlength="190" placeholder="Contoh: Gateron Milky Yellow Pro" /><small v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</small></label>
                <label :class="{ invalid: fieldErrors.sku }">SKU<input v-model="productForm.sku" required maxlength="100" pattern="[A-Za-z0-9._-]+" title="Huruf, angka, titik, garis bawah, atau tanda hubung" placeholder="gateron-milky-yellow-pro" /><small v-if="fieldErrors.sku" class="field-error">{{ fieldErrors.sku }}</small></label>
                <label :class="{ invalid: fieldErrors.brand }">Brand / pembuat<input v-model="productForm.brand" required maxlength="120" placeholder="Contoh: Gateron" /><small v-if="fieldErrors.brand" class="field-error">{{ fieldErrors.brand }}</small></label>
                <label :class="{ invalid: fieldErrors.category_id }">Kategori<select v-model="productForm.category_id" required><option value="" disabled>Pilih kategori</option><option v-for="category in categories" :key="category.id" :value="String(category.id)">{{ category.name }}</option></select><small v-if="fieldErrors.category_id" class="field-error">{{ fieldErrors.category_id }}</small></label>
                <label :class="{ invalid: fieldErrors.reorder_point }">Batas minimum stok<input v-model="productForm.reorder_point" type="number" min="0" step="1" required /><small v-if="fieldErrors.reorder_point" class="field-error">{{ fieldErrors.reorder_point }}</small></label>
              </div>
            </fieldset>
            <fieldset class="form-section">
              <legend>Supplier &amp; penyimpanan</legend>
              <div class="form-grid">
                <label :class="{ invalid: fieldErrors.supplier_id }">Supplier<select v-model="productForm.supplier_id"><option value="">Belum ditentukan</option><option v-for="supplier in suppliers" :key="supplier.id" :value="String(supplier.id)">{{ supplier.name }}{{ supplier.is_active ? '' : ' (arsip)' }}</option></select><small v-if="fieldErrors.supplier_id" class="field-error">{{ fieldErrors.supplier_id }}</small></label>
                <label :class="{ invalid: fieldErrors.storage_location }">Lokasi rak<input v-model="productForm.storage_location" maxlength="8" placeholder="RAK-TINGKAT-SLOT, mis. A-1-05" @blur="productForm.storage_location = productForm.storage_location.trim().toUpperCase()" /><small v-if="fieldErrors.storage_location" class="field-error">{{ fieldErrors.storage_location }}</small></label>
              </div>
            </fieldset>
            <fieldset class="form-section">
              <legend>Harga inventaris</legend>
              <div class="form-grid three-columns">
                <label :class="{ invalid: fieldErrors.purchase_price }">Harga beli<input v-model="productForm.purchase_price" type="number" min="0" step="1" inputmode="numeric" placeholder="Belum dicatat" /><small v-if="fieldErrors.purchase_price" class="field-error">{{ fieldErrors.purchase_price }}</small></label>
                <label :class="{ invalid: fieldErrors.selling_price }">Harga jual<input v-model="productForm.selling_price" type="number" min="0" step="1" inputmode="numeric" placeholder="Belum ditentukan" /><small v-if="fieldErrors.selling_price" class="field-error">{{ fieldErrors.selling_price }}</small></label>
                <label>Mata uang<select v-model="productForm.currency"><option value="IDR">IDR — Rupiah</option><option value="USD">USD — Dollar</option></select></label>
              </div>
            </fieldset>
            <fieldset class="form-section">
              <legend>Deskripsi</legend>
              <div class="form-grid">
                <label class="full-field" :class="{ invalid: fieldErrors.description }">Deskripsi / spesifikasi<textarea v-model="productForm.description" rows="3" maxlength="5000" placeholder="Layout, tipe switch, koneksi, atau detail lain"></textarea><small v-if="fieldErrors.description" class="field-error">{{ fieldErrors.description }}</small></label>
              </div>
            </fieldset>
            <details class="form-section optional-section" :open="Boolean(fieldErrors.source_url || fieldErrors.price_max || fieldErrors.price_min || fieldErrors.listing_status)">
              <summary>Referensi listing <span>opsional</span></summary>
              <div class="form-grid">
                <label :class="{ invalid: fieldErrors.listing_status }">Status sumber listing<input v-model="productForm.listing_status" maxlength="120" placeholder="Referensi saja" /><small v-if="fieldErrors.listing_status" class="field-error">{{ fieldErrors.listing_status }}</small></label>
                <label class="full-field" :class="{ invalid: fieldErrors.source_url }">URL sumber produk<input v-model="productForm.source_url" type="url" placeholder="https://..." /><small v-if="fieldErrors.source_url" class="field-error">{{ fieldErrors.source_url }}</small></label>
                <label :class="{ invalid: fieldErrors.price_min }">Harga referensi terendah<input v-model="productForm.price_min" type="number" min="0" step="1" placeholder="Opsional" /><small v-if="fieldErrors.price_min" class="field-error">{{ fieldErrors.price_min }}</small></label>
                <label :class="{ invalid: fieldErrors.price_max }">Harga referensi tertinggi<input v-model="productForm.price_max" type="number" min="0" step="1" placeholder="Opsional" /><small v-if="fieldErrors.price_max" class="field-error">{{ fieldErrors.price_max }}</small></label>
              </div>
            </details>
            <p class="form-hint"><ShieldCheck :size="15" /> Brand adalah pembuat produk; supplier adalah sumber pembelian. Stok awal dicatat lewat pergerakan stok, bukan diketik langsung.</p>
          </div>
          <div class="modal-actions"><button type="button" class="button secondary" @click="productModalOpen = false">Batal</button><button type="submit" class="button primary" :disabled="busy"><Check :size="16" /> {{ busy ? 'Menyimpan...' : 'Simpan produk' }}</button></div>
        </form>
      </section>
    </div>

    <div v-if="supplierModalOpen" class="modal-backdrop" @click.self="supplierModalOpen = false">
      <section class="modal-card supplier-modal" role="dialog" aria-modal="true" aria-labelledby="supplier-modal-title">
        <header class="modal-header"><div><div class="eyebrow muted-eyebrow">SUPPLIER CONTACTS</div><h2 id="supplier-modal-title">{{ editingSupplier ? 'Edit supplier' : 'Tambah supplier' }}</h2></div><button class="icon-button subtle" type="button" title="Tutup" aria-label="Tutup" @click="supplierModalOpen = false"><X :size="18" /></button></header>
        <form class="modal-form" @submit.prevent="saveSupplier">
          <div class="modal-body">
            <div v-if="formError" class="notice error-notice" role="alert"><AlertTriangle :size="17" />{{ formError }}</div>
            <div class="form-grid">
              <label class="full-field" :class="{ invalid: fieldErrors.name }">Nama toko / distributor<input v-model="supplierForm.name" required maxlength="150" placeholder="Contoh: Toko Keyboard Indonesia" /><small v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</small></label>
              <label :class="{ invalid: fieldErrors.contact_person }">Nama kontak<input v-model="supplierForm.contact_person" maxlength="120" placeholder="Opsional" /><small v-if="fieldErrors.contact_person" class="field-error">{{ fieldErrors.contact_person }}</small></label>
              <label :class="{ invalid: fieldErrors.phone }">Nomor telepon<input v-model="supplierForm.phone" type="tel" maxlength="40" placeholder="+62..." /><small v-if="fieldErrors.phone" class="field-error">{{ fieldErrors.phone }}</small></label>
              <label :class="{ invalid: fieldErrors.email }">Email<input v-model="supplierForm.email" type="email" maxlength="190" placeholder="kontak@toko.id" /><small v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</small></label>
              <label :class="{ invalid: fieldErrors.city }">Kota<input v-model="supplierForm.city" maxlength="100" placeholder="Opsional" /><small v-if="fieldErrors.city" class="field-error">{{ fieldErrors.city }}</small></label>
              <label class="full-field" :class="{ invalid: fieldErrors.website }">Situs / katalog<input v-model="supplierForm.website" type="url" placeholder="https://..." /><small v-if="fieldErrors.website" class="field-error">{{ fieldErrors.website }}</small></label>
              <label class="full-field" :class="{ invalid: fieldErrors.notes }">Catatan<textarea v-model="supplierForm.notes" rows="3" maxlength="500" placeholder="Syarat pembelian, waktu pengiriman, dan catatan lain"></textarea><small v-if="fieldErrors.notes" class="field-error">{{ fieldErrors.notes }}</small></label>
            </div>
            <p class="form-hint"><Truck :size="15" /> Kontak tidak dibuat otomatis. Isi hanya informasi supplier yang sudah diketahui.</p>
          </div>
          <div class="modal-actions"><button type="button" class="button secondary" @click="supplierModalOpen = false">Batal</button><button type="submit" class="button primary" :disabled="busy"><Check :size="16" /> {{ busy ? 'Menyimpan...' : 'Simpan supplier' }}</button></div>
        </form>
      </section>
    </div>

    <div v-if="movementModalOpen" class="modal-backdrop" @click.self="movementModalOpen = false">
      <section class="modal-card movement-modal" role="dialog" aria-modal="true" aria-labelledby="movement-modal-title">
        <header class="modal-header"><div><div class="eyebrow muted-eyebrow">STOCK CONTROL</div><h2 id="movement-modal-title">Catat pergerakan stok</h2></div><button class="icon-button subtle" type="button" title="Tutup" aria-label="Tutup" @click="movementModalOpen = false"><X :size="18" /></button></header>
        <form class="modal-form" @submit.prevent="saveMovement">
          <div class="modal-body">
            <div v-if="formError" class="notice error-notice" role="alert"><AlertTriangle :size="17" />{{ formError }}</div>
            <label :class="{ invalid: fieldErrors.product_id }">Produk<select v-model="movementForm.product_id" required><option value="" disabled>Pilih produk</option><option v-for="product in catalog" :key="product.id" :value="String(product.id)">{{ product.name }} · {{ formatNumber(product.warehouse_stock) }} unit</option></select><small v-if="fieldErrors.product_id" class="field-error">{{ fieldErrors.product_id }}</small></label>
            <div class="movement-type-picker" role="radiogroup" aria-label="Jenis pergerakan"><button v-for="type in [{id:'IN',label:'Stok masuk',icon:ArrowDownToLine},{id:'OUT',label:'Stok keluar',icon:ArrowUpFromLine},{id:'ADJUSTMENT',label:'Penyesuaian',icon:ArrowDownUp}]" :key="type.id" type="button" role="radio" :aria-checked="movementForm.movement_type === type.id" class="movement-type-option" :class="[{ selected: movementForm.movement_type === type.id }, `kind-${type.id.toLowerCase()}`]" @click="setMovementType(type.id)"><component :is="type.icon" :size="17" /><span>{{ type.label }}</span></button></div>
            <div class="reason-field" :class="{ invalid: fieldErrors.reason }"><span id="reason-label">Alasan</span><div class="reason-picker" role="radiogroup" aria-labelledby="reason-label"><button v-for="option in reasonsFor(movementForm.movement_type)" :key="option.id" type="button" role="radio" :aria-checked="movementForm.reason === option.id" :class="{ active: movementForm.reason === option.id }" @click="movementForm.reason = option.id">{{ option.label }}</button></div><small v-if="fieldErrors.reason" class="field-error">{{ fieldErrors.reason }}</small></div>
            <label :class="{ invalid: fieldErrors.quantity }">{{ movementForm.movement_type === 'ADJUSTMENT' ? 'Jumlah saldo setelah penyesuaian' : 'Jumlah unit' }}<input v-model="movementForm.quantity" type="number" min="0" step="1" inputmode="numeric" required :placeholder="movementForm.movement_type === 'ADJUSTMENT' ? 'Masukkan saldo akhir' : 'Masukkan jumlah unit'" /><small v-if="fieldErrors.quantity" class="field-error">{{ fieldErrors.quantity }}</small></label>
            <div v-if="selectedMovementProduct" class="stock-preview" :class="{ invalid: movementPreview?.invalid }" aria-live="polite">
              <div><span>Stok sekarang</span><strong>{{ formatNumber(selectedMovementProduct.warehouse_stock) }} <small>unit</small></strong></div>
              <span class="stock-preview-arrow">→</span>
              <div><span>Setelah disimpan</span><strong>{{ movementPreview ? formatNumber(movementPreview.after) : '—' }} <small v-if="movementPreview">unit</small></strong></div>
              <p v-if="movementPreview?.invalid">Stok keluar melebihi stok yang tersedia.</p>
            </div>
            <div v-if="selectedMovementProduct && movementPreview && !movementPreview.invalid" class="value-preview" aria-live="polite">
              <template v-if="movementPreview.value">
                <div><span>{{ movementPreview.value.label }}</span><strong :class="`${movementPreview.value.tone}-value`">{{ formatValue(movementPreview.value, selectedMovementProduct.currency) }}</strong></div>
                <div v-if="movementPreview.value.profit != null"><span>Laba kotor</span><strong :class="movementPreview.value.profit >= 0 ? 'positive-value' : 'negative-value'">{{ formatSignedMoney(movementPreview.value.profit, selectedMovementProduct.currency) }}</strong></div>
                <p>Dihitung dari {{ ['SALE', 'RETURN_IN'].includes(movementForm.reason) ? 'harga jual' : 'harga beli' }} {{ formatMoney(['SALE', 'RETURN_IN'].includes(movementForm.reason) ? selectedMovementProduct.selling_price : selectedMovementProduct.purchase_price, selectedMovementProduct.currency) }}/unit. Harga disimpan bersama catatan ini.</p>
              </template>
              <p v-else>Nilai rupiah tidak dihitung karena {{ ['SALE', 'RETURN_IN'].includes(movementForm.reason) ? 'harga jual' : 'harga beli' }} produk belum diisi.</p>
            </div>
            <label :class="{ invalid: fieldErrors.note }">Catatan<textarea v-model="movementForm.note" rows="3" maxlength="500" placeholder="Contoh: nomor nota, nama pelanggan, atau kondisi barang"></textarea><small v-if="fieldErrors.note" class="field-error">{{ fieldErrors.note }}</small></label>
            <p class="form-hint"><ShieldCheck :size="15" /> Perubahan saldo menyimpan stok sebelum/sesudah, pengguna, dan waktu.</p>
          </div>
          <div class="modal-actions"><button type="button" class="button secondary" @click="movementModalOpen = false">Batal</button><button type="submit" class="button primary" :disabled="busy || movementPreview?.invalid"><Check :size="16" /> {{ busy ? 'Mencatat...' : 'Simpan pergerakan' }}</button></div>
        </form>
      </section>
    </div>

    <ProductDetailModal
      v-if="detailProductId"
      :product-id="detailProductId"
      :is-admin="isAdmin"
      @close="closeProductDetail"
      @edit="editFromDetail"
      @record="recordFromDetail"
      @changed="loadAll({ clear: false })"
      @busy="setDetailBusy"
    />

    <div v-if="pendingConfirmation" class="modal-backdrop confirmation-backdrop" @click.self="cancelPendingConfirmation">
      <section class="modal-card confirmation-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" :aria-busy="busy">
        <div class="confirm-icon"><AlertTriangle :size="21" /></div>
        <div class="confirm-copy"><div class="panel-kicker">KONFIRMASI AKSI</div><h2 id="confirmation-title">{{ pendingConfirmation.title }}</h2><p>{{ pendingConfirmation.message }}</p></div>
        <div class="modal-actions"><button type="button" class="button secondary" :disabled="busy" @click="cancelPendingConfirmation">Batal</button><button type="button" class="button danger-button" :disabled="busy" @click="confirmPendingAction"><AlertTriangle :size="16" />{{ busy ? (pendingConfirmation.busyLabel ?? 'Mengarsipkan...') : pendingConfirmation.confirmLabel }}</button></div>
      </section>
    </div>
  </div>
</template>
