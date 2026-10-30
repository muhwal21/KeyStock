# Alur request: pencatatan stok

Contoh ini menggunakan endpoint `POST /api/stock-movements`.

```mermaid
sequenceDiagram
  actor User
  participant View as Vue 3 View
  participant API as Express API
  participant CSRF as CSRF middleware
  participant Auth as Auth dan role middleware
  participant Controller as stockMovementController
  participant Service as stockService
  participant ORM as Sequelize models
  participant DB as MySQL

  User->>View: Isi form stok dan submit
  View->>API: POST /api/stock-movements + cookie JWT + CSRF header
  API->>CSRF: Validasi cookie dan X-CSRF-Token
  CSRF->>Auth: Lanjutkan jika token cocok
  Auth->>DB: Cari user dan cocokkan token_version
  DB-->>Auth: User aktif dan role
  Auth->>Controller: Validasi login dan role Admin/Dosen/Staff
  Controller->>Controller: Validasi body dengan schema Zod
  Controller->>Service: Kirim productId, userId, tipe, alasan, jumlah
  Service->>DB: BEGIN; SELECT produk FOR UPDATE
  DB-->>Service: Stok produk saat ini
  Service->>Service: Hitung saldo baru dan validasi stok cukup
  Service->>ORM: Update products + insert stock_movements
  ORM->>DB: UPDATE/INSERT berparameter dalam transaksi
  DB-->>ORM: Commit atau error constraint
  ORM-->>Service: Hasil transaksi
  Service-->>Controller: Baris pergerakan dan saldo baru
  Controller-->>API: JSON + status HTTP
  API-->>View: Response
  View->>View: Perbarui state dan tampilkan ringkasan
```

Jika validasi, aturan stok, atau database gagal, transaksi dibatalkan dan error dikembalikan sebagai respons API. Tampilan menampilkan pesan tanpa mengubah state seolah-olah penyimpanan berhasil.

## Pemetaan MVC aktual

- **View:** form dan state Vue pada `client/src/App.vue`.
- **Controller:** routing, otorisasi, dan response di `server/src/controllers/stockMovementController.js`.
- **Model:** `Product`, `StockMovement`, dan `User` di `server/src/models/index.js`.
- **Service/domain logic:** transaksi saldo di `server/src/services/stockService.js`.
- **Database:** tabel MySQL dan foreign key yang dideskripsikan di `database/schema.sql`.

Ini implementasi MVC lintas lapisan client-server: View Vue mengirim request HTTP ke controller Express. Aplikasi tidak merender halaman dari Laravel.

## Alur lupa kata sandi

1. Pengguna memasukkan username atau email akun pada satu kolom.
2. Frontend mengirim identifier ke `POST /api/auth/forgot-password`. Backend membatasi frekuensi request, memvalidasi input, lalu mencari akun berdasarkan username atau email.
3. Jika SMTP aktif dan akun ditemukan, backend menyimpan hash token sekali pakai dengan masa berlaku 30 menit dan mengirim tautan ke email yang tersimpan di akun. Respons tidak membocorkan apakah identifier terdaftar.
4. Jika SMTP belum aktif, API memberi status bahwa email otomatis belum tersedia. Frontend mengirim permintaan ke `POST /api/auth/password-help`; backend menambahkan permintaan ke antrean Admin dan menyalin email akun yang cocok ke catatan tersebut. Pengguna tidak diminta memasukkan email kedua.
5. Admin melihat permintaan melalui route privat `/api/users/account-help-requests`, memverifikasi identitas, lalu menindaklanjuti melalui email akun. Kata sandi tidak dikirim atau dicatat pada alur ini.
