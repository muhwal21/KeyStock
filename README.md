# KeyStock

Aplikasi full-stack untuk mengelola inventaris keyboard mekanis dan aksesori. Repo ini memakai Vue 3 untuk antarmuka, Node.js dan Express untuk API, serta MySQL untuk data.

## Struktur

```text
client/        aplikasi Vue dan aset antarmuka
server/        API, autentikasi, dan aturan inventaris
database/      skema dan data contoh MySQL
screenshots/   tangkapan layar fitur aplikasi
```

## Persiapan lokal

Gunakan Node.js 24 dan MySQL 8. Salin `.env.example` menjadi `.env`, isi kata sandi database dan rahasia aplikasi, lalu jalankan:

```bash
npm install
docker compose up -d mysql
npm run db:sync
npm run db:seed
npm run dev
```

Buka `http://localhost:5173`. Jangan commit `.env`, kredensial, `node_modules`, atau hasil build.

## Catatan

`npm run db:fresh` menghapus dan mengisi ulang tabel demo. Jangan jalankan pada database yang berisi data penting.
