<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  ArrowDownUp, ChevronLeft, ChevronRight, ExternalLink, ImagePlus, MessageCircle, Phone, Settings,
  Star, Trash2, X,
} from '@lucide/vue';
import { get, put, remove, upload } from '../api.js';
import {
  describeLocation, formatDate, formatMoney, formatNumber, formatPercent, formatSignedMoney,
  onImageError, PLACEHOLDER_IMAGE, pricing, reasonLabel, stockState, telUrl, whatsappUrl,
} from '../utils/format.js';

// Product detail dialog: photo gallery (admins can manage the slides), prices and
// profit, stock figures for the last 30 days, recent movements, and supplier contact.
const props = defineProps({
  productId: { type: [Number, String], required: true },
  isAdmin: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'edit', 'record', 'changed', 'busy']);

const MAX_BYTES = 2 * 1024 * 1024;
const loading = ref(true);
const errorMessage = ref('');
const notice = ref('');
const product = ref(null);
const movements = ref([]);
const stats = ref(null);
const activeIndex = ref(0);
const managing = ref(false);
const busy = ref(false);
const pendingDelete = ref(null);
const fileInput = ref(null);

const images = computed(() => product.value?.images ?? []);
const currentImage = computed(() => images.value[activeIndex.value] ?? null);
const money = computed(() => (product.value ? pricing(product.value) : null));
const status = computed(() => (product.value ? stockState(product.value) : null));
const currency = computed(() => product.value?.currency ?? 'IDR');
const supplier = computed(() => product.value?.supplier ?? null);

function setBusy(value) {
  busy.value = value;
  emit('busy', value);
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const data = await get(`/products/${props.productId}`);
    product.value = data.product;
    movements.value = data.movements;
    stats.value = data.stats;
    if (activeIndex.value >= images.value.length) activeIndex.value = 0;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

function showImage(index) {
  const count = images.value.length;
  if (!count) return;
  activeIndex.value = (index + count) % count;
  pendingDelete.value = null;
}

async function saveOrder(ids, nextIndex) {
  setBusy(true);
  notice.value = '';
  try {
    const data = await put(`/products/${props.productId}/images/order`, { ids });
    product.value.images = data.images;
    activeIndex.value = nextIndex;
    emit('changed');
  } catch (error) {
    notice.value = error.message;
  } finally {
    setBusy(false);
  }
}

function moveImage(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= images.value.length) return;
  const ids = images.value.map((image) => image.id);
  [ids[index], ids[target]] = [ids[target], ids[index]];
  saveOrder(ids, target);
}

function makePrimary(index) {
  if (index === 0) return;
  const ids = images.value.map((image) => image.id);
  ids.unshift(...ids.splice(index, 1));
  saveOrder(ids, 0);
}

async function deleteImage(image) {
  if (pendingDelete.value !== image.id) {
    pendingDelete.value = image.id;
    return;
  }
  setBusy(true);
  notice.value = '';
  try {
    await remove(`/products/${props.productId}/images/${image.id}`);
    pendingDelete.value = null;
    await load();
    emit('changed');
  } catch (error) {
    notice.value = error.message;
  } finally {
    setBusy(false);
  }
}

async function uploadFiles(event) {
  const files = [...(event.target.files ?? [])];
  event.target.value = '';
  if (!files.length) return;
  setBusy(true);
  notice.value = '';
  let uploaded = 0;
  try {
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        notice.value = `${file.name}: hanya JPG, PNG, atau WebP.`;
        continue;
      }
      if (file.size > MAX_BYTES) {
        notice.value = `${file.name}: ukuran maksimal 2 MB.`;
        continue;
      }
      await upload(`/products/${props.productId}/images`, file);
      uploaded += 1;
    }
  } catch (error) {
    notice.value = error.message;
  } finally {
    if (uploaded) {
      await load();
      activeIndex.value = images.value.length - 1;
      emit('changed');
    }
    setBusy(false);
  }
}

