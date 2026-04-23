# Endpoint API - Web Aplikasi Material

Dokumentasi endpoint backend terbaru (untuk Postman/integrasi FE).

## Base URL

- Local default: `http://localhost:3000`
- API prefix: `/api/v1`
- Contoh base API: `http://localhost:3000/api/v1`

## Response Format

### Success

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "..."
}
```

## Auth Header

Untuk endpoint yang butuh login:

```http
Authorization: Bearer <JWT_TOKEN>
```

## Health & Observability (No Auth)

### GET `/health`

### GET `/health/live`

### GET `/health/ready`

### GET `/metrics`

---

## 1) Auth

### POST `/api/v1/auth/register`

Body:

```json
{
  "name": "Admin",
  "email": "admin@mail.com",
  "password": "1234"
}
```

### POST `/api/v1/auth/login`

Body:

```json
{
  "email": "admin@mail.com",
  "password": "1234"
}
```

Catatan: `email` atau `username` diterima sebagai identifier.

### GET `/api/v1/auth/me`

Header: `Authorization: Bearer <token>`

---

## 2) Products (`tm_produk`) - Auth Required

### GET `/api/v1/products`

Query opsional:

- `page`, `limit`
- `search`

Hanya mengembalikan data aktif (`is_active: true`).

### POST `/api/v1/products`

Body:

```json
{
  "nama_produk": "PAKU",
  "stock_on_hand": 100,
  "harga_grosir": 120000,
  "harga_ecer": 12000,
  "restore_existing": false
}
```

Catatan:

- `nama_produk` otomatis dinormalisasi uppercase.
- Jika nama sama dan data lama nonaktif, API akan mengembalikan `RESTORE_CONFIRMATION_REQUIRED` (409), lalu kirim ulang dengan `restore_existing: true`.

### PUT `/api/v1/products/:id`

Body (partial update):

```json
{
  "nama_produk": "PAKU BETON",
  "stock_on_hand": 120,
  "harga_grosir": 130000,
  "harga_ecer": 13000
}
```

### DELETE `/api/v1/products/:id`

Soft delete:

- `is_active` -> `false`
- update audit `deleted_by`, `deleted_date`

---

## 3) Customers (`tm_customer`) - Auth Required

### GET `/api/v1/customers`

Query opsional:

- `page`, `limit`
- `search`
- `nama_customer`
- `no_hp`
- `alamat`

### POST `/api/v1/customers`

Body:

```json
{
  "nama_customer": "ROBI",
  "no_hp": "08123456789",
  "alamat": "BANDUNG"
}
```

Catatan:

- `nama_customer` dan `alamat` otomatis uppercase.
- `kode_customer` auto-generate format `C00000001`.
- data aktif memakai `is_active: true`.

### PUT `/api/v1/customers/:id`

Body (partial):

```json
{
  "nama_customer": "ROBI BARU",
  "no_hp": "08123456789",
  "alamat": "CIMAHI"
}
```

### DELETE `/api/v1/customers/:id`

Soft delete (`is_active: false`).

---

## 4) Stores (`tm_toko`) - Auth Required

### GET `/api/v1/stores`

Query opsional:

- `page`, `limit`
- `search`

### POST `/api/v1/stores`

Body:

```json
{
  "nama_toko": "Berkah",
  "no_hp": "082126093567",
  "alamat": "Bandung"
}
```

Response menyertakan:

- `kode_toko` auto-generate (3 inisial + suffix increment jika duplicate), contoh: `BER`, `BER02`.

### PUT `/api/v1/stores/:id`

Body (editable):

```json
{
  "nama_toko": "Berkah Material",
  "no_hp": "082126093567",
  "alamat": "Bandung Barat"
}
```

---

## 5) Transactions - Auth Required

## 5.1 GET `/api/v1/transactions`

Query opsional:

- `page`, `limit`
- `search` (no faktur / nama customer / kode customer)

Mengembalikan gabungan transaksi dari:

- `tt_jual_detail`
- `tt_beli_detail`

Contoh item response `data.items[]`:

```json
{
  "_id": "...",
  "type_trx": "JUAL",
  "no_faktur_jual": "FJ-23042026-0001",
  "kode_customer": "C00000001",
  "nama_customer": "ROBI",
  "no_hp": "08123456789",
  "alamat": "BANDUNG",
  "items": [
    {
      "kode_produk": "00000001",
      "qty": 2,
      "harga_jual": 12000,
      "subtotal": 24000
    }
  ],
  "total": 24000,
  "dibayar": 10000,
  "kembalian": 0,
  "status": "PIUTANG",
  "created_date": "2026-04-23 10:00:00 GMT+7"
}
```

## 5.2 POST `/api/v1/transactions`

Body minimal:

```json
{
  "type": "jual",
  "nama_customer": "ROBI",
  "no_hp": "08123456789",
  "alamat": "BANDUNG",
  "items": [
    {
      "product": "<product_id>",
      "qty": 2,
      "harga_jual": 12000,
      "harga_beli": 12000,
      "subtotal": 24000
    }
  ],
  "total": 24000,
  "dibayar": 10000
}
```

Catatan logic:

- `type` wajib `jual` atau `beli`.
- jika `customer` (id) tidak diisi, `nama_customer` wajib diisi.
- transaksi `jual` -> simpan ke `tt_jual_detail`.
- transaksi `beli` -> simpan ke `tt_beli_detail`.
- status otomatis:
  - `LUNAS` jika lunas
  - `PIUTANG` untuk jual belum lunas
  - `HUTANG` untuk beli belum lunas
- no faktur otomatis:
  - jual: `FJ-<ddmmyyyy>-####`
  - beli: `FB-<ddmmyyyy>-####`
