# Phase 2 - Database Scalability

Tanggal eksekusi: 2026-04-22 (Asia/Jakarta)
Scope: `be/`

## Objective
- Meningkatkan performa query range/sort untuk data besar.
- Menyiapkan jalur migrasi aman dari field tanggal string ke Date native tanpa mematahkan API FE.
- Menambahkan operasional script untuk backfill data lama + sinkronisasi index.

## Perubahan Arsitektur DB

### 1) Tambah field timestamp native
Semua koleksi inti sekarang memiliki field opsional baru:
- `created_date_ts: Date`

Koleksi/model yang diupdate:
- `tm_produk` (`be/src/models/Product.ts`)
- `tm_customer` (`be/src/models/Customer.ts`)
- `tm_toko` (`be/src/models/Store.ts`)
- `tt_jual_detail` (`be/src/models/SaleTransaction.ts`)
- `tt_beli_detail` (`be/src/models/PurchaseTransaction.ts`)
- `tt_piutang` (`be/src/models/Debt.ts`)
- `tt_hutang` (`be/src/models/Payable.ts`)

### 2) Write path sinkronisasi timestamp
Semua proses create data baru sekarang otomatis set:
- `created_date` (string GMT+7, kompatibilitas lama)
- `created_date_ts` (Date native, untuk index/query)

Service yang diupdate:
- `be/src/services/product.service.ts`
- `be/src/services/customer.service.ts`
- `be/src/services/store.service.ts`
- `be/src/services/transaction.service.ts`

### 3) Query path migrasi bertahap (dual-read)
Query report/dashboard sekarang memakai strategi dual-read agar transisi aman:
- Utama: filter/sort lewat `created_date_ts`
- Fallback: tetap baca `created_date` string untuk dokumen lama yang belum ter-backfill

Service yang diupdate:
- `be/src/services/report.service.ts`
- `be/src/services/dashboard.service.ts`
- `be/src/services/debt.service.ts`
- `be/src/services/payable.service.ts`
- `be/src/services/transaction.service.ts`

### 4) Hardening index
Index ditambah untuk pola akses utama (sort terbaru, filter status, filter customer, due/open):
- Transaksi jual/beli: `created_date_ts`, `status + created_date_ts`, `kode_customer + created_date_ts`
- Piutang/Hutang: `created_date_ts`, `sisa + created_date_ts`
- Master data: `created_date_ts`, serta kombinasi active-state di produk/customer

## Operasional Script Baru

### A. Backfill field `created_date_ts`
Script ini mengisi `created_date_ts` dari `created_date` pada data lama.

```bash
cd be
npm run db:backfill:created-date-ts
```

File:
- `be/src/scripts/backfill-created-date-ts.ts`

### B. Sinkronisasi index
Script ini menjalankan `syncIndexes()` ke model utama.

```bash
cd be
npm run db:sync-indexes
```

File:
- `be/src/scripts/sync-indexes.ts`

## Urutan Rollout Production (disarankan)
1. Deploy code backend terbaru.
2. Jalankan backfill:
- `npm run db:backfill:created-date-ts`
3. Jalankan sinkronisasi index:
- `npm run db:sync-indexes`
4. Restart service backend.
5. Verifikasi endpoint kritikal (`transactions`, `reports/*`, `dashboard/summary`).

## Validasi Build
```bash
cd be
npm run build
```
Status: ✅ sukses

## Catatan Kompatibilitas
- Payload API ke FE tidak diubah (backward compatible).
- Field `created_date` tetap dipertahankan.
- `created_date_ts` dipakai internal untuk performa query.

## Next Step (Phase 2.1)
- Setelah seluruh data lama sudah ter-backfill, ubah query ke mode full `created_date_ts` only (hapus fallback string) untuk performa maksimal.
- Tambah benchmark script (`explain` + latency sampling) per endpoint list/report.
