<script setup>
import { ref } from 'vue';

const apiStatus = ref('Belum diperiksa');
const checkingApi = ref(false);

async function checkApi() {
  checkingApi.value = true;
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('API belum merespons.');
    const result = await response.json();
    apiStatus.value = result.status === 'ok' ? 'API terhubung' : 'API belum siap';
  } catch {
    apiStatus.value = 'API belum terhubung';
  } finally {
    checkingApi.value = false;
  }
}
</script>

<template>
  <main class="page-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="KeyStock beranda">
        <span class="brand-mark">K</span>
        <span class="brand-name">KEYSTOCK</span>
      </a>
      <span class="topbar-note">MECHANICAL KEYBOARD INVENTORY</span>
    </header>

    <section class="welcome-card" aria-labelledby="welcome-title">
      <div class="eyebrow"><span class="status-dot"></span> RUANG KERJA INVENTARIS</div>
      <h1 id="welcome-title">Stok rapi,<br /><span>kerja lebih mudah.</span></h1>
      <p class="welcome-copy">
        KeyStock membantu mencatat produk keyboard mechanical, supplier, dan pergerakan stok dalam satu tempat.
      </p>
      <div class="setup-row">
        <button class="check-button" type="button" :disabled="checkingApi" @click="checkApi">
          {{ checkingApi ? 'Memeriksa…' : 'Periksa koneksi API' }}
        </button>
        <span class="api-status" :class="{ connected: apiStatus === 'API terhubung' }" role="status">
          <span class="status-dot"></span>{{ apiStatus }}
        </span>
      </div>
      <div class="card-footer"><span>TAHAP 1</span><span>Fondasi aplikasi</span></div>
    </section>

    <footer class="page-footer">KEYSTOCK <span>·</span> INVENTARIS KOMPONEN DAN PERANGKAT KEYBOARD</footer>
  </main>
</template>
