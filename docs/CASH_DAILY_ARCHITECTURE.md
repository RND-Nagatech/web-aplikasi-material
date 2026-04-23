# Cash Daily Architecture (tt_cash_daily + th_cash_daily)

Tanggal implementasi: 2026-04-22 (Asia/Jakarta)

## Tujuan
- `tt_cash_daily` hanya menyimpan ringkasan kas **hari aktif saat ini**.
- Saat ganti tanggal (GMT+7), data hari sebelumnya dipindahkan ke `th_cash_daily`.
- Laporan keuangan rekap membaca ringkasan harian agar scalable jangka panjang.

## Collection

### 1) `tt_cash_daily` (current)
Model: `be/src/models/CashDailyCurrent.ts`

Field utama:
- `tanggal` (YYYY-MM-DD, GMT+7, unique)
- `saldo_awal`
- `uang_masuk`
- `uang_keluar`
- `saldo_akhir`
- `is_closed`
- `closed_at`
- `created_date`, `updated_date`
- `created_date_ts`, `updated_date_ts`

### 2) `th_cash_daily` (history)
Model: `be/src/models/CashDailyHistory.ts`

Field sama dengan current, tetapi merepresentasikan hari yang sudah closed.

## Rollover Logic
Service: `be/src/services/cash-daily.service.ts`

Fungsi utama:
- `ensureCurrentCashDaily()`
  - memastikan dokumen hari ini tersedia di `tt_cash_daily`.
  - jika dokumen current masih tanggal kemarin, otomatis:
    1. archive ke `th_cash_daily` (upsert by tanggal)
    2. hapus current lama
    3. buat current baru tanggal hari ini dengan `saldo_awal = saldo_akhir kemarin`

- `runCashDailyRollover()`
  - dipakai scheduler/background untuk memicu rollover periodik.

- `recordCashMovement({ type, amount })`
  - dipanggil saat transaksi berhasil disimpan.
  - `jual` menambah `uang_masuk`.
  - `beli` menambah `uang_keluar`.
  - `saldo_akhir` dihitung otomatis (`saldo_awal + uang_masuk - uang_keluar`).

## Integrasi Runtime
File: `be/src/server.ts`

- Scheduler rollover tiap 60 detik (`runCashDailyRollover`).
- Lazy fallback tetap ada karena laporan dan transaksi juga memanggil `ensureCurrentCashDaily`.

## Integrasi Transaksi
File: `be/src/services/transaction.service.ts`

Setelah transaksi tersimpan (masih dalam DB transaction session):
- panggil `recordCashMovement({ type, amount: total })`

## Integrasi Laporan Keuangan
File: `be/src/services/report.service.ts`

- `getFinanceReport()` sekarang:
  - tetap support `type=rekap|detail`.
  - **summary** (`saldo_awal`, `uang_masuk`, `uang_keluar`, `saldo_akhir`) diambil dari `tt_cash_daily` + `th_cash_daily`.
  - `rekap` menggunakan angka ringkasan harian (bukan scan raw transaksi besar).
  - `detail` tetap tampilkan detail invoice dari `tt_jual_detail` + `tt_beli_detail`.

## Kenapa Ini Scalable
- Query rekap tidak full scan transaksi historis lagi.
- Raw transaksi tetap disimpan untuk audit/detail.
- Ringkasan harian jadi materialized snapshot yang ringan dibaca.

## Catatan Operasional
- Time basis: GMT+7.
- `tanggal` jadi source of partition alami harian.
- Rollover aman di kondisi concurrent via upsert + duplicate key handling.

## Backfill Data Lama (Wajib Sekali Saat Deploy)
Jika sebelumnya belum ada `tt_cash_daily`/`th_cash_daily`, jalankan:

```bash
cd be
npm run db:backfill:cash-daily
```

Script akan:
- hitung ulang ringkasan harian dari `tt_jual_detail` + `tt_beli_detail`,
- isi histori ke `th_cash_daily`,
- pastikan hanya hari aktif yang tersisa di `tt_cash_daily`.
