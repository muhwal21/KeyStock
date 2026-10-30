# KeyStock

![Vue](https://img.shields.io/badge/Vue.js-3-4FC08D?logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-6-52B0E7?logo=sequelize&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Caddy](https://img.shields.io/badge/Caddy-HTTPS-1F88C0?logo=caddy&logoColor=white)

**KeyStock** adalah aplikasi web manajemen inventaris gudang untuk keyboard mekanis dan aksesorinya. Aplikasi ini membantu admin gudang memantau stok, mengelola produk dan supplier, serta mencatat setiap pergerakan barang secara terstruktur.

🔗 **Aplikasi live:** [keystock.tech](https://keystock.tech)

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Teknologi](#teknologi)
- [Hak Akses](#hak-akses)
- [Struktur Project (MVC)](#struktur-project-mvc)
- [Instalasi Lokal](#instalasi-lokal)
- [Akun Login](#akun-login)
- [Perintah](#perintah)
- [Database](#database)
- [Deployment](#deployment)

---

## Fitur Utama

- **Dashboard** — ringkasan stok, heatmap aktivitas, peta rak gudang, dan laporan laba/rugi 30 hari.
- **Produk** — CRUD lengkap dengan pencarian, filter, galeri foto, harga beli/jual, dan lokasi rak.
- **Supplier** — CRUD supplier beserta kontak WhatsApp, telepon, dan email.
- **Pergerakan stok** — stok masuk, keluar, dan penyesuaian dengan riwayat saldo sebelum/sesudah.
- **Pengguna** — persetujuan pendaftaran, pengaturan peran, dan aktivasi akun.
- **Autentikasi** — registrasi, login dengan username atau email, logout, opsi "Ingat saya", dan pemulihan akun.
- **Lupa kata sandi** — pengguna cukup memasukkan username atau email akun. Jika SMTP aktif, tautan pemulihan dikirim ke email yang tersimpan pada akun; jika belum aktif, permintaan masuk ke daftar tindak lanjut Admin menggunakan email akun tersebut. Kata sandi tidak pernah diminta atau disimpan dalam permintaan.
- **Antarmuka** — tema terang/gelap, tampilan responsif, dan sinkronisasi data otomatis.

## Teknologi

### Frontend

| Teknologi | Fungsi |
| --- | --- |
| **Vue 3** | Framework JavaScript untuk membangun antarmuka (View) |
| **Vite** | Build tool dan dev server untuk frontend |
| **Lucide Icons** | Ikon antarmuka |

### Backend

| Teknologi | Fungsi |
| --- | --- |
| **Node.js 24** | Runtime JavaScript di sisi server |
| **Express 5** | Framework web untuk routing API, middleware, dan controller |
| **Sequelize 6** | ORM untuk mendefinisikan model, relasi tabel, dan query dengan parameter binding |
| **mysql2** | Driver koneksi Node.js ke MySQL |
| **Zod** | Validasi input di sisi server |

### Database

| Teknologi | Fungsi |
| --- | --- |
| **MySQL 8.4** | Database relasional untuk menyimpan pengguna, produk, supplier, foto, dan pergerakan stok |

### Keamanan & Autentikasi

| Teknologi | Fungsi |
| --- | --- |
| **JWT (jose)** | Token sesi login di cookie `HttpOnly` dan `SameSite=Lax`; flag `Secure` aktif di production |
| **bcrypt (bcryptjs)** | Hash password sebelum disimpan ke database |
| **CSRF token** | Melindungi request yang mengubah data (POST, PUT, PATCH, DELETE) |
| **Helmet** | Header keamanan HTTP dan Content Security Policy untuk membatasi script yang tidak tepercaya |
| **express-rate-limit** | Membatasi percobaan login, registrasi, dan reset password (pencegahan brute force) |

### Deployment & Infrastruktur

| Teknologi | Fungsi |
| --- | --- |
| **Docker Compose** | Menjalankan aplikasi, MySQL, dan Caddy dalam container |
| **Caddy** | Reverse proxy dan sertifikat HTTPS otomatis |
| **VPS Hostinger** | Server tempat aplikasi live berjalan |
| **GitHub Actions** | Deploy otomatis setiap push ke branch `main` |

## Hak Akses

| Aksi | Admin | Dosen | Staff |
| --- | :---: | :---: | :---: |
| Melihat dashboard, produk, supplier, dan riwayat stok | ✅ | ✅ | ✅ |
| Mencatat pergerakan stok | ✅ | ✅ | ✅ |
| Mengelola produk, foto, dan supplier | ✅ | ✅ | ❌ |
| Mengelola pengguna | ✅ | ✅ | ❌ |

> Peran **Dosen** memiliki hak administratif setara Admin. Akun Admin utama dilindungi sehingga peran dan statusnya tidak dapat diubah oleh akun lain. Hak akses diterapkan di server melalui middleware `requireAuth` dan `requireRole`.

## Struktur Project (MVC)

Pemisahan tugas mengikuti pola MVC: Vue menjadi View, Controller Express menangani request dan logika endpoint, lalu Model Sequelize berinteraksi dengan MySQL. Routes dan middleware menghubungkan lapisan tersebut.

```text
client/                 View — antarmuka Vue 3 (halaman, komponen, aset)
server/src/
├── models/             Model — definisi tabel dan relasi Sequelize
├── controllers/        Controller — logika setiap fitur
├── routes/             Routing endpoint API
├── middleware/         Autentikasi, hak akses, CSRF, dan validasi
├── services/           Logika bisnis (stok, laba/rugi, token)
└── seeders/            Data awal
database/               Skema MySQL dan data demo (.sql)
docs/uas/               ERD, alur request, dan arsitektur
ops/                    Script backup database untuk VPS
.env.example            Contoh konfigurasi environment
docker-compose.yml      Konfigurasi container production
compose.dev.yml         MySQL untuk pengembangan lokal
```

## Instalasi Lokal

**Persyaratan:** Node.js 24, npm, Docker, dan Docker Compose.

1. **Clone repository**

   ```bash
   git clone https://github.com/muhwal21/KeyStock.git
   cd KeyStock
   ```

2. **Siapkan konfigurasi**

   ```bash
   cp .env.example .env
   ```

   Ganti `JWT_SECRET` dengan nilai acak, misalnya hasil `openssl rand -hex 32`. Akun dan password seed dalam `.env.example` hanya untuk database lokal; ganti semua kredensial sebelum deployment. Jangan commit file `.env`.

3. **Install dependency dan siapkan database**

   ```bash
   npm ci
   docker compose -f compose.dev.yml up -d mysql
   npm run db:sync
   npm run db:seed
   ```

4. **Jalankan aplikasi**

   ```bash
   npm run dev
   ```

   Buka [http://localhost:5173](http://localhost:5173).

### Alternatif tanpa Docker

Gunakan MySQL yang terpasang di komputer, sesuaikan nilai `DB_*` di `.env`, lalu impor data demo:

```bash
mysql -u root -p -e "CREATE DATABASE keystock_inventory CHARACTER SET utf8mb4"
mysql -u root -p keystock_inventory < database/keystock-demo.sql
npm ci
npm run dev
```

> File `keystock-demo.sql` menghapus dan membuat ulang tabel. Gunakan hanya pada database lokal yang kosong.

## Akun Login

### Lokal

| Username | Peran | Password |
| --- | --- | --- |
| `admin` | Admin | `LocalAdmin!2026` |
| `dosen` | Dosen | `LocalDosen!2026` |
| `staff` | Staff | `LocalStaff!2026` |

Akun di atas hanya berlaku untuk database lokal. Login dapat menggunakan username atau email.

### Aplikasi live

> **Pengujian KeyStock:** [Buka aplikasi live](https://keystock.tech). Gunakan akun Dosen untuk mencoba fitur administratif dan akun Staff untuk melihat inventaris serta mencatat pergerakan stok. Username dan kata sandi tersedia di dokumen submission yang dibagikan terpisah kepada dosen. Akun Admin utama tidak dibagikan; akses Dosen setara Admin, tetapi akun utama tetap terlindungi.
>
> Pengiriman tautan pemulihan otomatis belum aktif karena SMTP belum dikonfigurasi di live. Form lupa kata sandi tetap menerima permintaan dan meneruskannya ke Admin dengan menggunakan email yang tercatat pada akun.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan API dan frontend |
| `npm run db:sync` | Membuat atau memperbarui struktur tabel |
| `npm run db:seed` | Mengisi akun dan data awal |
| `npm run db:accounts` | Menyelaraskan akun dari `.env`; dapat mengubah kredensial dan status akun |
| `npm run db:fresh` | Mengosongkan dan mengisi ulang data (khusus lokal) |
| `npm run build` | Membuat build frontend untuk production |

Jalankan `db:accounts` hanya setelah memeriksa nilai akun di `.env`, terutama saat terhubung ke database production.

## Database

Database MySQL terdiri dari delapan tabel:

| Tabel | Isi |
| --- | --- |
| `users` | Akun pengguna, peran, dan status |
| `categories` | Kategori produk |
| `suppliers` | Data supplier dan kontak |
| `products` | Data produk, harga, stok, dan lokasi rak |
| `product_images` | Foto produk |
| `stock_movements` | Riwayat stok masuk, keluar, dan penyesuaian |
| `password_resets` | Token pemulihan kata sandi |
| `account_help_requests` | Permintaan bantuan pemulihan akun yang ditinjau Admin |

Diagram ERD tersedia di [`docs/uas/erd.md`](docs/uas/erd.md). Dokumen [alur request](docs/uas/alur-request.md) dan [arsitektur](docs/uas/arsitektur.md) menjelaskan proses aplikasi; skema database ada di [`database/schema.sql`](database/schema.sql).

## Deployment

Aplikasi berjalan di VPS menggunakan Docker Compose dengan tiga layanan:

- **app** — server Node.js yang menyajikan API dan frontend.
- **mysql** — database MySQL tanpa port publik.
- **caddy** — reverse proxy dengan sertifikat HTTPS otomatis.

Push ke branch `main` memicu workflow GitHub Actions; deployment berjalan saat variable repository `DEPLOY_ENABLED` diaktifkan. Konfigurasi rahasia (password database, JWT secret, dan akun) disimpan di file `.env` pada server dan tidak disertakan dalam repository. Script dan timer backup tersedia di `ops/`, tetapi jadwal backup off-site perlu dikonfigurasi dan diverifikasi terpisah di VPS.
