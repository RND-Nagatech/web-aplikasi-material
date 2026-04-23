# Phase 4 - Export Engine Refactor

## Tujuan
Menstandarkan logic export PDF/Excel laporan agar:
- tidak ada duplikasi besar antar halaman report,
- style export konsisten,
- maintenance dan scaling fitur report lebih cepat.

## Scope
Refactor khusus FE untuk modul laporan:
- Stock Report
- Piutang Report
- Hutang Report
- Keuangan Report (Rekap + Detail)

## Arsitektur Baru
Engine baru berada di:
- `FE/src/features/reports/export-engine/pdf-engine.ts`
- `FE/src/features/reports/export-engine/excel-engine.ts`
- `FE/src/features/reports/export-engine/file-download.ts`

### PDF Engine (`pdf-engine.ts`)
Fungsi utama:
- `createLandscapePdf()`
- `drawStandardReportHeader()`
- `renderReportTablePdf()`
- `drawPdfPrintDate()`
- `savePdfFile()`

Standar yang dicapai:
- format A4 landscape,
- header toko + judul + rentang tanggal,
- table render reusable,
- print date reusable.

### Excel Engine (`excel-engine.ts`)
Fungsi utama:
- `createWorkbook()`
- `addStandardExcelHeader()`
- `styleHeaderRow()`
- `applyBorderRow()`
- `addExcelPrintDateRow()`
- `downloadWorkbook()`

Konstanta standar:
- `EXCEL_BORDER`
- `EXCEL_HEADER_FILL`
- `EXCEL_TOTAL_FILL`
- `NUM_FMT_RUPIAH`
- `NUM_FMT_NUMBER`

### File Download (`file-download.ts`)
- `downloadBlob()`
- `downloadExcelBuffer()`

Digunakan sebagai util umum agar implementasi download file tidak berulang.

## Perubahan Halaman Laporan
Sudah di-migrasi menggunakan export engine baru:
- `FE/src/features/reports/StockReportPage.tsx`
- `FE/src/features/reports/DebtReportPage.tsx`
- `FE/src/features/reports/PayableReportPage.tsx`
- `FE/src/features/reports/FinanceReportPage.tsx`

## Dampak Positif
- Perubahan style export global cukup dari satu lokasi engine.
- Pengembangan report baru lebih cepat (fokus di data mapping saja).
- Risiko mismatch style PDF/Excel antar laporan berkurang.

## Panduan Extend ke Laporan Baru
1. Buat mapping data -> `RowInput[]` untuk PDF dan `worksheet rows` untuk Excel.
2. Selalu pakai `drawStandardReportHeader()` dan `addStandardExcelHeader()`.
3. Gunakan `EXCEL_*` constants untuk border/fill/format angka.
4. Simpan file via `savePdfFile()` dan `downloadWorkbook()`.
5. Hindari implementasi manual `Blob`/`URL.createObjectURL` di page report.

## Verifikasi
Build FE:
```bash
cd FE
npm run build
```
Hasil: sukses build tanpa error TypeScript.
