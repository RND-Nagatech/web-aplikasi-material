# Aplikasi Material - Frontend (FE)

Dokumentasi resmi frontend untuk project `web-aplikasi-material`.

## Ringkasan

Frontend ini dibangun dengan React + TypeScript + Vite untuk operasional toko material:

- autentikasi login/register
- master produk, pelanggan, dan toko
- transaksi jual/beli
- piutang/hutang + pembayaran
- dashboard ringkasan + tren 7 hari
- laporan stock, hutang, piutang, keuangan
- export PDF/Excel (dengan Web Worker untuk Excel)
- cetak/reprint nota PDF

## Stack Utama

- React 18
- TypeScript
- Vite
- Tailwind CSS + komponen shadcn/ui (Radix)
- React Query (`@tanstack/react-query`)
- React Hook Form + Zod
- Recharts
- jsPDF + `jspdf-autotable`
- ExcelJS (via Web Worker)
- MSW (opsional, mode mock)

## Struktur Folder Penting

- `src/App.tsx` - routing utama
- `src/features/` - fitur per domain
  - `auth`, `dashboard`, `products`, `customers`, `stores`, `transactions`, `debts`, `payables`, `reports`
- `src/services/` - HTTP client ke BE
- `src/components/` - reusable UI/layout
- `src/features/reports/export-engine/` - engine export PDF/Excel + worker
- `src/features/transactions/nota-pdf.ts` - generator nota
- `src/mocks/` - handler MSW
- `assets/` - aset UI/icon

## Routing Halaman

- `/login`
- `/` (dashboard)
- `/products`
- `/customers`
- `/stores`
- `/transactions`
- `/debts`
- `/payables`
- `/reports/stock`
- `/reports/debts`
- `/reports/payables`
- `/reports/finance`

## Environment Variables

Buat file `FE/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_ENABLE_MOCKS=false
```

Keterangan:

- `VITE_API_BASE_URL`: base API backend
- `VITE_ENABLE_MOCKS=true`: aktifkan MSW untuk development mock

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck
npm run test
npm run quality:gate
```

## Kontrak Data Penting

- Nilai uang ditampilkan format Rupiah (`Rp`)
- Nama produk/customer/alamat di-normalisasi uppercase pada alur input dan tetap divalidasi di backend
- Soft delete:
  - `is_active: true` = aktif
  - `is_active: false` = nonaktif/terhapus
- Laporan hutang/piutang sekarang memuat:
  - no faktur
  - nama customer/supplier
  - kode customer
  - tanggal
  - total, dibayar, sisa

## Export Engine

### PDF

- Render client-side (`jsPDF` + autoTable)
- Header laporan: info toko + judul + range tanggal
- Tabel dengan baris grand total
- Print date di footer

### Excel

- Generate di Web Worker (`excel.worker.ts`) supaya UI tetap responsif
- File langsung terunduh saat proses selesai
- Mendukung stock/hutang/piutang/keuangan

## Dashboard

- Kartu ringkasan utama
- Grafik stack bar tren 7 hari (penjualan vs pembelian)
- Tabel jatuh tempo piutang/hutang
- Empty state ditampilkan jika data belum ada

## Catatan Pengembangan

- Sidebar sudah responsive (mode kecil -> hamburger)
- Banyak route halaman di-lazy load untuk menekan initial bundle
- Suspense fallback sudah dibuat per-route (bukan full app), jadi saat pindah menu layout tidak kedip full layar
- Di halaman tabel utama ditambahkan `TableFetchProgress` (loading tipis di atas tabel) saat background refetch (`isFetching`) agar UX lebih halus
- Data ekspor diambil dari endpoint report, bukan dari state tabel mentah

## Integrasi Backend

Lihat dokumentasi backend:

- `be/Readme-BE.md`
- `docs/endpoint.md`
