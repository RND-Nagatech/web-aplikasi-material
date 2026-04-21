# Aplikasi Material (BE)

Dokumentasi backend aplikasi (Node.js + Express + TypeScript + Mongoose). README ini berisi teknologi, struktur folder, skema data penting, variabel lingkungan, dan panduan instalasi/jalankan untuk tim backend.

## Ringkasan Project

- Backend REST API menggunakan Express dan Mongoose (MongoDB).
- Ditulis dengan TypeScript; pengembangan cepat menggunakan `ts-node-dev`.
- Otentikasi JWT untuk route yang membutuhkan autentikasi.
- Folder `src/` berisi `controllers`, `services`, `models`, `middlewares`, dan `config`.

## Teknologi Utama

- Node.js
- TypeScript
- Express
- Mongoose
- ts-node-dev (development)

## Struktur Folder (ringkasan)

- `src/server.ts` — entrypoint server
- `src/config/` — konfigurasi (mis. database)
- `src/controllers/` — handler HTTP
- `src/services/` — logika bisnis, panggilan DB
- `src/models/` — Mongoose schema & models
- `src/middlewares/` — autentikasi, error handling, logger
- `src/utils/` — helper (utilitas umum)

## Model / Skema Data (ringkasan penting)

Berikut ringkasan model yang digunakan pada backend. Lihat file di `src/models` untuk definisi lengkap.

- `User`
  - `username` (string)
  - `passwordHash` (string)
  - `role` (string)

- `Customer` (soft-delete + audit)
  - `nama_customer` (string)
  - `no_hp` (string)
  - `alamat` (string)
  - `is_active` (boolean)
  - `created_date` (Date)
  - `edited_by` (string | userId)
  - `edited_date` (Date)
  - `deleted_by` (string | userId)
  - `deleted_date` (Date)
  - Catatan: mongoose timestamps dimatikan untuk model ini jika project mengatur demikian; audit ditangani manual.

- `Product`
  - `kodeProduk`, `name`, `stock`, `harga_beli`, `harga_jual`, `wholesalePrice`, `retailPrice`, dll.

- `Transaction`
  - `type` ('sale'|'purchase'), `invoiceNumber`, `items[]`, `customerId`, `total`, `paid`, `change`, `createdAt`
  - `items[]`: `{ productId, productName, quantity, unitPrice, subtotal }`

- `Debt` / `Payable`
  - field tanggal, nominal, status_lunas, keterangan, reference ke transaksi/customer

Catatan: Beberapa model melakukan normalisasi data (mis. `type_trx` dan `nama_produk` disimpan/diubah ke UPPERCASE untuk konsistensi di seluruh sistem).

## Environment Variables (BE)

Tambahkan file `.env` di folder `be/` dengan variabel minimal berikut:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/your_database
JWT_SECRET=ubah_dengan_rahasia_yang_sulit_ditebak
```

Sesuaikan nama variabel jika kode Anda menggunakan nama lain — periksa `src/config/database.ts` atau `src/server.ts`.

## Prasyarat

- Node.js (LTS)
- npm atau yarn
- MongoDB (lokal atau remote)

## Instalasi & Menjalankan (Development)

1. Masuk ke folder `be` dan pasang dependensi:

```bash
cd be
npm install
```

2. Buat file `.env` seperti contoh di atas.

3. Jalankan server development:

```bash
npm run dev
```

Script `dev` menggunakan `ts-node-dev` dan akan merestart otomatis saat ada perubahan kode. Default port: `3000` (ubah di `.env` bila perlu).

## Build & Menjalankan (Production)

Bangun TypeScript dan jalankan hasil kompilasi:

```bash
npm run build
npm start
```

Hasil build berada di `dist/` dan server dijalankan dari `dist/server.js`.

## Endpoint & Konvensi (ringkasan)

- API prefix umum: `/api` (periksa `src/server.ts` untuk routing actual).
- Contoh endpoint penting:
  - `GET /api/customers`
  - `POST /api/customers`
  - `PUT /api/customers/:id` (soft-update + audit)
  - `DELETE /api/customers/:id` (soft-delete: set `is_active=false` + `deleted_by`/`deleted_date`)
  - `GET /api/products`
  - `POST /api/transactions` (buat nota / penjualan / pembelian)
  - `GET /api/reports/stock`, `/reports/payable`, `/reports/debt`, dsb.

## Notes untuk Developer

- Soft-delete dan audit: beberapa model menambahkan field audit (`edited_by`, `edited_date`, `deleted_by`, `deleted_date`) dan `is_active` flag.
- Normalisasi data: simpan `type_trx` dan `nama_produk` dalam UPPERCASE ketika membuat/menyimpan catatan agar konsisten di laporan dan export.
- Export: pastikan format tanggal UTC start/end saat menerima filter range dari frontend.

## Troubleshooting

- Jika `npm run dev` langsung exit dengan kode 130, kemungkinan proses dibatalkan (Ctrl-C) atau environment bermasalah. Jalankan lagi dan periksa log error.
- Pastikan `MONGO_URI` benar dan MongoDB berjalan.
- Jika TypeScript error muncul saat dev, jalankan `npm run build` untuk melihat error kompilasi yang lebih deterministik.

## Contributing

- Ikuti konvensi folder `controllers/services/models` saat menambah fitur.
- Untuk perubahan skema data, informasikan tim frontend supaya mapping TypeScript di FE disesuaikan.

--
