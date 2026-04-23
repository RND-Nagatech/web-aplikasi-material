# Phase 0 - Baseline & KPI (FE + BE)

Tanggal baseline: 2026-04-22 (Asia/Jakarta)
Project: Aplikasi Material
Scope: `FE/` + `be/`

## 1) Baseline Saat Ini

### 1.1 Build & Type Safety
- Backend build (`be`): ✅ sukses (`npm run build`)
- Frontend build (`FE`): ✅ sukses (`npm run build`)
- Catatan FE build: chunk utama masih sangat besar (`dist/assets/index-*.js` sekitar 2.45 MB; gzip ~717 KB)

### 1.2 Frontend Bundle Baseline
Dari output `vite build`:
- `index-*.js`: ~2,454 KB (gzip ~717 KB)
- `index.css`: ~64.86 KB (gzip ~11.48 KB)
- `logo_login.png`: ~1,346 KB
- `lunas_icon.png`: ~2,462 KB
- `belum_lunas_icon.png`: ~2,475 KB

Implikasi:
- Initial load di jaringan lambat/mobile bisa terasa berat.
- Perlu code splitting + optimasi aset gambar besar.

### 1.3 Kompleksitas Kode (Hotspot Ukuran File)
File terbesar saat ini:
- `FE/src/features/transactions/TransactionsPage.tsx`: **1298 lines**
- `FE/src/features/reports/FinanceReportPage.tsx`: **507 lines**
- `FE/src/features/reports/StockReportPage.tsx`: **454 lines**
- `FE/src/features/reports/PayableReportPage.tsx`: **447 lines**
- `FE/src/features/reports/DebtReportPage.tsx`: **447 lines**
- `be/src/services/transaction.service.ts`: **275 lines**
- `be/src/services/report.service.ts`: **240 lines**

Implikasi:
- Risiko regression tinggi karena business logic + UI + export masih bercampur dalam 1 file.

### 1.4 API Surface Baseline
Endpoint aktif di `be/src/server.ts` (prefix `/api/v1`):
- Auth: register, login, me
- Master: products, customers, stores
- Transaction: transactions
- Finance: debts, payables (+ payment)
- Dashboard: summary
- Reports: stock, debts, payables, finance

### 1.5 Query Pattern Risk Baseline (Scalability)
Temuan query yang berpotensi jadi bottleneck saat data membesar:
- `report.service.ts`
  - `Debt.find().sort(...).lean()` (tanpa pagination)
  - `Payable.find().sort(...).lean()` (tanpa pagination)
  - `SaleTransaction.find().sort(...).lean()` + `PurchaseTransaction.find().sort(...).lean()`
- `transaction.service.ts`
  - merge 2 koleksi transaksi di memory setelah full read
- `dashboard.service.ts`
  - trend dihitung dari full read transaksi

Implikasi:
- CPU/memory naik linear terhadap jumlah data.
- p95 latency akan memburuk signifikan saat growth.

### 1.6 Konsistensi Data Contract
Masih ada mismatch style naming antar layer:
- snake_case di BE model/API (`no_faktur_jual`, `kode_customer`)
- camelCase di FE domain model (`transactionId`, `customerName`)

Ini masih aman karena ada mapper, tapi butuh kontrak baku agar tidak drift.

### 1.7 Type Safety Debt
Masih ditemukan penggunaan `any` di titik penting:
- `be/src/services/product.service.ts`
- `be/src/services/customer.service.ts`
- `FE/src/components/layout/Sidebar.tsx`

### 1.8 Observability Baseline
- Sudah ada logger request middleware.
- Belum ada:
  - request-id correlation
  - structured JSON logging
  - metrik p95/p99
  - dashboard error rate / alerting

---

## 2) KPI Target (Sprint Refactor)

## KPI Backend
1. p95 latency endpoint list utama `< 300ms` pada dataset 10k transaksi.
2. p99 latency `< 700ms`.
3. Error rate endpoint `< 1%` per hari.
4. Endpoint list utama menggunakan server-side pagination/search/sort (no full-scan by default).

## KPI Frontend
1. Initial JS payload turun minimal **35%** dari baseline.
2. Main chunk (gzip) target `< 450KB`.
3. LCP target `< 2.5s` (jaringan normal desktop).
4. Semua page list besar memakai pagination server-side + skeleton/loading state konsisten.

## KPI Engineering Quality
1. Tidak ada `any` di service/domain core.
2. File feature page maksimal 400 lines (target), logic export dipisah modul.
3. Minimal test coverage:
- BE service/controller kritikal: 70%
- FE flow transaksi + laporan: smoke e2e untuk happy path.

---

## 3) Baseline Commands (Re-run)

Backend:
```bash
cd be
npm run build
```

Frontend:
```bash
cd FE
npm run build
```

Hitung file besar:
```bash
wc -l FE/src/features/**/*.tsx be/src/services/*.ts be/src/controllers/*.ts | sort -nr | head -n 30
```

Audit query pattern:
```bash
rg -n "\\.find\\(|\\.aggregate\\(|countDocuments\\(|skip\\(|limit\\(|sort\\(" be/src/services
```

---

## 4) Kesimpulan Fase 0

Status fase 0: ✅ **Selesai**

Yang sudah didapat:
- baseline build FE/BE
- baseline ukuran bundle FE
- hotspot kompleksitas file
- hotspot query scalability
- KPI target terukur untuk fase refactor berikutnya

Next action yang direkomendasikan (fase 1):
1. Pecah `TransactionsPage` dan semua exporter laporan ke modul terpisah.
2. Implement server-side search/pagination/sort penuh untuk transaksi/debt/payable/report list.
3. Tambahkan query optimization dan index sesuai query pattern real.
