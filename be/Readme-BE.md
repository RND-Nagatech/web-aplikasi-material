# Aplikasi Material - Backend (BE)

Dokumentasi resmi backend untuk project `web-aplikasi-material`.

## Ringkasan

Backend ini menyediakan REST API untuk:

- autentikasi user
- master produk, pelanggan, toko
- transaksi jual/beli terpisah collection
- piutang/hutang dan pembayaran
- dashboard summary
- laporan stock/hutang/piutang/keuangan
- cash daily current/history untuk laporan keuangan yang scalable

## Stack Utama

- Node.js + TypeScript
- Express
- MongoDB + Mongoose
- JWT auth
- Security middleware (`helmet`, `hpp`, rate limit)
- Observability endpoint (`/metrics`)

## Struktur Folder Penting

- `src/server.ts` - bootstrap app, routing, graceful shutdown
- `src/controllers/` - layer HTTP
- `src/services/` - business logic
- `src/models/` - schema & collection mapping
- `src/middlewares/` - auth/security/error/logging
- `src/observability/` - metrics recorder
- `src/scripts/` - utilitas migrasi/backfill/index

## Collection Utama

- `tm_user`
- `tm_produk`
- `tm_customer`
- `tm_toko`
- `tt_jual_detail`
- `tt_beli_detail`
- `tt_piutang`
- `tt_hutang`
- `tt_cash_daily` (current day)
- `th_cash_daily` (history/closed days)

Catatan: `tt_transaksi` (model legacy) tidak dipakai untuk flow transaksi aktif saat ini.

## Standar Data Penting

- Soft delete semantic:
  - `is_active: true` = aktif
  - `is_active: false` = nonaktif/terhapus
- Normalisasi uppercase untuk field teks domain utama (produk/customer/alamat/kode/status/faktur)
- Timestamp bisnis menggunakan format GMT+7 (`created_date`, dll) dan field `*_ts` untuk query/index performa

## Arsitektur Transaksi & Cashflow

- Transaksi jual masuk ke `tt_jual_detail`
- Transaksi beli masuk ke `tt_beli_detail`
- Jika belum lunas:
  - jual -> `tt_piutang`
  - beli -> `tt_hutang`
- Pembayaran piutang/hutang:
  - update `dibayar/sisa`
  - sinkron status transaksi asal
  - record kas harian (`recordCashMovement`)
- Komponen `kembalian` pada transaksi juga dicatat sebagai arus kas keluar:
  - sumber dari field `kembalian` di `tt_jual_detail` dan `tt_beli_detail`
  - tercermin ke `tt_cash_daily` lalu otomatis ikut rollover ke `th_cash_daily`
- Semua update kritikal dilakukan transactional session (MongoDB transaction)

## Scheduler Cash Daily

- `ensureCurrentCashDaily()` menjaga data hari aktif di `tt_cash_daily`
- Saat tanggal berganti:
  - data hari lama dipindahkan ke `th_cash_daily`
  - hari baru dibuat dengan `saldo_awal` dari `saldo_akhir` hari sebelumnya

## Security & Reliability

Diaktifkan di `server.ts`:

- `helmet`
- `hpp`
- body/query/params sanitizer (anti `$` / dot key injection)
- rate limiter API umum dan auth
- request id + structured logging
- graceful shutdown (`SIGINT`, `SIGTERM`, `unhandledRejection`, `uncaughtException`)

## Health & Observability

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`

## Environment Variables

Buat file `be/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/aplikasi_material
JWT_SECRET=replace_me
CORS_ORIGIN=http://localhost:5173
TRUST_PROXY=1
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
GRACEFUL_SHUTDOWN_TIMEOUT_MS=10000
```

## Scripts

```bash
npm run dev
npm run typecheck
npm run build
npm run start
npm run quality:gate
npm run db:sync-indexes
npm run quality:check-indexes
npm run db:backfill:created-date-ts
npm run db:backfill:cash-daily
npm run db:migrate:is-active-semantics
```

Catatan: script valid sesuai `package.json`. Jika ada script yang berubah, jadikan `package.json` sebagai source of truth.

## API Contract

Dokumentasi endpoint lengkap untuk Postman ada di:

- `docs/endpoint.md`

Semua endpoint utama berada di prefix:

- `/api/v1`

## Catatan Refactor Terbaru

- kontrak transaksi dipisah jual vs beli collection
- lookup customer berbasis `kode_customer` untuk hutang/piutang/laporan
- laporan keuangan membaca `cash_daily` agar scalable
- laporan keuangan menambahkan kategori `KEMBALIAN` (uppercase) sebagai `uang_keluar`
- export Excel dipindah ke Web Worker di FE
- hardening keamanan + observability + quality gate
