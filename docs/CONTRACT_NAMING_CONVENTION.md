# Contract & Naming Convention (Freeze)

Dokumen ini membakukan penamaan antar FE/BE untuk mencegah drift saat refactor.

## 1) API Response Contract
- API external (HTTP) menggunakan **snake_case** pada field yang datang dari DB lama.
- FE wajib mapping ke **camelCase** di layer service mapper.
- Komponen UI dilarang akses raw snake_case langsung dari axios response.

## 2) Frontend Domain Model
- Semua type di `FE/src/types` wajib camelCase.
- Contoh:
  - `transactionId`
  - `customerName`
  - `createdAt`

## 3) Backend Internal Model
- Mongo schema boleh tetap menggunakan field existing (`kode_customer`, `no_faktur_jual`, dst) untuk kompatibilitas data.
- Di service/controller, jika expose ke FE, lakukan mapping konsisten di satu tempat.

## 4) Date/Time Standard
- Untuk display user: `GMT+7` (Asia/Jakarta).
- Untuk filter/query API: kirim ISO UTC start/end day dari FE.
- Hindari parse tanggal berulang di banyak tempat; gunakan helper util terpusat.

## 5) Currency Standard
- Semua nominal di storage: number (integer rupiah).
- Semua nominal di UI/PDF/Excel: formatter `Rp` + pemisah ribuan.

## 6) No-Faktur Usage
- Field no faktur wajib jadi search key pada:
  - transaksi
  - hutang/piutang
  - laporan hutang/piutang

## 7) Refactor Rule
- Jika menambah endpoint baru, wajib:
  1. type request/response
  2. mapper FE
  3. update dokumentasi endpoint
