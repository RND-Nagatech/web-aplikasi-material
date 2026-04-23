# Styling Guide - UI/UX Changes

Dokumen ini menjelaskan semua perubahan styling yang telah dilakukan pada aplikasi. **PENTING**: Ikuti panduan ini untuk menjaga konsistensi UI/UX di seluruh aplikasi.

---

## 1. Sidebar Navigation

### Menu Styling
- **Default state**: Text dengan opacity rendah (`text-sidebar-foreground/60`)
- **Active state**: Text putih terang + font bold (`text-white font-semibold`)
- **Hover state**: Text berubah jadi putih (`hover:text-white`)
- **TIDAK ADA background kotak** pada menu aktif atau hover

### Implementasi
```tsx
<NavLink
  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:text-white"
  activeClassName="text-white font-semibold"
>
```

### Sub-menu (Dropdown)
- Sama seperti menu utama: cuma text yang berubah warna
- Tidak ada background kotak putih

**File**: `FE/src/components/layout/Sidebar.tsx`

---

## 2. Pagination Component

### Design Pattern
Format: `<< < 1 2 3 4 5 > >>`

### Tombol Navigation
- `<<` : Jump ke halaman pertama
- `<` : Mundur 1 halaman
- `>` : Maju 1 halaman
- `>>` : Jump ke halaman terakhir

### Numbered Buttons
- **Sliding window**: Maksimal 5 nomor halaman tampil
- **Active page**: Menggunakan variant `default` (background berbeda)
- **Inactive page**: Menggunakan variant `outline`

### Disabled State
- Opacity: `30%` (bukan 50%)
- Class: `disabled:opacity-30 disabled:cursor-not-allowed`

### Display Info
- Format: `1 / 5` (tanpa kata "Halaman")
- Gap antar elemen: `gap-1` (rapat)

**File**: `FE/src/components/common/TablePagination.tsx`

---

## 3. Card Component

### Border Radius
- **TIDAK ADA rounded corners**
- Semua card menggunakan bentuk kotak persegi
- Class: `border bg-card text-card-foreground shadow-sm` (tanpa `rounded-lg`)

**File**: `FE/src/components/ui/card.tsx`

---

## 4. Input Component

### Border Radius
- **TIDAK ADA rounded corners**
- Semua input field berbentuk kotak persegi
- Class: Hapus `rounded-md` dari className

**File**: `FE/src/components/ui/input.tsx`

---

## 5. Table Layout Pattern

### Structure
Semua halaman dengan table data harus mengikuti pattern ini:

```tsx
<Card className="overflow-hidden p-0">
  {/* 1. Black Header */}
  <div className="bg-black px-6 py-4 text-white">
    <h1 className="text-lg font-semibold">Judul Halaman</h1>
  </div>

  {/* 2. Filter Section */}
  <div className="flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
    {/* Search input dan action buttons */}
  </div>

  {/* 3. Table Area dengan background terpisah, padding, dan border */}
  <div className="p-6">
    <div className="border border-border bg-muted/20">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold text-foreground">Column</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Table rows */}
        </TableBody>
      </Table>

      {/* 4. Footer dengan total info */}
      <div className="flex items-center justify-between border-t border-border bg-background px-6 py-3">
        <p className="text-sm font-medium">Total: {count}</p>
      </div>

      {/* 5. Pagination */}
      <TablePagination {...props} />
    </div>
  </div>
</Card>
```

### Key Points
1. **Single Card Container**: Semua elemen dalam satu Card, tidak terpisah
2. **Black Header**: Background hitam dengan text putih
3. **Filter Section**: Background putih dengan border-bottom
4. **Table Wrapper**: Padding `p-6` untuk memberi jarak dari container utama
5. **Table Area**: 
   - Background `bg-muted/20` untuk visual separation
   - Border `border border-border` untuk garis pembatas
   - Table "mengambang" di dalam container dengan spacing di semua sisi
6. **Table Header**: Background `bg-muted/50` dengan text bold
7. **Footer**: Background putih (`bg-background`) dengan border-top
8. **No Rounded Corners**: Semua kotak persegi

### Visual Structure
```
┌─ Container ─────────────────────┐
│ Black Header                    │
├─────────────────────────────────┤
│ Filter Section                  │
├─────────────────────────────────┤
│                                 │
│   ┌─ Table View ─────────┐     │  <- Ada padding & border
│   │ Table Header         │     │
│   │ Table Body           │     │
│   │ Footer               │     │
│   │ Pagination           │     │
│   └──────────────────────┘     │
│                                 │
└─────────────────────────────────┘
```

**Contoh Implementasi**: `FE/src/features/products/ProductsPage.tsx`

---

## 6. Empty State

### Design
- Ilustrasi SVG simple (200x200px)
- Text "Tidak Ada Data" sebagai title
- Description optional

### Implementasi
```tsx
<EmptyState 
  title="Tidak Ada Data" 
  description="Deskripsi optional" 
/>
```

**File**: `FE/src/components/common/States.tsx`

---

## 7. Button Component

### Disabled State
- Untuk pagination buttons, gunakan opacity 30%
- Class: `disabled:opacity-30 disabled:cursor-not-allowed`

---

## Checklist untuk Halaman Baru

Saat membuat atau mengupdate halaman dengan table data:

- [ ] Gunakan single Card container dengan `p-0`
- [ ] Black header di paling atas
- [ ] Filter section dengan `border-b`
- [ ] Table wrapper dengan padding `p-6`
- [ ] Table area dengan `border border-border` dan `bg-muted/20`
- [ ] Table header dengan `bg-muted/50` dan text bold
- [ ] Footer dengan total info
- [ ] Pagination dengan format `<< < 1 2 3 > >>`
- [ ] Tidak ada rounded corners di Card, Input, atau elemen lain
- [ ] Empty state dengan ilustrasi
- [ ] Table "mengambang" dengan spacing dari container utama

---

## Files yang Sudah Diupdate

1. `FE/src/components/layout/Sidebar.tsx` - Menu navigation styling
2. `FE/src/components/common/TablePagination.tsx` - Numbered pagination
3. `FE/src/components/ui/card.tsx` - Remove rounded corners
4. `FE/src/components/ui/input.tsx` - Remove rounded corners
5. `FE/src/components/common/States.tsx` - Empty state dengan ilustrasi
6. `FE/src/features/products/ProductsPage.tsx` - Reference implementation

---

## Halaman yang Perlu Diupdate

Halaman-halaman berikut belum mengikuti pattern baru dan perlu diupdate:

- [ ] `FE/src/features/customers/CustomersPage.tsx`
- [ ] `FE/src/features/transactions/TransactionsPage.tsx`
- [ ] `FE/src/features/debts/DebtsPage.tsx`
- [ ] `FE/src/features/payables/PayablesPage.tsx`
- [ ] `FE/src/features/reports/StockReportPage.tsx`
- [ ] `FE/src/features/reports/PayableReportPage.tsx`
- [ ] `FE/src/features/reports/DebtReportPage.tsx`

**Gunakan `ProductsPage.tsx` sebagai referensi untuk update halaman-halaman ini.**

---

## Notes untuk Agent

- **Konsistensi adalah kunci**: Semua halaman harus mengikuti pattern yang sama
- **Jangan gunakan rounded corners**: Semua elemen berbentuk kotak persegi
- **Background separation**: Table area harus punya background berbeda dari filter section
- **Pagination**: Selalu gunakan numbered pagination dengan sliding window
- **Sidebar menu**: Hanya text yang berubah warna, tidak ada background kotak

---

**Last Updated**: April 2026
**Maintained by**: Development Team