function onKeydown(event) {
  if (event.key === 'Escape' && !busy.value) emit('close');
  if (event.target.closest?.('input, textarea, select')) return;
  if (event.key === 'ArrowLeft') showImage(activeIndex.value - 1);
  if (event.key === 'ArrowRight') showImage(activeIndex.value + 1);
}

watch(() => props.productId, () => {
  activeIndex.value = 0;
  managing.value = false;
  load();
});
onMounted(() => {
  load();
  window.addEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="modal-backdrop" @click.self="!busy && emit('close')">
    <section class="modal-card detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div v-if="loading && !product" class="detail-skeleton" role="status" aria-label="Memuat detail produk">
        <div class="detail-skeleton-gallery" aria-hidden="true">
          <span class="skeleton detail-skeleton-image"></span>
          <div class="detail-skeleton-thumbs"><span v-for="item in 4" :key="item" class="skeleton"></span></div>
        </div>
        <div class="detail-skeleton-info" aria-hidden="true">
          <span class="skeleton skeleton-line line-short"></span><span class="skeleton skeleton-line line-title"></span>
          <span class="skeleton skeleton-line line-pills"></span><span class="skeleton skeleton-line line-description"></span>
          <span class="skeleton skeleton-line line-section"></span>
          <div class="detail-skeleton-prices"><span v-for="item in 6" :key="item" class="skeleton"></span></div>
          <span class="skeleton skeleton-line line-section"></span>
          <div class="detail-skeleton-stats"><span v-for="item in 4" :key="item" class="skeleton"></span></div>
          <span class="skeleton skeleton-line line-section"></span>
          <span class="skeleton skeleton-line line-history"></span><span class="skeleton skeleton-line line-history"></span>
        </div>
        <span class="visually-hidden">Memuat detail produk...</span>
      </div>
      <div v-else-if="errorMessage && !product" class="detail-error">
        <div class="notice error-notice">{{ errorMessage }}</div>
        <button class="button secondary" type="button" @click="emit('close')">Tutup</button>
      </div>

      <div v-else-if="product" class="detail-layout">
        <div class="detail-gallery">
          <button class="icon-button subtle detail-close-mobile" type="button" title="Tutup" aria-label="Tutup" :disabled="busy" @click="emit('close')"><X :size="18" /></button>
          <div class="gallery-main">
            <img :src="currentImage?.url ?? PLACEHOLDER_IMAGE" :alt="`Foto ${product.name}`" @error="onImageError" />
            <span v-if="images.length && activeIndex === 0" class="gallery-badge">Foto utama</span>
            <template v-if="images.length > 1">
              <button class="gallery-nav prev" type="button" aria-label="Foto sebelumnya" @click="showImage(activeIndex - 1)"><ChevronLeft :size="20" /></button>
              <button class="gallery-nav next" type="button" aria-label="Foto berikutnya" @click="showImage(activeIndex + 1)"><ChevronRight :size="20" /></button>
            </template>
            <span v-if="images.length" class="gallery-count">{{ activeIndex + 1 }} / {{ images.length }}</span>
          </div>

          <div class="gallery-thumbs">
            <div v-for="(image, index) in images" :key="image.id" class="thumb" :class="{ active: index === activeIndex }">
              <button type="button" class="thumb-image" :aria-label="`Lihat foto ${index + 1}`" @click="showImage(index)"><img :src="image.url" alt="" loading="lazy" @error="onImageError" /></button>
              <div v-if="managing" class="thumb-tools">
                <button type="button" :disabled="busy || index === 0" title="Geser ke kiri" aria-label="Geser ke kiri" @click="moveImage(index, -1)"><ChevronLeft :size="14" /></button>
                <button type="button" :disabled="busy || index === 0" :class="{ on: index === 0 }" title="Jadikan foto utama" aria-label="Jadikan foto utama" @click="makePrimary(index)"><Star :size="13" /></button>
                <button type="button" :disabled="busy || index === images.length - 1" title="Geser ke kanan" aria-label="Geser ke kanan" @click="moveImage(index, 1)"><ChevronRight :size="14" /></button>
                <button type="button" :disabled="busy" class="danger" :class="{ confirm: pendingDelete === image.id }" :title="pendingDelete === image.id ? 'Klik lagi untuk menghapus' : 'Hapus foto'" :aria-label="pendingDelete === image.id ? 'Konfirmasi hapus foto' : 'Hapus foto'" @click="deleteImage(image)"><Trash2 :size="13" /></button>
              </div>
            </div>
            <button v-if="managing && images.length < 8" type="button" class="thumb thumb-add" :disabled="busy" @click="fileInput?.click()">
              <ImagePlus :size="18" /><span>{{ busy ? 'Mengunggah...' : 'Tambah foto' }}</span>
            </button>
            <input ref="fileInput" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple @change="uploadFiles" />
          </div>

          <p v-if="notice" class="gallery-notice">{{ notice }}</p>
          <p v-if="managing" class="gallery-hint">JPG, PNG, atau WebP, maks. 2 MB, sampai 8 foto. Foto pertama jadi foto utama di tabel. Klik ikon tempat sampah dua kali untuk menghapus.</p>
          <p v-else-if="!images.length" class="gallery-hint">Belum ada foto.{{ isAdmin ? ' Klik "Kelola foto" untuk menambahkan.' : '' }}</p>
        </div>

        <div class="detail-info">
          <header class="detail-head">
            <div>
              <div class="detail-kicker">#{{ product.sku }} · {{ product.category?.name ?? 'Tanpa kategori' }} · {{ product.brand }}</div>
              <h2 id="detail-title">{{ product.name }}</h2>
              <div class="detail-pills">
                <span class="stock-badge" :class="status.tone"><span></span>{{ status.label }}</span>
                <span class="location-tag">{{ describeLocation(product.storage_location) }}</span>
                <span class="location-tag">Min. {{ formatNumber(product.reorder_point) }} unit</span>
              </div>
            </div>
            <button class="icon-button subtle" type="button" title="Tutup" aria-label="Tutup" :disabled="busy" @click="emit('close')"><X :size="18" /></button>
          </header>

          <p v-if="product.description" class="detail-description">{{ product.description }}</p>

          <section class="detail-section">
            <h3>Harga &amp; laba</h3>
            <div class="price-grid">
              <div class="price-cell"><small>Harga beli</small><strong :class="{ 'is-empty': money.cost == null }">{{ formatMoney(money.cost, currency, 'Belum diisi') }}</strong></div>
              <div class="price-cell"><small>Harga jual</small><strong :class="{ 'is-empty': money.price == null }">{{ formatMoney(money.price, currency, 'Belum diisi') }}</strong></div>
              <div class="price-cell"><small>Laba / unit</small><strong :class="money.unitProfit == null ? 'is-empty' : money.unitProfit >= 0 ? 'positive-value' : 'negative-value'">{{ money.unitProfit == null ? '—' : formatSignedMoney(money.unitProfit, currency) }}</strong><em v-if="money.margin != null" :class="money.margin >= 0 ? 'positive-value' : 'negative-value'">margin {{ formatPercent(money.margin) }}</em></div>
              <div class="price-cell"><small>Nilai stok (modal)</small><strong>{{ formatMoney(money.stockCost, currency, '—') }}</strong></div>
              <div class="price-cell"><small>Potensi penjualan</small><strong>{{ formatMoney(money.stockRetail, currency, '—') }}</strong></div>
              <div class="price-cell"><small>Potensi laba</small><strong :class="money.potentialProfit == null ? 'is-empty' : money.potentialProfit >= 0 ? 'positive-value' : 'negative-value'">{{ money.potentialProfit == null ? '—' : formatSignedMoney(money.potentialProfit, currency) }}</strong></div>
            </div>
            <p v-if="money.cost == null || money.price == null" class="detail-hint">Isi harga beli dan harga jual lewat "Edit produk" untuk menghitung laba.</p>
          </section>

          <section class="detail-section">
            <h3>Stok &amp; {{ stats?.days ?? 30 }} hari terakhir</h3>
            <dl class="detail-kv">
              <div><dt>Stok</dt><dd><span class="stock-count" :class="status.tone">{{ formatNumber(product.warehouse_stock) }} unit</span></dd></div>
              <div><dt>Terjual</dt><dd>{{ formatNumber(stats?.unitsSold) }} unit</dd></div>
              <div><dt>Laba terealisasi</dt><dd :class="(stats?.grossProfit ?? 0) >= 0 ? 'positive-value' : 'negative-value'">{{ formatSignedMoney(stats?.grossProfit, currency) }}</dd></div>
              <div><dt>Rugi (rusak/hilang)</dt><dd :class="stats?.stockLoss ? 'negative-value' : ''">{{ stats?.stockLoss ? formatSignedMoney(-stats.stockLoss, currency) : formatMoney(0, currency) }}</dd></div>
            </dl>
          </section>

          <section class="detail-section">
            <h3>Riwayat terakhir</h3>
            <ul v-if="movements.length" class="detail-history">
              <li v-for="item in movements.slice(0, 4)" :key="item.id">
                <span class="status-pill" :class="`kind-${item.movement_type.toLowerCase()}`">{{ reasonLabel(item.reason) }}</span>
                <strong :class="item.movement_type === 'IN' ? 'positive-value' : item.movement_type === 'OUT' ? 'negative-value' : ''">{{ item.movement_type === 'IN' ? '+' : item.movement_type === 'OUT' ? '−' : '→ ' }}{{ formatNumber(item.movement_type === 'ADJUSTMENT' ? item.stock_after : item.quantity) }}</strong>
                <span class="detail-history-user">{{ item.user?.name }}</span>
                <small>{{ formatDate(item.createdAt ?? item.created_at) }}</small>
              </li>
            </ul>
            <p v-else class="detail-hint">Belum ada pergerakan stok.</p>
          </section>

          <section class="detail-section">
            <h3>Supplier</h3>
            <div class="supplier-strip">
              <div class="avatar">{{ (supplier?.name ?? '?').slice(0, 1).toUpperCase() }}</div>
              <div class="supplier-strip-name"><small>{{ supplier?.name ?? 'Belum ditentukan' }}</small><strong>{{ supplier?.phone || supplier?.email || 'Kontak belum dicatat' }}</strong></div>
              <a v-if="whatsappUrl(supplier?.phone)" class="wa-button" :href="whatsappUrl(supplier.phone)" target="_blank" rel="noopener noreferrer" :aria-label="`WhatsApp ${supplier.name}`"><MessageCircle :size="16" /> WhatsApp</a>
              <a class="round-button" :class="{ disabled: !telUrl(supplier?.phone) }" :href="telUrl(supplier?.phone) ?? undefined" :title="supplier?.phone ? `Telepon ${supplier.phone}` : 'Nomor telepon belum dicatat'" :aria-label="supplier?.phone ? `Telepon ${supplier.name}` : 'Nomor telepon belum dicatat'"><Phone :size="16" /></a>
            </div>
          </section>

          <footer class="detail-actions">
            <button class="button primary" type="button" @click="emit('record', product)"><ArrowDownUp :size="16" /> Catat stok</button>
            <button v-if="isAdmin" class="button secondary" type="button" @click="emit('edit', product)"><Settings :size="16" /> Edit produk</button>
            <button v-if="isAdmin" class="button secondary" :class="{ 'is-active': managing }" type="button" @click="managing = !managing; pendingDelete = null"><ImagePlus :size="16" /> {{ managing ? 'Selesai kelola foto' : 'Kelola foto' }}</button>
            <a v-if="product.source_url" class="button secondary" :href="product.source_url" target="_blank" rel="noopener noreferrer"><ExternalLink :size="16" /> Sumber</a>
          </footer>
        </div>
      </div>
    </section>
  </div>
</template>
