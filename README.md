# KeyStock

KeyStock adalah aplikasi web inventaris gudang untuk keyboard mekanis dan aksesori. Aplikasi memakai Vue 3 untuk antarmuka, Node.js/Express untuk API, Sequelize untuk akses model relasional, dan MySQL untuk penyimpanan data.

**Aplikasi live:** [https://keystock.tech](https://keystock.tech)<br>
**Repository:** [github.com/muhwal21/KeyStock](https://github.com/muhwal21/KeyStock)

## Fitur

- Ringkasan stok, aktivitas, peta rak, dan laporan laba/rugi.
- CRUD produk dan supplier, pencarian, filter, serta galeri foto.
- Pencatatan stok masuk, keluar, penyesuaian, dan saldo sebelum/sesudah.
- Sinkronisasi otomatis saat aplikasi terbuka dan pemuatan versi baru setelah deploy.
- Hak akses Admin, Dosen, dan Staff; Dosen memiliki hak administratif setara Admin.
- Login, pendaftaran Staff dengan persetujuan Admin, reset kata sandi melalui SMTP, dan cookie sesi JWT.
- Tema terang/gelap dan tata letak responsif.

## Struktur repository

```text
client/                  Vue 3, komponen, utilitas, CSS, dan gambar produk
server/                  Express API, Sequelize models, controller, service, middleware
database/                skema MySQL dan data lokal untuk evaluasi
docs/uas/                ERD, alur request, arsitektur, dan panduan bukti UAS
ops/                     backup terenkripsi dan unit timer untuk VPS
.github/workflows/       pipeline deploy VPS
Dockerfile               image aplikasi
docker-compose.yml       aplikasi, MySQL privat, Caddy/HTTPS
compose.dev.yml          MySQL lokal untuk pengembangan
```

## Menjalankan secara lokal

Persyaratan: Node.js 24, npm, Docker, dan Docker Compose.

1. Clone repository dan masuk ke folder project:

   ```bash
   git clone https://github.com/muhwal21/KeyStock.git
   cd KeyStock
   ```

2. Salin `.env.example` menjadi `.env`:

   ```bash
   cp .env.example .env
   ```

   Nilai contoh di file tersebut, termasuk password akun evaluasi, **hanya untuk lingkungan lokal**. Jangan pakai ulang di VPS.

3. Ganti `JWT_SECRET` dengan nilai acak, misalnya keluaran `openssl rand -hex 32`. Jangan commit atau bagikan `.env`.
4. Pasang dependency, jalankan MySQL lokal, buat skema dan data awal, lalu jalankan aplikasi:

   ```bash
   npm ci
   docker compose -f compose.dev.yml up -d mysql
   npm run db:sync
   npm run db:seed
   npm run dev
   ```

5. Buka `http://localhost:5173`.

### Akun evaluasi lokal

Akun berikut dibuat oleh `npm run db:seed` untuk database lokal. Password di bawah tidak boleh digunakan pada deployment publik.

| Username | Peran | Password lokal |
| --- | --- | --- |
| `admin` | Admin | `LocalAdmin!2026` |
| `dosen` | Dosen | `LocalDosen!2026` |
| `staff` | Staff | `LocalStaff!2026` |

Untuk akun live, bagikan kredensial kepada penilai lewat kanal submission yang aksesnya dibatasi; jangan masukkan password produksi ke repository atau file dump publik. Pendaftaran baru menunggu persetujuan Admin atau Dosen. Tanpa konfigurasi SMTP, pemulihan password tidak tersedia.

`npm run db:fresh` menghapus dan membuat ulang tabel serta data lokal. Jangan jalankan pada database berisi data penting. `npm run db:accounts` menyelaraskan akun dari `.env`; perintah ini dapat memperbarui nama, email, password, status aktif, dan versi sesi akun. Periksa konfigurasi terlebih dahulu sebelum menjalankannya, khususnya di production.

## Skema dan relasi

Database memiliki tujuh tabel: `users`, `categories`, `suppliers`, `products`, `product_images`, `stock_movements`, dan `password_resets`. Diagram ERD dan hubungan foreign key ada di [docs/uas/erd.md](docs/uas/erd.md). `database/schema.sql` adalah skema referensi untuk database kosong; untuk database berjalan gunakan `npm run db:sync` yang menjalankan migrasi aplikasi.

## Deployment VPS

Stack Docker menjalankan aplikasi, MySQL yang tidak membuka port publik, serta Caddy untuk HTTPS otomatis. Aplikasi live tersedia di [keystock.tech](https://keystock.tech).

1. Arahkan DNS record `A` domain ke IPv4 VPS. Izinkan TCP `22`, `80`, dan `443`; jangan buka MySQL `3306` ke internet.
2. Siapkan Docker Engine/Compose, checkout repository, dan buat `.env` server secara manual dari `.env.example`.
3. Gunakan nilai unik untuk domain, DB password, JWT secret, email, dan password semua akun. Jangan salin password lokal di atas ke server.
4. Jalankan pertama kali `docker compose up -d --build`, lalu `docker compose exec app npm run db:sync` dan `docker compose exec app npm run db:seed`. Jangan jalankan `db:fresh` pada data production.
5. Setelah DNS aktif dan port HTTPS dapat dijangkau, Caddy meminta sertifikat secara otomatis.

Deploy rutin berjalan setelah perubahan di-push ke branch `main`, jika GitHub Actions telah dikonfigurasi. Workflow memakai host key pinning dan forced-command deploy key. Detail diagram alur deploy dan konfigurasi backup ada di [docs/uas/arsitektur.md](docs/uas/arsitektur.md) dan [ops/README.md](ops/README.md).

## Keamanan dan data

- Password disimpan sebagai bcrypt hash; JWT berada di cookie `HttpOnly`, dan operasi yang mengubah data memerlukan token CSRF.
- Validasi dilakukan di server; Sequelize memakai parameter binding untuk query terstruktur. Vue menampilkan nilai sebagai teks dan API menggunakan Helmet/CSP.
- Admin dan Dosen dapat mengelola pengguna, produk, dan supplier; Staff dapat melihat data dan mencatat pergerakan stok.
- `.env` dikecualikan dari Git. Gunakan secret berbeda untuk lokal dan production.
- Dump [database/keystock-demo.sql](database/keystock-demo.sql) berisi `DROP TABLE` dan hanya untuk database lokal kosong yang boleh ditimpa. Jangan impor dump itu ke VPS.
- Backup production harus dienkripsi dan disalin ke penyimpanan di luar VPS. Volume Docker bukan backup.
- Gambar katalog diubah ke WebP dan cache file gambar diatur tujuh hari; migrasi `db:sync` memperbarui URL gambar katalog yang lama.

## Catatan kesesuaian UAS

Brief UAS meminta ERD, alur MVC, skema MySQL, validasi, CRUD, keamanan sesi, langkah deployment, README, URL live, dan bukti demo. Repository ini mendokumentasikan implementasi aktual: Vue 3 + Express + Sequelize + MySQL. Sequelize adalah ORM yang digunakan aplikasi; repository ini tidak mengklaim menggunakan Laravel/Eloquent. Lihat [pemetaan requirement UAS](docs/uas/pemetaan-requirement.md) dan [catatan jawaban esai](docs/uas/catatan-esai.md) untuk menyusun PDF/video sesuai kondisi kode.
