# ERD KeyStock

ERD ini mengikuti delapan tabel aplikasi dan relasi foreign key pada MySQL. Produk yang diarsipkan memakai `is_active = false`; riwayat stok tidak dihapus saat produk diarsipkan.

```mermaid
erDiagram
  USERS ||--o{ STOCK_MOVEMENTS : mencatat
  USERS ||--o{ PASSWORD_RESETS : menerima
  USERS o|--o{ ACCOUNT_HELP_REQUESTS : menindaklanjuti
  CATEGORIES ||--o{ PRODUCTS : mengelompokkan
  SUPPLIERS o|--o{ PRODUCTS : memasok
  PRODUCTS ||--o{ PRODUCT_IMAGES : memiliki
  PRODUCTS ||--o{ STOCK_MOVEMENTS : mengalami

  USERS {
    int id PK
    string name
    string username UK
    string email UK
    string password_hash
    enum role
    boolean is_active
    enum approval_status
    int token_version
  }
  CATEGORIES {
    int id PK
    string slug UK
    string name UK
  }
  SUPPLIERS {
    int id PK
    string name UK
    string phone
    string email
    string website
    boolean is_active
  }
  PRODUCTS {
    int id PK
    int category_id FK
    int supplier_id FK
    string sku UK
    string name
    decimal purchase_price
    decimal selling_price
    int warehouse_stock
    int reorder_point
    string storage_location
    boolean is_active
  }
  PRODUCT_IMAGES {
    int id PK
    int product_id FK
    string url
    blob data
    string mime_type
    int sort_order
  }
  STOCK_MOVEMENTS {
    bigint id PK
    int product_id FK
    int user_id FK
    enum movement_type
    int quantity
    int stock_before
    int stock_after
    enum reason
    decimal unit_cost
    decimal unit_price
    string currency
  }
  PASSWORD_RESETS {
    int id PK
    int user_id FK
    string token_hash UK
    datetime expires_at
    datetime used_at
  }
  ACCOUNT_HELP_REQUESTS {
    int id PK
    string account_identifier
    string contact_email "nullable; email akun yang cocok"
    string message
    enum status
    int handled_by FK
    datetime handled_at
  }
```

## Kardinalitas dan alasan

- Satu kategori mengelompokkan banyak produk; setiap produk wajib memiliki satu kategori (`products.category_id`, `ON DELETE RESTRICT`).
- Satu supplier dapat memasok banyak produk; produk boleh belum memiliki supplier (`products.supplier_id`, `ON DELETE SET NULL`).
- Satu produk dapat memiliki beberapa foto dan catatan pergerakan. Foto ikut dihapus jika produk dihapus secara fisik; produk aktif dalam aplikasi diarsipkan secara soft delete. Riwayat pergerakan menolak penghapusan fisik produk (`ON DELETE RESTRICT`).
- Satu pengguna mencatat banyak pergerakan stok. Catatan menyimpan saldo sebelum/sesudah dan snapshot harga untuk audit serta laporan historis.
- Satu pengguna dapat memiliki beberapa catatan reset sandi. Token asli tidak disimpan, hanya hash; catatan reset ikut dibersihkan saat akun dihapus (`ON DELETE CASCADE`).
- Permintaan bantuan lupa kata sandi dicatat tanpa mengungkap ke pengirim apakah akun cocok. Sistem mengambil `contact_email` dari alamat akun yang cocok; field ini nullable jika username/email tidak ditemukan. Admin meninjau identitas dan menindaklanjuti secara manual; `handled_by` menjadi foreign key opsional yang dikosongkan jika akun Admin dihapus (`ON DELETE SET NULL`).

Seed membuat peran Admin (`admin`), Dosen (`dosen`), dan Staff (`staff`). Dosen memiliki hak administratif yang sama dengan Admin; Staff dapat melihat inventaris dan mencatat pergerakan stok, tetapi tidak mengelola produk, supplier, atau akun.
