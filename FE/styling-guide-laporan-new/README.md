# Styling Guide Laporan (New)

Dokumen ini adalah acuan wajib untuk menyamakan **Laporan Hutang/Piutang** agar perilaku, layout, dan format export **sama persis** dengan **Laporan Stock**.

## Source of Truth

- Halaman referensi: `FE/src/features/reports/StockReportPage.tsx`
- Service laporan: `FE/src/services/reports.ts`
- Service data toko (header export): `FE/src/services/stores.ts`
- Asset state:
  - `FE/assets/cari data.svg`
  - `FE/assets/empty.svg`

## Pola UI dan State (Wajib Sama)

- State utama:
  - `dateFrom`, `dateTo`
  - `submittedFilter`
  - `filterError`
  - `search`
  - `page`, `pageSize`
- Default tanggal: hari ini (`new Date().toISOString().slice(0, 10)`).
- Validasi:
  - tanggal awal/akhir wajib diisi
  - `dateFrom <= dateTo`
  - `max={dateTo}` di input awal
  - `min={dateFrom}` di input akhir
- Query report:
  - `enabled: submittedFilter !== null`
  - jika klik `Cari Data` dengan filter sama -> `refetch()`

## Urutan Render State (Jangan Diubah)

1. `submittedFilter === null` -> placeholder "Silahkan cari data..." + icon `cari data`.
2. `isLoading || isFetching` -> `TableSkeleton` di area tabel.
3. Error -> `ErrorState`.
4. Data kosong -> icon `empty` + pesan.
5. Data ada -> tabel + total + pagination.

## Posisi Tombol Export

- Tombol export ada **di bawah box tabel**, tapi masih **di dalam container card laporan**.
- Tombol tampil hanya jika `submittedFilter !== null`.
- Layout tombol:
  - grid 2 kolom (`sm:grid-cols-2`)
  - panjang sama (`w-full`)
  - kiri: PDF merah
  - kanan: Excel hijau

## Rule Enable/Disable Tombol Export

Gunakan `canExport` seperti ini:

- `submittedFilter !== null`
- `!isLoading`
- `!isFetching`
- `!isError`
- `filtered.length > 0`

Jika `canExport === false`:

- tombol disabled
- warna redup (disabled state)
- tidak bisa klik

## Standar Export PDF (Wajib Sama)

- Klik tombol langsung download file.
- Nama file: `LAPORAN STOCK.pdf` (untuk laporan lain ganti sesuai menu).
- Header PDF:
  - kiri: `nama_toko`, `alamat`, `no_hp`
  - kanan: nama laporan + range tanggal filter
- Tabel:
  - header abu-abu
  - isi data per baris
  - baris terakhir harus **GRAND TOTAL** di tabel yang sama (bukan tabel terpisah)
  - label total merge kolom pertama+kedua
  - total tiap kolom angka sejajar per kolom
- Footer:
  - `Print Date : dd/mm/yyyy` sesuai waktu klik export

## Standar Export Excel (Wajib Sama)

- Klik tombol langsung download file.
- Nama file: `LAPORAN STOCK.xlsx` (untuk laporan lain ganti sesuai menu).
- Header Excel centered:
  - baris 1: nama laporan
  - baris 2: tanggal filter (`Tanggal : from s/d to`)
  - baris 3: nama toko saja
- Tabel:
  - header abu-abu + border tipis
  - data baris normal
  - baris **GRAND TOTAL** di bawah tabel data
  - nilai total kolom angka dihitung dan ditaruh di kolom masing-masing
- Footer:
  - `Print Date : dd/mm/yyyy`

## Data Toko untuk Header Export

- Ambil dari `storesService.list()`.
- Saat ini pakai record pertama untuk header report.
- Jika kosong, fallback ke `-`.

## Dependency FE yang Dipakai

- PDF:
  - `jspdf`
  - `jspdf-autotable`
- Excel:
  - `exceljs`

## Checklist Copy ke Laporan Lain

- Copy pola state/filter/search/pagination dari Stock.
- Copy urutan render state 1-5.
- Copy posisi tombol export dan rule `canExport`.
- Adaptasi kolom tabel + mapping total sesuai domain laporan.
- Samakan format header export:
  - nama laporan
  - rentang tanggal filter
  - info toko (PDF lengkap, Excel nama toko saja)
- Tambahkan baris grand total di tabel (PDF & Excel).
- Tambahkan print date.
- Nama file export disesuaikan menu:
  - contoh: `LAPORAN HUTANG.pdf/.xlsx`, `LAPORAN PIUTANG.pdf/.xlsx`

## Catatan Integrasi Backend

- Endpoint report wajib support query:
  - `date_from`
  - `date_to`
- Filter tanggal harus benar-benar diterapkan.
- Jangan mengembalikan data semua tanggal jika user sudah memilih range.

## Ringkasan untuk Agent

Target implementasi laporan lain: hasil UX, state, dan format export harus identik dengan Laporan Stock. Jika ragu, jadikan `StockReportPage.tsx` sebagai template utama, bukan membuat pola baru.
