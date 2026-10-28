# KeyStock

Sistem inventaris untuk mechanical keyboard, switch, keycaps, dan aksesori. Stack yang dipakai adalah Vue 3, Node.js + Express, dan MySQL.

Proyek ini sedang dibangun bertahap. Tahap pertama menyediakan kerangka aplikasi, tampilan awal, dan endpoint pemeriksaan API. Fitur produk, supplier, serta pencatatan stok akan ditambahkan pada tahap berikutnya.

## Menjalankan tahap pertama

1. Gunakan Node.js 24.
2. Salin `.env.example` menjadi `.env`, lalu isi password database dan `SESSION_SECRET` lokal.
3. Jalankan `npm install`.
4. Jalankan `npm run dev`.
5. Buka `http://localhost:5173` dan tekan **Periksa koneksi API**.

Endpoint `GET /api/health` akan merespons `{"status":"ok"}`. MySQL disiapkan lewat `docker compose up -d mysql`; koneksi database akan diimplementasikan pada tahap berikutnya.
