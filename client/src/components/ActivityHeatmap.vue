<script setup>
import { computed } from 'vue';

// Heatmap of stock transactions per day (columns) and movement type (rows).
const props = defineProps({
  activity: { type: Array, default: () => [] },
  days: { type: Number, default: 14 },
});

const rows = [
  { key: 'in', label: 'Masuk', units: 'unitsIn' },
  { key: 'out', label: 'Keluar', units: 'unitsOut' },
  { key: 'adjustment', label: 'Penyesuaian', units: null },
  { key: 'total', label: 'Semua', units: null },
];

const legend = [
  { level: 0, label: '0' },
  { level: 1, label: '1' },
  { level: 2, label: '2' },
  { level: 3, label: '3–4' },
  { level: 4, label: '5+' },
];

const columns = computed(() => props.activity.slice(-props.days));

function level(count) {
  if (count >= 5) return 4;
  if (count >= 3) return 3;
  return count;
}

function parseDay(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function columnLabel(value, index) {
  const date = parseDay(value);
  if (props.days <= 7) return new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date);
  const step = props.days <= 14 ? 2 : 5;
  const isLast = index === columns.value.length - 1;
  return index % step === 0 || isLast ? String(date.getDate()) : '';
}

function cellTitle(day, row) {
  const date = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }).format(parseDay(day.date));
  const units = row.units ? ` (${day[row.units]} unit)` : '';
  return `${date} · ${row.label}: ${day[row.key]} transaksi${units}`;
}
</script>

<template>
  <div class="heatmap" role="img" :aria-label="`Heatmap transaksi stok ${days} hari terakhir`">
    <div class="heatmap-grid" :style="{ '--columns': columns.length, '--rows': rows.length }">
      <template v-for="row in rows" :key="row.key">
        <span class="heatmap-row-label">{{ row.label }}</span>
        <span
          v-for="day in columns"
          :key="`${row.key}-${day.date}`"
          class="heatmap-cell"
          :class="`level-${level(day[row.key])}`"
          :title="cellTitle(day, row)"
        ></span>
      </template>
      <span></span>
      <span v-for="(day, index) in columns" :key="`label-${day.date}`" class="heatmap-col-label">{{ columnLabel(day.date, index) }}</span>
    </div>
    <div class="heatmap-legend">
      <strong>Transaksi stok</strong>
      <span v-for="item in legend" :key="item.level"><i class="heatmap-cell" :class="`level-${item.level}`"></i>{{ item.label }}</span>
    </div>
  </div>
</template>
