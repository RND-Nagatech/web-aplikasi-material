# Phase 6 - Quality Gate

Tanggal eksekusi: 2026-04-22 (Asia/Jakarta)  
Scope: `FE/` + `be/` + CI pipeline

## Objective
- Menetapkan quality gate yang bisa dijalankan lokal dan CI.
- Mencegah perubahan rusak masuk ke branch utama.
- Menambahkan guard untuk warning kritikal yang pernah muncul (duplikasi index mongoose).

## Perubahan yang Diterapkan

### 1) FE Quality Gate Script
File update:
- `FE/package.json`

Script baru:
- `typecheck`: `tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json`
- `quality:gate`: `npm run typecheck && npm run test && npm run build`
- `lint:advisory`: lint non-blocking untuk review manual.

Catatan:
- Lint FE saat ini masih mengandung legacy issues, jadi belum dijadikan blocker di gate utama.
- Gate utama memakai typecheck + test + build agar stabil dan actionable sekarang.

### 2) BE Quality Gate Script
File update:
- `be/package.json`

Script baru:
- `typecheck`: `tsc --noEmit`
- `quality:check-indexes`: cek duplikasi index mongoose
- `quality:gate`: `npm run typecheck && npm run build && npm run quality:check-indexes`

### 3) Duplicate Mongoose Index Checker
File baru:
- `be/src/scripts/check-duplicate-indexes.ts`

Fungsi:
- Deteksi field yang diindex dua kali (inline `index: true` dan `schema.index()` bersamaan).
- Jika ada duplikasi, script exit code `1` (fail quality gate).

### 4) Root Runner Script
File baru:
- `scripts/quality-gate.sh`

Fungsi:
- Menjalankan gate FE lalu BE secara berurutan.
- Dipakai untuk validasi lokal sebelum push.

### 5) CI Workflow
File baru:
- `.github/workflows/quality-gate.yml`

Fungsi:
- Trigger pada `pull_request` dan push ke `main/master`.
- Menjalankan:
  - install FE dependencies
  - install BE dependencies
  - `npm run quality:gate` di FE
  - `npm run quality:gate` di BE

## Perbaikan Tambahan untuk Lolos Typecheck
File update:
- `FE/src/features/reports/export-engine/excel-engine.ts`
- `FE/src/mocks/handlers.ts`

Perbaikan:
- Fix typing kolom excel header.
- Sinkronisasi tipe mock (`kode_customer`, `type_trx`) agar sesuai model terbaru.

## Validasi
Local quality gate sukses:

```bash
./scripts/quality-gate.sh
```

Hasil:
- FE: typecheck ✅, test ✅, build ✅
- BE: typecheck ✅, build ✅, duplicate-index check ✅

## Next Step (Phase 6.1)
- Bersihkan lint FE existing issues sampai `npm run lint` bisa jadi blocker di quality gate.
- Tambahkan integration smoke test backend untuk endpoint kritikal (`/health/ready`, `/api/v1/transactions`, laporan).
