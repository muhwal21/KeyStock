# KeyStock

KeyStock adalah aplikasi inventaris keyboard mekanis dan aksesori. Antarmuka memakai Vue 3, API memakai Node.js dan Express, dan data disimpan di MySQL.

## Fitur

- Ringkasan stok, aktivitas terbaru, peta rak, dan laporan laba rugi.
- CRUD produk dan supplier dengan pencarian, filter, dan galeri foto.
- Pergerakan stok masuk, keluar, dan penyesuaian dengan riwayat saldo.
- Peran admin dan staff, autentikasi JWT, dan validasi API.
- Tampilan terang/gelap dan responsif.

## Susunan folder

```text
client/                 antarmuka Vue dan gambar produk
server/                 Express API, model, validasi, dan layanan inventaris
database/               skema MySQL dan dump demo
scripts/                utilitas aset
screenshots/             tangkapan layar fitur aplikasi
Dockerfile               image aplikasi untuk VPS
docker-compose.yml       aplikasi, MySQL privat, dan HTTPS Caddy
compose.dev.yml          MySQL lokal untuk pengembangan
```

## Menjalankan di komputer lokal

Persyaratan: Node.js 24, npm, Docker, dan Docker Compose.

1. Salin `.env.example` menjadi `.env`.
2. Isi `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_SECRET`, dan `SEED_ADMIN_PASSWORD` dengan nilai rahasia milikmu. Buat JWT secret dengan `openssl rand -hex 32`. Jangan kirim atau commit file `.env`.
3. Jalankan:

   ```bash
   npm ci
   docker compose -f compose.dev.yml up -d mysql
   npm run db:sync
   npm run db:seed
   npm run dev
   ```

4. Buka `http://localhost:5173`.

Akun admin demo dibuat dari `SEED_ADMIN_*` di `.env`. Akun dosen dan staff bersifat opsional; biarkan email dan password-nya kosong jika tidak diperlukan. `npm run db:fresh` menghapus lalu membuat ulang tabel demo—jangan jalankan pada database berisi data penting.

## Deploy ke VPS

Compose utama menjalankan aplikasi, MySQL tanpa port publik, serta Caddy untuk HTTPS otomatis.

1. Arahkan DNS record `A` domain ke alamat IPv4 VPS. Izinkan port TCP `22`, `80`, dan `443` pada firewall VPS. Jangan buka port MySQL `3306` ke internet.
2. Pasang Docker Engine dan Docker Compose di VPS, lalu jalankan `git clone https://github.com/muhwal21/KeyStock.git`.
3. Buat `.env` dari `.env.example`. Isi domain yang benar, password database yang kuat, `JWT_SECRET` baru, email admin, dan password admin. Untuk produksi gunakan password unik; jangan pakai nilai contoh.
4. Jalankan stack dan siapkan tabel/data awal:

   ```bash
   docker compose up -d --build
   docker compose exec app npm run db:sync
   docker compose exec app npm run db:seed
   ```

5. Setelah DNS mengarah ke VPS dan port `80`/`443` dapat diakses, Caddy akan meminta sertifikat HTTPS untuk domain tersebut.

Untuk menerapkan perubahan berikutnya, jalankan `git pull` lalu `docker compose up -d --build`. Backup MySQL secara berkala dan simpan salinannya di luar VPS. Volume Docker menjaga data saat container diperbarui, tetapi bukan pengganti backup.

`database/keystock-demo.sql` berisi perintah reset tabel dan data demo. Impor hanya ke database kosong atau database demo yang memang boleh ditimpa.

## Keamanan

JWT disimpan dalam cookie `HttpOnly`; request yang mengubah data juga memerlukan token CSRF. Di produksi cookie memakai `Secure` dan hanya dikirim melalui HTTPS. Atur `JWT_SECRET` dan password database yang berbeda untuk setiap lingkungan.

## Screenshot

Contoh layar aplikasi ada di [`screenshots/`](screenshots/). Foto produk katalog bersumber dari Noir Gear dan Work Louder; pastikan izin penggunaan aset sebelum memakainya untuk toko yang dipublikasikan.