- stok otomatis berkurang/bertambah sesuai type.

### Piutang/Hutang Auto Create

Jika belum lunas:

- jual -> insert ke `tt_piutang`
- beli -> insert ke `tt_hutang`

### Cash Daily

Transaksi selalu mempengaruhi cash harian:

- `tt_cash_daily` (hari aktif)
- rollover ke `th_cash_daily` saat tanggal berganti
- `kembalian` dari transaksi jual/beli dihitung sebagai `uang_keluar` (cash out)

---

## 6) Debts / Piutang - Auth Required

### GET `/api/v1/debts`

Query opsional:

- `page`, `limit`
- `no_faktur`

### POST `/api/v1/debts/payment`

Body:

```json
{
  "debt_id": "<id_piutang>",
  "amount": 50000
}
```

Logic:

- validasi `amount <= sisa`
- update piutang + transaksi asal
- record cash movement hari ini (uang masuk)

---

## 7) Payables / Hutang - Auth Required

### GET `/api/v1/payables`

Query opsional:

- `page`, `limit`
- `no_faktur`

### POST `/api/v1/payables/payment`

Body:

```json
{
  "payable_id": "<id_hutang>",
  "amount": 50000
}
```

Logic:

- validasi `amount <= sisa`
- update hutang + transaksi asal
- record cash movement hari ini (uang keluar)

---

## 8) Dashboard - Auth Required

### GET `/api/v1/dashboard/summary`

Query:

- `period=7` (default) atau `period=30`

Response data berisi:

- ringkasan total produk/transaksi/piutang/hutang
- trend penjualan vs pembelian
- due list piutang/hutang jatuh tempo

---

## 9) Reports - Auth Required

### 9.1 GET `/api/v1/reports/stock`

Query:

- `date_from` (ISO/date string)
- `date_to` (ISO/date string)

Mengembalikan snapshot produk aktif + summary stock.

### 9.2 GET `/api/v1/reports/debts`

Query:

- `date_from`, `date_to`
- `no_faktur` (prefix match)

Contoh item response `data.items[]`:

```json
{
  "_id": "...",
  "kode_customer": "C00000001",
  "nama_customer": "ROBI",
  "customer_name": "ROBI",
  "no_faktur_jual": "FJ-23042026-0001",
  "total": 24000,
  "dibayar": 10000,
  "sisa": 14000,
  "created_date": "2026-04-23 10:00:00 GMT+7"
}
```

### 9.3 GET `/api/v1/reports/payables`

Query:

- `date_from`, `date_to`
- `no_faktur` (prefix match)

Contoh item response `data.items[]`:

```json
{
  "_id": "...",
  "kode_customer": "C00000001",
  "nama_customer": "ROBI",
  "customer_name": "ROBI",
  "no_faktur_beli": "FB-23042026-0001",
  "total": 24000,
  "dibayar": 10000,
  "sisa": 14000,
  "created_date": "2026-04-23 10:00:00 GMT+7"
}
```

### 9.4 GET `/api/v1/reports/finance`

Query:

- `type=rekap|detail` (default `rekap`)
- `date_from`, `date_to`
- `search` (untuk detail)

Logic utama:

- summary saldo/mutasi diambil dari cash daily (`tt_cash_daily` + `th_cash_daily`)
- `type=detail` menampilkan list kategori:
  - `PENJUALAN` (uang masuk)
  - `PEMBELIAN` (uang keluar)
  - `KEMBALIAN` (uppercase, uang keluar)
- `type=rekap` juga menyertakan baris `KEMBALIAN` (uang keluar)
- nilai `KEMBALIAN` diambil dari field `kembalian` pada `tt_jual_detail` dan `tt_beli_detail`

---

## Error Umum

- `401` token tidak ada/invalid
- `404` data tidak ditemukan
- `409` konflik data (contoh restore produk)
- `400` validasi request

---

## Quick Test Flow (Postman)

1. Register
2. Login
3. Set bearer token
4. Create store
5. Create customer
6. Create product
7. Create transaction jual (dibayar sebagian)
8. Cek `GET /debts`
9. Bayar `POST /debts/payment`
10. Cek dashboard + reports

---

## Catatan Penting Versi Terkini

- transaksi jual & beli sudah dipisah collection (tidak lagi satu collection transaksi campuran)
- soft delete `is_active` sudah dibetulkan:
  - aktif = `true`
  - terhapus/nonaktif = `false`
- field teks penting sudah dinormalisasi uppercase agar konsisten lintas laporan/export
- tidak ada endpoint URL baru pada update terbaru; perubahan fokus pada behaviour data cashflow/laporan
