# Phase 1 - Backend Architecture Hardening

Tanggal eksekusi: 2026-04-22 (Asia/Jakarta)
Scope: `be/`

## Tujuan Phase 1
- Menurunkan risiko bottleneck backend saat data tumbuh.
- Menstandarkan error handling + request parsing.
- Mengurangi duplikasi controller dan meningkatkan maintainability.

## Perubahan yang Diterapkan

### 1) Controller Hardening
- Semua controller backend dipindahkan ke pola `asyncHandler`.
- `try/catch` berulang dihapus, error sekarang otomatis diteruskan ke middleware global.
- Validasi query/body yang sering dipakai dipusatkan ke util parser.

File baru:
- `be/src/utils/async-handler.ts`
- `be/src/utils/request.ts`

Controller yang direfactor:
- `be/src/controllers/auth.controller.ts`
- `be/src/controllers/customer.controller.ts`
- `be/src/controllers/product.controller.ts`
- `be/src/controllers/store.controller.ts`
- `be/src/controllers/transaction.controller.ts`
- `be/src/controllers/debt.controller.ts`
- `be/src/controllers/payable.controller.ts`
- `be/src/controllers/report.controller.ts`
- `be/src/controllers/dashboard.controller.ts`

### 2) Error & Logging Hardening
- Error middleware sekarang membawa metadata `code` dan `details`.
- Logging error dibuat structured JSON agar mudah diobservasi.
- Ditambahkan request-id middleware (`x-request-id`) untuk trace request antar log.

File:
- `be/src/middlewares/error.middleware.ts`
- `be/src/middlewares/logger.middleware.ts`
- `be/src/server.ts`

### 3) Query Optimization (Scalability)

#### A. Transaction list
- Sebelumnya: load semua `tt_jual_detail` + `tt_beli_detail`, merge & sort di memory.
- Sekarang: query DB dengan aggregation `unionWith + sort + facet` (server-side pagination).
- Mendukung search pada invoice/customer.

File:
- `be/src/services/transaction.service.ts`

#### B. Reports
- Sebelumnya: load semua data debt/payable/finance lalu filter tanggal di memory.
- Sekarang: date range filter langsung di query database (`created_date` range).
- Ditambah dukungan filter `no_faktur` untuk report hutang/piutang.

File:
- `be/src/services/report.service.ts`
- `be/src/controllers/report.controller.ts`

#### C. Dashboard trend
- Sebelumnya: trend 7/30 hari hitung dari full read transaksi.
- Sekarang: hanya query data dalam range periode trend.

File:
- `be/src/services/dashboard.service.ts`

### 4) Index Hardening
Ditambahkan index untuk pola query aktif:
- `tt_jual_detail`: `created_date`, `kode_customer`, `nama_customer`, `status`
- `tt_beli_detail`: `created_date`, `kode_customer`, `nama_customer`, `status`
- `tt_piutang`: `created_date`, `kode_customer`, `sisa`
- `tt_hutang`: `created_date`, `kode_customer`, `sisa`

File:
- `be/src/models/SaleTransaction.ts`
- `be/src/models/PurchaseTransaction.ts`
- `be/src/models/Debt.ts`
- `be/src/models/Payable.ts`

### 5) Utility Hardening
- Date utility ditambah helper range string GMT+7.
- Pagination parser diperketat untuk handle `NaN` fallback aman.

File:
- `be/src/utils/date.ts`
- `be/src/utils/pagination.ts`
- `be/src/types/index.ts`

## Validasi
- Build backend berhasil:

```bash
cd be
npm run build
```

## Dampak Ke FE
- Tidak ada breaking perubahan payload utama endpoint.
- Tambahan query opsional baru:
  - `GET /api/v1/reports/debts?no_faktur=...`
  - `GET /api/v1/reports/payables?no_faktur=...`
  - `GET /api/v1/debts?no_faktur=...`
  - `GET /api/v1/payables?no_faktur=...`

## Catatan Lanjutan (Next Hardening)
- Pisahkan service layer menjadi `query-service` dan `command-service` untuk domain transaksi.
- Tambahkan integration test untuk endpoint kritikal (`transactions`, `reports`, `dashboard`).
- Tambahkan metrics latency p95/p99 dan error rate per endpoint (Prometheus/OpenTelemetry).
- Siapkan migration `created_date` string -> Date type native agar query index makin optimal.
