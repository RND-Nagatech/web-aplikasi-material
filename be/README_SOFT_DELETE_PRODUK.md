# README Soft Delete Produk + Audit Trail

Dokumen ini menjelaskan perubahan terbaru pada fitur produk agar agent lain bisa melanjutkan pekerjaan tanpa salah asumsi.

## Ringkasan Perubahan

Perubahan utama:
- Produk **tidak di-hard-delete** lagi.
- Endpoint delete produk sekarang melakukan **soft delete**.
- Jika user input produk yang sama dengan data soft-delete, sistem memberi opsi **aktifkan kembali**.
- Ditambahkan field audit: siapa yang edit/hapus dan kapan.
- Timestamp audit disimpan dalam format **GMT+7**.

## Aturan Soft Delete (Penting)

Sesuai request saat implementasi ini:
- `is_active = false` -> produk **aktif** (normal, tampil di list).
- `is_active = true` -> produk **sudah dihapus** (soft-deleted, disembunyikan).

Catatan: ini berlawanan dengan penamaan umum `is_active`. Jangan dibalik tanpa migrasi menyeluruh.

## Field Baru di Model Produk

File model:
- `be/src/models/Product.ts`

Field yang ditambahkan:
- `is_active: boolean`
- `created_date: string`
- `edited_by: string`
- `edited_date: string`
- `deleted_by: string`
- `deleted_date: string`

Default saat create:
- `edited_by = "-"` 
- `edited_date = "-"` 
- `deleted_by = "-"` 
- `deleted_date = "-"` 

Field tanggal (`created_date`, `edited_date`, `deleted_date`) disimpan sebagai string format:
- `YYYY-MM-DD HH:mm:ss GMT+7`

## Utility Tanggal GMT+7

File:
- `be/src/utils/date.ts`

Fungsi:
- `formatGmt7()` untuk menghasilkan string tanggal audit GMT+7.

## Perubahan Service Produk

File:
- `be/src/services/product.service.ts`

Perilaku baru:
- `getAllProducts` hanya ambil produk aktif (`is_active: false`).
- `createProduct` set default:
  - `is_active: false`
  - `created_date: formatGmt7()`
  - `edited_by/edited_date/deleted_by/deleted_date` default `"-"`
- `createProduct` cek nama produk (case-insensitive):
  - jika ketemu data aktif -> return conflict `Nama produk sudah digunakan`
  - jika ketemu data soft-delete:
    - tanpa flag restore -> return conflict `RESTORE_CONFIRMATION_REQUIRED`
    - dengan flag `restore_existing = true` -> data lama diaktifkan lagi (`is_active: false`), update nilai stok/harga, dan tampil lagi di list
- `updateProduct` set:
  - `edited_by` dari user login
  - `edited_date: formatGmt7()`
- `deleteProduct` sekarang soft delete:
  - set `is_active: true`
  - set `deleted_by`
  - set `deleted_date: formatGmt7()`

## Perubahan Controller Produk

File:
- `be/src/controllers/product.controller.ts`

Perilaku:
- Endpoint `PUT /products/:id` meneruskan `req.user?.name` ke service untuk isi `edited_by`.
- Endpoint `DELETE /products/:id` meneruskan `req.user?.name` ke service untuk isi `deleted_by`.

## Dampak ke Modul Lain

### Transaksi
File:
- `be/src/services/transaction.service.ts`

Perubahan:
- Transaksi akan menolak produk non-aktif (`is_active: true`).
- Stock update pakai field model produk terbaru.

### Laporan Stok
File:
- `be/src/services/report.service.ts`

Perubahan:
- Laporan stok hanya menghitung produk aktif (`is_active: false`).

## Integrasi FE/MSW

Walau fokus dokumen ini backend, perubahan juga sudah disinkronkan ke FE mock:
- `FE/src/mocks/handlers.ts`

Mock sekarang mengikuti perilaku backend:
- delete produk = soft delete (`is_active: true`), bukan remove array.
- list produk hanya tampilkan `is_active: false`.
- isi `edited_by/edited_date/deleted_by/deleted_date` pada mock update/delete.
- create produk dengan nama yang sudah soft-delete akan return `RESTORE_CONFIRMATION_REQUIRED` sampai user konfirmasi restore.

## Checklist Saat Lanjut Development

Jika agent ingin menambah endpoint/fitur baru terkait produk:
1. Selalu filter produk aktif dengan `is_active: false` untuk data operasional.
2. Jangan hard-delete dokumen produk.
3. Isi field audit user (`edited_by`, `deleted_by`) dari user login.
4. Gunakan `formatGmt7()` untuk tanggal audit.
5. Pastikan transaksi/laporan tidak menarik produk yang sudah soft-delete.
6. Jika ada create dengan nama produk yang pernah dihapus, gunakan flow restore (`restore_existing = true`) bukan insert dokumen baru.

## Catatan Kompatibilitas

- Untuk model produk, `timestamps` mongoose sudah dimatikan (tidak ada `createdAt/updatedAt` baru).
- Field audit custom (`created_date`, `edited_date`, `deleted_date`) adalah sumber tanggal bisnis GMT+7.
