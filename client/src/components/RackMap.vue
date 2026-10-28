<script setup>
import { computed, ref } from 'vue';
import { parseLocation } from '../utils/format.js';

// Front view of the warehouse shelving. Locations use RAK-TINGKAT-SLOT (e.g. A-1-05):
// each rack is drawn with its posts and shelves, and each product is a box on its slot.
// Box height follows the stock level and the color follows the stock status.
const props = defineProps({
  products: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: '' },
});
const emit = defineEmits(['select']);

// Known racks and their minimum width, so empty slots are visible too.
const RACK_INFO = {
  A: { note: 'Keyboard', slots: 7, levels: 2 },
  B: { note: 'Switch & keycaps', slots: 3, levels: 2 },
  C: { note: 'Aksesori & deskmat', slots: 4, levels: 2 },
};

const rackFilter = ref('');

const placed = computed(() => props.products
  .map((product) => ({ product, location: parseLocation(product.storage_location) }))
  .filter((entry) => entry.location));

const unplacedCount = computed(() => props.products.length - placed.value.length);
const maxStock = computed(() => Math.max(10, ...placed.value.map(({ product }) => Number(product.warehouse_stock))));

const racks = computed(() => {
  const byRack = new Map();
  for (const [id, info] of Object.entries(RACK_INFO)) byRack.set(id, { id, ...info, items: [] });
  for (const entry of placed.value) {
    if (!byRack.has(entry.location.rack)) byRack.set(entry.location.rack, { id: entry.location.rack, note: '', slots: 1, levels: 1, items: [] });
    byRack.get(entry.location.rack).items.push(entry);
  }

  return [...byRack.values()]
    .filter((rack) => rack.items.length || RACK_INFO[rack.id])
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((rack) => {
      const levelCount = Math.max(rack.levels, ...rack.items.map((entry) => entry.location.level));
      const slotCount = Math.max(rack.slots, ...rack.items.map((entry) => entry.location.slot));
      const levels = [];
      for (let level = levelCount; level >= 1; level -= 1) {
        const slots = [];
        for (let slot = 1; slot <= slotCount; slot += 1) {
          const entry = rack.items.find((item) => item.location.level === level && item.location.slot === slot);
          slots.push({ code: `${rack.id}-${level}-${String(slot).padStart(2, '0')}`, product: entry?.product ?? null });
        }
        levels.push({ level, slots });
      }
      return { ...rack, levels, slotCount, filled: rack.items.length, total: levelCount * slotCount };
    });
});

const visibleRacks = computed(() => (rackFilter.value ? racks.value.filter((rack) => rack.id === rackFilter.value) : racks.value));
const totals = computed(() => racks.value.reduce((sum, rack) => ({
  levels: sum.levels + rack.levels.length, slots: sum.slots + rack.total, filled: sum.filled + rack.filled,
}), { levels: 0, slots: 0, filled: 0 }));

function boxState(product) {
  const stock = Number(product.warehouse_stock);
  if (stock === 0) return 'empty';
  if (stock <= Number(product.reorder_point)) return 'low';
  return 'good';
}

function boxHeight(product) {
  const stock = Number(product.warehouse_stock);
  if (stock === 0) return '44px';
  return `${Math.round(44 + (Math.min(stock, maxStock.value) / maxStock.value) * 40)}px`;
}
</script>

<template>
  <div class="rack-map">
    <div class="rack-toolbar">
      <div class="rack-legend">
        <span><i class="good"></i>Aman</span>
        <span><i class="low"></i>Perlu restock</span>
        <span><i class="empty"></i>Habis</span>
        <span><i class="free"></i>Slot kosong</span>
      </div>
      <div class="pill-filters rack-filters" role="tablist" aria-label="Filter rak">
        <button type="button" role="tab" :aria-selected="!rackFilter" :class="{ active: !rackFilter }" @click="rackFilter = ''">Semua rak</button>
        <button v-for="rack in racks" :key="rack.id" type="button" role="tab" :aria-selected="rackFilter === rack.id" :class="{ active: rackFilter === rack.id }" @click="rackFilter = rack.id">Rak {{ rack.id }}</button>
      </div>
    </div>

    <div class="rack-grid" :class="{ single: rackFilter }">
      <div v-for="rack in visibleRacks" :key="rack.id" class="rack" :class="{ wide: rack.slotCount >= 6 }">
        <div class="rack-title"><strong>Rak {{ rack.id }}</strong><span>{{ rack.note }}</span><small>{{ rack.filled }}/{{ rack.total }} slot</small></div>
        <div class="rack-scroll">
          <div class="rack-frame" :style="{ '--slots': rack.slotCount }">
            <div v-for="level in rack.levels" :key="level.level" class="rack-level">
              <span class="rack-level-label">T{{ level.level }}</span>
              <template v-for="slot in level.slots" :key="slot.code">
                <button
                  v-if="slot.product"
                  type="button"
                  class="rack-box"
                  :class="[boxState(slot.product), { selected: String(slot.product.id) === String(selectedId) }]"
                  :style="{ height: boxHeight(slot.product) }"
                  :title="`${slot.product.name} · ${slot.code} · ${slot.product.warehouse_stock} unit`"
                  :aria-label="`${slot.product.name}, rak ${slot.code}, ${slot.product.warehouse_stock} unit. Buka detail.`"
                  @click="emit('select', slot.product.id)"
                >
                  <span class="rack-box-qty">{{ slot.product.warehouse_stock }}<small>unit</small></span>
                  <span class="rack-box-code">{{ slot.code }}</span>
                </button>
                <div v-else class="rack-box free" :title="`${slot.code} kosong`"><span class="rack-box-qty">kosong</span><span class="rack-box-code">{{ slot.code }}</span></div>
              </template>
            </div>
          </div>
        </div>
        <div class="rack-floor"></div>
      </div>
    </div>

    <div class="rack-foot">
      <span>{{ racks.length }} rak · {{ totals.levels }} tingkat · {{ totals.slots }} slot · {{ totals.filled }} terisi<template v-if="unplacedCount"> · {{ unplacedCount }} produk belum punya lokasi</template></span>
      <span>Kode lokasi <strong>RAK-TINGKAT-SLOT</strong>, mis. A-1-05 · klik kardus untuk detail</span>
    </div>
  </div>
</template>
