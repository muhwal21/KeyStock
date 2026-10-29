<script setup>
defineProps({
  page: { type: String, default: 'overview' },
});
</script>

<template>
  <div class="loading-screen" role="status" aria-label="Memuat halaman KeyStock">
    <div class="boot-skeleton" aria-hidden="true">
      <header class="boot-header">
        <div class="boot-brand"><span class="skeleton boot-brand-mark"></span><span class="skeleton boot-brand-name"></span></div>
        <nav class="boot-nav"><span v-for="item in 5" :key="item" class="skeleton boot-nav-item"></span></nav>
        <div class="boot-header-actions"><span v-for="item in 3" :key="item" class="skeleton boot-header-action"></span></div>
      </header>

      <main class="boot-page">
        <template v-if="page === 'overview'">
          <div class="boot-dashboard-head">
            <div class="boot-page-copy"><span class="skeleton boot-page-title"></span><span class="skeleton boot-page-description"></span></div>
            <div class="boot-stat-grid boot-stat-grid--overview">
              <div v-for="item in 3" :key="item" class="boot-stat-card boot-kpi-stat">
                <span class="skeleton boot-stat-icon"></span>
                <span class="boot-stat-copy"><span class="skeleton boot-stat-label"></span><span class="skeleton boot-stat-value"></span></span>
                <span class="skeleton boot-stat-note"></span>
              </div>
            </div>
          </div>
          <section class="boot-panel boot-overview-toolbar">
            <span class="skeleton boot-toolbar-icon"></span><span class="boot-toolbar-copy"><span class="skeleton boot-line-medium"></span><span class="skeleton boot-line-short"></span></span>
            <span class="skeleton boot-toolbar-alert"></span><span class="skeleton boot-button"></span><span class="skeleton boot-button boot-button-primary"></span>
          </section>
          <div class="boot-overview-grid">
            <section class="boot-panel boot-analytics-panel">
              <div class="boot-panel-heading"><span class="skeleton boot-panel-title"></span><span class="skeleton boot-panel-action"></span></div>
              <div class="boot-chart"><span v-for="cell in 56" :key="cell" class="skeleton boot-chart-cell"></span></div>
            </section>
            <section class="boot-panel boot-rack-panel">
              <div class="boot-panel-heading"><span class="skeleton boot-panel-title"></span><span class="skeleton boot-panel-action"></span></div>
              <div class="boot-rack-row"><span v-for="item in 7" :key="item" class="skeleton"></span></div>
              <div class="boot-rack-row"><span v-for="item in 7" :key="item" class="skeleton"></span></div>
              <div class="boot-rack-row boot-rack-row-small"><span v-for="item in 6" :key="item" class="skeleton"></span></div>
            </section>
          </div>
          <div class="boot-lower-grid">
            <section class="boot-panel boot-list-panel">
              <div class="boot-panel-heading"><span class="skeleton boot-panel-title"></span><span class="skeleton boot-panel-action"></span></div>
              <div class="boot-priority-columns"><div v-for="column in 2" :key="column" class="boot-priority-column"><span v-for="row in 3" :key="row" class="skeleton boot-list-row"></span></div></div>
            </section>
            <section class="boot-panel boot-finance-panel">
              <div class="boot-panel-heading"><span class="skeleton boot-panel-title"></span><span class="skeleton boot-panel-action"></span></div>
              <span class="skeleton boot-finance-total"></span><span class="skeleton boot-finance-bar"></span>
              <span v-for="row in 4" :key="row" class="skeleton boot-finance-row"></span>
            </section>
          </div>
          <section class="boot-panel boot-activity-panel">
            <div class="boot-panel-heading"><span class="skeleton boot-panel-title"></span><span class="skeleton boot-panel-action"></span></div>
            <div class="boot-table-scroll">
              <div class="boot-table-head boot-table-head--activity"><span v-for="column in 8" :key="column" class="skeleton"></span></div>
              <div v-for="row in 4" :key="row" class="boot-data-row boot-data-row--activity"><span v-for="column in 8" :key="column" class="skeleton"></span></div>
            </div>
          </section>
        </template>

        <template v-else-if="page === 'products'">
          <div class="boot-page-heading"><div class="boot-page-copy"><span class="skeleton boot-page-title"></span><span class="skeleton boot-page-description"></span></div><span class="skeleton boot-button boot-button-primary"></span></div>
          <div class="boot-stat-grid boot-stat-grid--products">
            <div v-for="item in 4" :key="item" class="boot-stat-card boot-product-stat"><span class="skeleton boot-stat-label"></span><span class="skeleton boot-stat-value"></span></div>
          </div>
          <section class="boot-panel boot-table-panel">
            <div class="boot-toolbar"><span class="skeleton boot-search-field"></span><span v-for="filter in 3" :key="filter" class="skeleton boot-filter"></span></div>
            <div class="boot-table-scroll">
              <div class="boot-table-head boot-table-head--products"><span v-for="column in 7" :key="column" class="skeleton"></span></div>
              <div v-for="row in 5" :key="row" class="boot-data-row boot-data-row--products">
                <div class="boot-product-cell"><span class="skeleton boot-product-thumb"></span><span class="boot-product-copy"><span class="skeleton"></span><span class="skeleton"></span></span></div>
                <div class="boot-two-lines"><span class="skeleton"></span><span class="skeleton"></span></div>
                <div class="boot-two-lines"><span class="skeleton"></span><span class="skeleton"></span></div>
                <div class="boot-one-line"><span class="skeleton"></span><span class="skeleton boot-small-line"></span></div>
                <div class="boot-one-line"><span class="skeleton"></span></div>
                <div class="boot-one-line"><span class="skeleton boot-pill"></span></div>
                <div class="boot-action-dots"><span v-for="action in 3" :key="action" class="skeleton"></span></div>
              </div>
            </div>
          </section>
        </template>

        <template v-else-if="page === 'suppliers'">
          <div class="boot-page-heading"><div class="boot-page-copy"><span class="skeleton boot-page-title"></span><span class="skeleton boot-page-description"></span></div><span class="skeleton boot-button boot-button-primary"></span></div>
          <div class="boot-stat-grid boot-stat-grid--summary">
            <div v-for="item in 3" :key="item" class="boot-stat-card boot-summary-stat"><span class="skeleton boot-stat-icon"></span><span class="boot-stat-copy"><span class="skeleton boot-stat-label"></span><span class="skeleton boot-stat-value"></span></span></div>
          </div>
          <div class="boot-supplier-grid">
            <section v-for="card in 2" :key="card" class="boot-panel boot-supplier-card">
              <div class="boot-supplier-head"><span class="skeleton boot-supplier-icon"></span><span class="skeleton boot-pill"></span><span class="boot-action-dots"><span v-for="action in 2" :key="action" class="skeleton"></span></span></div>
              <span class="skeleton boot-supplier-title"></span><span class="skeleton boot-line-medium"></span>
              <div class="boot-contact-block"><span v-for="line in 4" :key="line" class="skeleton"></span></div>
              <span class="skeleton boot-supplier-footer"></span>
            </section>
          </div>
        </template>

        <template v-else-if="page === 'users'">
          <div class="boot-page-heading"><div class="boot-page-copy"><span class="skeleton boot-page-title"></span><span class="skeleton boot-page-description"></span></div></div>
          <div class="boot-stat-grid boot-stat-grid--users">
            <div v-for="item in 5" :key="item" class="boot-stat-card boot-summary-stat"><span class="skeleton boot-stat-icon"></span><span class="boot-stat-copy"><span class="skeleton boot-stat-label"></span><span class="skeleton boot-stat-value"></span></span></div>
          </div>
          <section class="boot-panel boot-table-panel">
            <div class="boot-table-scroll">
              <div class="boot-table-head boot-table-head--users"><span v-for="column in 6" :key="column" class="skeleton"></span></div>
              <div v-for="row in 4" :key="row" class="boot-data-row boot-data-row--users">
                <div class="boot-user-cell"><span class="skeleton boot-user-avatar"></span><span class="boot-product-copy"><span class="skeleton"></span><span class="skeleton"></span></span></div>
                <span class="skeleton boot-pill"></span><span class="skeleton boot-pill"></span><span class="skeleton boot-user-line"></span><span class="skeleton boot-user-line"></span><span class="skeleton boot-button"></span>
              </div>
            </div>
            <div class="boot-table-footer"><span class="skeleton boot-line-medium"></span><span class="skeleton boot-line-short"></span></div>
          </section>
          <section class="boot-panel boot-access-panel"><span class="skeleton boot-panel-title"></span><span class="skeleton boot-line-medium"></span><div v-for="row in 3" :key="row" class="boot-access-row"><span class="skeleton"></span><span v-for="role in 3" :key="role" class="skeleton boot-pill"></span></div></section>
        </template>

        <template v-else>
          <div class="boot-page-heading"><div class="boot-page-copy"><span class="skeleton boot-page-title"></span><span class="skeleton boot-page-description"></span></div><span class="skeleton boot-button boot-button-primary"></span></div>
          <section class="boot-panel boot-movement-panel">
            <div class="boot-panel-heading boot-movement-heading"><div class="boot-page-copy"><span class="skeleton boot-line-short"></span><span class="skeleton boot-panel-title"></span><span class="skeleton boot-line-medium"></span></div><span class="skeleton boot-panel-action"></span></div>
            <div class="boot-toolbar"><span class="skeleton boot-search-field"></span><span class="skeleton boot-filter boot-filter-wide"></span></div>
            <div class="boot-table-scroll">
              <div class="boot-table-head boot-table-head--movements"><span v-for="column in 8" :key="column" class="skeleton"></span></div>
              <div v-for="row in 5" :key="row" class="boot-data-row boot-data-row--movements"><span class="skeleton boot-pill"></span><span class="boot-two-lines"><span class="skeleton"></span><span class="skeleton"></span></span><span class="skeleton"></span><span class="skeleton"></span><span class="boot-two-lines"><span class="skeleton"></span><span class="skeleton"></span></span><span class="skeleton"></span><span class="skeleton"></span><span class="skeleton"></span></div>
            </div>
          </section>
        </template>
      </main>
    </div>
    <span class="visually-hidden">Memuat data inventaris...</span>
  </div>
</template>
