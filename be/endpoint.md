# API Endpoint Reference (Postman)

Dokumen ini berisi referensi endpoint backend (`be`) untuk pengujian (mis. Postman). Isi disusun agar tim frontend/backend mudah memahami kontrak API, parameter, dan contoh permintaan/respons.

## Base URL & Prefix

- Default local: `http://localhost:3000`
- API prefix: `/api/v1` (cek `src/server.ts` bila ada perubahan)
- Contoh Base API: `http://localhost:3000/api/v1`

Catatan: selalu periksa konfigurasi `be` jika prefix atau port berbeda di environment Anda.

## Format Respons

Semua endpoint (selain `GET /health`) mengembalikan respons dalam format:

Success:

```json
{
  "success": true,
  "message": "Pesan singkat",
  "data": {
    /* payload */
  }
}
```

Error (contoh):

```json
{
  "success": false,
  "message": "Deskripsi error",
  "errors": {
    /* optional validation details */
  }
}
```

HTTP status code akan disesuaikan (200, 201, 400, 401, 404, 500, dll.).

## Autentikasi

- Endpoint publik (tidak memerlukan token):
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `GET /health`
- Endpoint lain umumnya membutuhkan header:

```
Authorization: Bearer <token>
Content-Type: application/json
```

Pastikan men-set token hasil login di Postman/Insomnia untuk request terautentikasi.

---

## 1) Health Check

### GET `/health`

Memeriksa server hidup. Response minimal:

```json
{
  "success": true,
  "message": "ok"
}
```

---

## 2) Authentication

### POST `/api/v1/auth/register`

Daftarkan user baru.

Body (application/json):

```json
{
  "name": "Admin Toko",
  "email": "admin@toko.test",
  "password": "12345678"
}
```

Validasi: `name`, `email`, `password` wajib; `password` minimal 4 karakter; `email` harus unik.

Response sukses mengembalikan objek: `{ token: string, user: { id, name, email } }`.

### POST `/api/v1/auth/login`

Login dan mendapat JWT.

Body (application/json):

```json
{
  "email": "admin@toko.test",
  "password": "12345678"
}
```

Atau boleh menggunakan `username` sebagai alias untuk `email`:

```json
{
  "username": "admin@toko.test",
  "password": "12345678"
}
```

Response sukses menyertakan objek: `{ token: string, user: { id, name, email } }`.

### GET `/api/v1/auth/me`

Ambil data user dari token aktif (header `Authorization` dibutuhkan).

---

## 3) Products

Endpoint CRUD untuk produk.

### GET `/api/v1/products`

List produk dengan pagination dan optional search.

Query params:

- `page` (default 1)
- `limit` (default 10)
- `search` (nama/kode)

Response `data`: `{ items: Product[], total, page, limit, totalPages }`.

### GET `/api/v1/products/:id`

Ambil detail produk.

### POST `/api/v1/products`

Buat produk baru.

Contoh body (sesuai `CreateProductBody`):

```json
{
  "nama_produk": "Semen Tiga Roda",
  "stock_on_hand": 100,
  "harga_grosir": 45000,
  "harga_ecer": 55000,
  "restore_existing": false
}
```

`restore_existing` opsional: bila `true` dan ada produk dengan nama sama yang dihapus, service akan merestore data yang ada.

### PUT `/api/v1/products/:id`

Update produk (parsial diizinkan). Body menggunakan field yang sama seperti `POST`.

### DELETE `/api/v1/products/:id`

Soft-delete: backend menandai `is_active=true` dan mengisi `deleted_by`/`deleted_date`.

---

## 4) Customers

Manajemen customers; backend menerapkan soft-delete dan audit fields.

### GET `/api/v1/customers`

Query params:

- `page`, `limit`, `search`, dan filter spesifik seperti `nama_customer`, `no_hp`, `alamat`.

Response: pagination seperti products.

### GET `/api/v1/customers/:id`

Ambil detail customer.

### POST `/api/v1/customers`

Buat customer baru.

Contoh body (sesuai `CreateCustomerBody`):

```json
{
  "nama_customer": "PT Maju Jaya",
  "no_hp": "081234567890",
  "alamat": "Jl. Contoh No.1",
  "restore_existing": false
}
```

### PUT `/api/v1/customers/:id`

Update customer — service akan menyimpan `edited_by` dan `edited_date` secara otomatis bila actor diketahui.

### DELETE `/api/v1/customers/:id`

Soft-delete: set `is_active=true`, isi `deleted_by` dan `deleted_date`.

Catatan field audit yang digunakan di model Customer:

- `is_active` (boolean)
- `created_date` (Date)
- `edited_by`, `edited_date`
- `deleted_by`, `deleted_date`

---

## 5) Transactions

CRUD dan pembuatan transaksi jual/beli (nota).

### GET `/api/v1/transactions`

Query params: `page`, `limit`, `search`, `date_from`, `date_to`, `type`.

### GET `/api/v1/transactions/:id`

Ambil detail transaksi (termasuk items).

### POST `/api/v1/transactions`

Buat transaksi (jual / beli). Contoh sesuai `CreateTransactionBody`:

