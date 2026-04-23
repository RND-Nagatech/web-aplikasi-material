# Phase 3 - Frontend Modularization

Tanggal eksekusi: 2026-04-22 (Asia/Jakarta)
Scope: `FE/`

## Objective
- Kurangi kompleksitas file frontend terbesar.
- Pisahkan business logic dari page UI agar lebih mudah dirawat dan di-scale.
- Menjaga perilaku UI tetap sama (no regression fitur).

## Perubahan yang Diterapkan

### 1) Ekstraksi form contract transaksi
Dibuat module baru:
- `FE/src/features/transactions/transaction-form.ts`

Isi module:
- `transactionSchema`
- `TransactionFormValues`
- `TransactionFormOutput`
- `typeLabel()`
- `DEFAULT_PAGE_SIZE`

Dampak:
- Validasi form tidak lagi tertanam di page.
- Reusable untuk komponen transaksi lain (modal wizard, form inline, dsb).

### 2) Ekstraksi engine nota PDF
Dibuat module baru:
- `FE/src/features/transactions/nota-pdf.ts`

Isi module:
- `loadImageAsDataUrl()`
- `downloadNotaPdf()`
- `mapNotaItemsFromTransaction()`
- `NotaItem` type

Dampak:
- Logic rendering PDF (layout, watermark, page chunking) terpisah dari UI page.
- Reprint dan auto-download nota reuse mapper/function yang sama.

### 3) Refactor `TransactionsPage`
File:
- `FE/src/features/transactions/TransactionsPage.tsx`

Perubahan:
- Hapus blok schema + helper PDF dari page.
- Ganti import ke module `transaction-form` dan `nota-pdf`.
- Reuse mapper `mapNotaItemsFromTransaction()` untuk:
  - aksi reprint nota
  - auto-download setelah simpan transaksi

## Hasil Modularisasi

Sebelum:
- `TransactionsPage.tsx` = 1298 lines

Sesudah:
- `TransactionsPage.tsx` = 1007 lines
- `transaction-form.ts` = 24 lines
- `nota-pdf.ts` = 264 lines

## Validasi
- Build frontend sukses:

```bash
cd FE
npm run build
```

## Catatan Next (Phase 3.1)
- Split `TransactionDialog` menjadi komponen terpisah (`TransactionWizardDialog`).
- Split customer picker modal ke komponen dedicated (`CustomerPickerDialog`).
- Tambah shared hooks transaksi (`useTransactionDraft`, `useCustomerPicker`) untuk menekan state coupling di page utama.
