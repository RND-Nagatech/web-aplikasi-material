# Aplikasi Material (FE)

Dokumentasi frontend aplikasi (React + TypeScript + Vite). README ini menjelaskan teknologi, struktur folder, tipe data utama, cara instalasi dan menjalankan aplikasi untuk pengembang lain di tim.

## Ringkasan Project

- Frontend single-page application menggunakan React + TypeScript.
- UI dibangun dengan Tailwind CSS dan komponen Radix UI (via wrapper shadcn/ui).
- State & fetching: `@tanstack/react-query`.
- Form: `react-hook-form` + `zod` untuk validasi.
- Ekspor laporan: `jspdf` + `jspdf-autotable` untuk PDF, `exceljs` untuk Excel.
- Mock API untuk development: `msw` (Mock Service Worker) yang ditempatkan di `public/mockServiceWorker.js`.

## Teknologi Utama

- Node.js + npm
- Vite
- React 18 + TypeScript
- Tailwind CSS
- Radix UI (komponen dasar)
- @tanstack/react-query, react-hook-form, zod
- jsPDF, jspdf-autotable, ExcelJS

## Struktur Folder (ringkasan)

- `src/` — kode sumber frontend
  - `components/` — komponen UI dan wrapper (button, tooltip, select, dsb.)
  - `features/` — fitur terpisah (auth, customers, products, transactions, reports)
  - `hooks/` — custom hooks
  - `lib/` — helper (format, api-client, utils)
  - `services/` — client HTTP ke API (dipanggil oleh fitur)
  - `mocks/` — MSW handlers for local development
  - `pages/` — halaman aplikasi
  - `assets/` — gambar/icon (direkomendasikan pindahkan ke `src/assets` untuk kompatibilitas Vite)

## Tipe Data & Model (di FE — tipe TypeScript)

Berikut ringkasan tipe yang digunakan di FE (lihat `src/types/index.ts` untuk definisi lengkap):

- `Customer`
  - `id` (string)
  - `nama_customer` (string)
  - `no_hp` (string)
  - `alamat` (string)
  - `is_active` (boolean)
  - `created_date` (string | ISO)
  - `edited_by`, `edited_date`, `deleted_by`, `deleted_date` (audit fields)

- `Product`
  - `id`, `kodeProduk`, `name`, `retailPrice`, `wholesalePrice`, `stock`, dll.

- `Transaction`
  - `id`, `type` ('sale'|'purchase'), `invoiceNumber`, `customerId`, `customerName`, `items[]`, `total`, `paid`, `change`, `createdAt`
  - `items[]` -> `{ productId, productName, quantity, unitPrice, subtotal }`

- `Debt` / `Payable`
  - entitas yang merekam hutang/piutang dengan field tanggal, nominal, keterangan, dan status pelunasan.

Catatan: FE mengharapkan format tanggal ISO dan sejumlah field yang sesuai respons API. Beberapa modul melakukan mapping (mis. UPPERCASE untuk `nama_produk`/`type_trx`) agar konsisten.

## Environment Variables (FE)

- `VITE_API_BASE_URL` — base URL ke API backend (contoh: `http://localhost:3000/api`)

Jika menggunakan `.env` di FE, buat file `.env.local` di folder `FE/` dan tambahkan:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

## Prasyarat

- Node.js (LTS) — disarankan >= 18
- npm atau yarn
- Backend dan MongoDB berjalan untuk fitur yang membutuhkan API nyata. Untuk development tanpa backend, gunakan MSW (mock) yang sudah disertakan.

## Instalasi & Menjalankan (Development)

1. Pastikan `MONGO` dan `BE` server berjalan (lihat `be/README.md`).
2. Masuk ke folder FE dan pasang dependensi:

```bash
cd FE
npm install
```

3. Jalankan development server Vite:

```bash
npm run dev
```

Vite biasanya akan berjalan di `http://localhost:5173` (cek output terminal).

## Build & Preview (Production)

```bash
npm run build
npm run preview
```

`npm run preview` menjalankan hasil build secara lokal untuk pengecekan sebelum deploy.

## Test & Lint

- Jalankan test:

```bash
npm run test
```

- Jalankan ESLint:

```bash
npm run lint
```

## Catatan Pengembangan & Tips

- Jika ikon/asset tidak muncul atau Vite menolak import dari luar `src`, pindahkan `FE/assets/*` ke `FE/src/assets/*` dan update path import di komponen.
- Export PDF/Excel: perhatikan bahwa `jspdf-autotable` membutuhkan `RowInput[]` tipe untuk menghindari error TypeScript saat memasukkan objek ke `tableBody`.
- Tooltip kecil: gunakan `TooltipContent` dengan `className` khusus (`px-1 py-0.5`) untuk icon-only tooltips.
- Jika dev server keluar dengan `Exit Code 130`, artinya proses dihentikan (biasanya Ctrl-C). Jalankan ulang `npm run dev`.

## Kontribusi

- Ikuti pola folder `features/` untuk menambah modul baru.
- Gunakan `react-query` untuk data fetching dan cache.
- Buat type di `src/types/index.ts` setiap kali menambah model.

--
Dokumentasi ini adalah ringkasan yang cukup lengkap untuk pengembang frontend. Untuk instruksi backend dan variabel environment yang lebih detail, lihat `be/Readme.md`.