```json
{
  "type": "jual", // atau "beli"
  "customer": "<customer_id>", // optional jika memakai nama_customer
  "nama_customer": "Nama Pelanggan (jika tanpa customer id)",
  "no_hp": "081234...",
  "alamat": "...",
  "items": [
    {
      "product": "<product_id>",
      "qty": 2,
      "harga_jual": 55000,
      "harga_beli": 45000,
      "price": 55000,
      "subtotal": 110000
    }
  ],
  "total": 110000,
  "dibayar": 50000
}
```

Aturan bisnis (ringkasan):

- `type` harus `jual` atau `beli`.
- Salah satu `customer` (id) atau `nama_customer` wajib.
- `items` harus array non-kosong; tiap item minimal memiliki `product` (id), `qty`, dan `subtotal`.
- Harga unit dapat dikirim sebagai `harga_jual`/`harga_beli` atau `price`.
- `dibayar` (atau `paid`) harus >= 0.
- Jika `dibayar < total` maka akan dibuat record `Debt` (piutang) untuk `jual` atau `Payable` (hutang) untuk `beli`.
- Untuk `jual`: stok berkurang; untuk `beli`: stok bertambah.

### PUT `/api/v1/transactions/:id` dan DELETE

Tergantung kebutuhan: umumnya transaksi yang sudah final tidak dihapus langsung — gunakan mekanisme pembatalan jika ada.

---

## 6) Debts (Piutang)

### GET `/api/v1/debts`

Pagination dan filter.

### POST `/api/v1/debts/payment`

Mencatat pembayaran piutang.

Body (sesuai `DebtPaymentBody`):

```json
{
  "debt_id": "<debt_id>",
  "amount": 25000
}
```

Aturan: `amount` > 0 dan tidak lebih besar dari outstanding.

---

## 7) Payables (Hutang)

### GET `/api/v1/payables`

### POST `/api/v1/payables/payment`

Mirip dengan Debts: catat pembayaran hutang dan update status/remaining.

Body contoh (sesuai `PayablePaymentBody`):

```json
{
  "payable_id": "<payable_id>",
  "amount": 25000
}
```

---

## 8) Stores

Simple CRUD untuk data toko (digunakan untuk header nota/print).

### GET `/api/v1/stores`

List stores.

### POST `/api/v1/stores`

Contoh body (`CreateStoreBody`):

```json
{
  "nama_toko": "Toko Contoh",
  "no_hp": "0812...",
  "alamat": "Jl. Contoh"
}
```

### PUT `/api/v1/stores/:id`

---

## 9) Dashboard

### GET `/api/v1/dashboard/summary`

Mengembalikan ringkasan metrik: total produk, total transaksi, total outstanding debts/payables, dsb.

---

## 10) Reports

Endpoint laporan untuk stok, piutang, dan hutang.

### GET `/api/v1/reports/stock`

Query params:

- `date_from` (YYYY-MM-DD) — opsional
- `date_to` (YYYY-MM-DD) — opsional

Perilaku penting:

- Validasi rentang tanggal: `date_from` harus <= `date_to`.
- Backend akan meng-set `date_to` ke akhir hari (23:59:59.999) jika diberikan.

### GET `/api/v1/reports/debts`

### GET `/api/v1/reports/payables`

### GET `/api/v1/reports/finance`

Query param `type`: `rekap` (default) atau `detail`. Opsional `search`.

Semua endpoint laporan biasanya memerlukan autentikasi (`Authorization` header).

---

## Kontrak Pagination (Umum)

Respons pagination standar mengandung:

```
data: {
  items: [...],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

Query params: `page`, `limit`.

---

## Praktik & Catatan Penting

- Soft-delete: saat menghapus customer atau product, backend menandai `is_active=true` dan mencatat `deleted_by`/`deleted_date`.
- Normalisasi: beberapa field (mis. `type_trx`, `nama_produk`) di-normalisasi ke UPPERCASE di titik penulisan untuk konsistensi laporan.
- Export: frontend menangani export PDF/Excel (client-side) menggunakan data dari endpoint laporan — pastikan respons mengandung kolom yang diperlukan.
- Validasi tanggal: backend memeriksa format `YYYY-MM-DD` dan mengubah ke range waktu UTC start/end.

---

## Contoh Alur Test (Postman)

1. `GET /health`
2. `POST /api/v1/auth/register` -> simpan token
3. `POST /api/v1/auth/login` -> simpan token
4. Set header `Authorization: Bearer {{token}}`
5. `POST /api/v1/customers` (buat customer)
6. `POST /api/v1/products` (buat produk)
7. `POST /api/v1/transactions` (buat penjualan sebagian dibayar)
8. `GET /api/v1/debts`
9. `POST /api/v1/debts/payment`
10. `GET /api/v1/payables`
11. `POST /api/v1/payables/payment`
12. `GET /api/v1/dashboard/summary`
13. `GET /api/v1/reports/stock?date_from=2026-04-01&date_to=2026-04-21`

---

## Variable Collections / Environment (Postman)

Gunakan variable:

- `base_url = http://localhost:3000`
- `api_v1 = {{base_url}}/api/v1`
- `token = <isi setelah login>`

Header contoh untuk request terautentikasi:

```
Authorization: Bearer {{token}}
Content-Type: application/json
```

--

Jika Anda ingin, saya dapat:

- membuatkan file Postman collection (.json) untuk di-import, atau
- menghasilkan OpenAPI (Swagger) skeleton dari endpoint ini untuk dokumentasi otomatis.

Silakan beri tahu opsi mana yang diinginkan.
