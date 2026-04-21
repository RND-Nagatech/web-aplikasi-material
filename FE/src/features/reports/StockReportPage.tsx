import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { TablePagination } from "@/components/common/TablePagination";
import { ErrorState } from "@/components/common/States";
import { formatCurrency, formatNumber } from "@/lib/format";
import { reportsService } from "@/services/reports";
import { storesService } from "@/services/stores";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RowInput } from "jspdf-autotable";
import ExcelJS from "exceljs";
import searchDataIcon from "../../../assets/cari data.svg";
import emptyDataIcon from "../../../assets/empty.svg";

const DEFAULT_PAGE_SIZE = 10;
const TODAY = new Date().toISOString().slice(0, 10);

export default function StockReportPage() {
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo] = useState(TODAY);
  const [search, setSearch] = useState("");
  const [submittedFilter, setSubmittedFilter] = useState<{ dateFrom?: string; dateTo?: string } | null>(null);
  const [filterError, setFilterError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const stockQ = useQuery({
    queryKey: ["reports", "stock", submittedFilter],
    queryFn: () => reportsService.stock(submittedFilter ?? undefined),
    enabled: submittedFilter !== null,
  });
  const storesQ = useQuery({
    queryKey: ["stores", "report-header"],
    queryFn: storesService.list,
  });

  const items = stockQ.data?.items ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((it) => (it.name ?? "").toLowerCase().includes(q)) : items;
  }, [items, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, submittedFilter]);

  const onSearch = () => {
    if (!dateFrom || !dateTo) {
      setFilterError("Silahkan pilih tanggal awal dan tanggal akhir terlebih dahulu.");
      return;
    }
    if (dateFrom > dateTo) {
      setFilterError("Tanggal awal tidak boleh lebih dari tanggal akhir.");
      return;
    }

    setFilterError("");
    const nextFilter = {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    };

    const isSameFilter =
      submittedFilter?.dateFrom === nextFilter.dateFrom
      && submittedFilter?.dateTo === nextFilter.dateTo;

    if (isSameFilter) {
      void stockQ.refetch();
      return;
    }

    setSubmittedFilter(nextFilter);
  };

  const canExport =
    submittedFilter !== null
    && !stockQ.isLoading
    && !stockQ.isFetching
    && !stockQ.isError
    && filtered.length > 0;

  const exportPdf = () => {
    const store = storesQ.data?.[0];
    const reportDateFrom = submittedFilter?.dateFrom ?? dateFrom;
    const reportDateTo = submittedFilter?.dateTo ?? dateTo;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text((store?.nama_toko ?? "-").toUpperCase(), 40, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Alamat : ${(store?.alamat ?? "-").toUpperCase()}`, 40, 70);
    doc.text(`No HP  : ${store?.no_hp ?? "-"}`, 40, 86);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("LAPORAN STOCK", pageWidth - 40, 50, { align: "right" });
    doc.setFontSize(13);
    doc.text(`TANGGAL : ${reportDateFrom} s/d ${reportDateTo}`, pageWidth - 40, 72, { align: "right" });

    const totalStok = filtered.reduce((sum, item) => sum + item.stock, 0);
    const totalHargaGrosir = filtered.reduce((sum, item) => sum + item.wholesalePrice, 0);
    const totalHargaEceran = filtered.reduce((sum, item) => sum + item.retailPrice, 0);
    const totalNilaiStokGrosir = filtered.reduce((sum, item) => sum + item.stock * item.wholesalePrice, 0);

    const tableBody: RowInput[] = filtered.map((item, index) => [
      String(index + 1),
      item.name,
      formatNumber(item.stock),
      formatCurrency(item.wholesalePrice),
      formatCurrency(item.retailPrice),
      formatCurrency(item.stock * item.wholesalePrice),
    ]);

    tableBody.push([
      { content: `GRAND TOTAL : ${totalItems}`, colSpan: 2, styles: { halign: "left", fontStyle: "bold" } },
      { content: formatNumber(totalStok), styles: { halign: "right", fontStyle: "bold" } },
      { content: formatCurrency(totalHargaGrosir), styles: { halign: "right", fontStyle: "bold" } },
      { content: formatCurrency(totalHargaEceran), styles: { halign: "right", fontStyle: "bold" } },
      { content: formatCurrency(totalNilaiStokGrosir), styles: { halign: "right", fontStyle: "bold" } },
    ]);

    autoTable(doc, {
      startY: 110,
      head: [["No", "Produk", "Stok", "Harga Grosir", "Harga Eceran", "Nilai Stok (Grosir)"]],
      body: tableBody,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 6,
        lineColor: [180, 180, 180],
        lineWidth: 0.4,
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [20, 20, 20],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 56 },
        2: { halign: "right", cellWidth: 80 },
        3: { halign: "right", cellWidth: 120 },
        4: { halign: "right", cellWidth: 120 },
        5: { halign: "right", cellWidth: 150 },
      },
      didParseCell: (data) => {
        const isGrandTotalRow = data.section === "body" && data.row.index === tableBody.length - 1;
        if (isGrandTotalRow) {
          data.cell.styles.fillColor = [245, 245, 245];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const printedDate = new Date().toLocaleDateString("id-ID");
    const footerY = ((doc as any).lastAutoTable?.finalY ?? 120) + 20;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text(`Print Date : ${printedDate}`, 40, footerY);

    doc.save("LAPORAN STOCK.pdf");
  };

  const exportExcel = async () => {
    const store = storesQ.data?.[0];
    const reportDateFrom = submittedFilter?.dateFrom ?? dateFrom;
    const reportDateTo = submittedFilter?.dateTo ?? dateTo;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("LAPORAN STOCK");

    worksheet.columns = [
      { width: 8 },
      { width: 34 },
      { width: 14 },
      { width: 18 },
      { width: 18 },
      { width: 22 },
    ];

    worksheet.mergeCells("A1:F1");
    worksheet.getCell("A1").value = "LAPORAN STOCK";
    worksheet.getCell("A1").font = { bold: true, size: 16 };
    worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A2:F2");
    worksheet.getCell("A2").value = `Tanggal : ${reportDateFrom} s/d ${reportDateTo}`;
    worksheet.getCell("A2").font = { bold: true, size: 12 };
    worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A3:F3");
    worksheet.getCell("A3").value = `${store?.nama_toko ?? "-"}`;
    worksheet.getCell("A3").font = { bold: true, size: 12 };
    worksheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

    const headerRow = worksheet.addRow(["No", "Produk", "Stok", "Harga Grosir", "Harga Eceran", "Nilai Stok (Grosir)"]);
    const headerRowNumber = headerRow.number;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5E5E5" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFBFBFBF" } },
        left: { style: "thin", color: { argb: "FFBFBFBF" } },
        bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
        right: { style: "thin", color: { argb: "FFBFBFBF" } },
      };
    });

    filtered.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,
        item.name,
        item.stock,
        item.wholesalePrice,
        item.retailPrice,
        item.stock * item.wholesalePrice,
      ]);
      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(3).alignment = { horizontal: "right" };
      row.getCell(4).alignment = { horizontal: "right" };
      row.getCell(5).alignment = { horizontal: "right" };
      row.getCell(6).alignment = { horizontal: "right" };
      row.getCell(4).numFmt = '"Rp" #,##0';
      row.getCell(5).numFmt = '"Rp" #,##0';
      row.getCell(6).numFmt = '"Rp" #,##0';
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFBFBFBF" } },
          left: { style: "thin", color: { argb: "FFBFBFBF" } },
          bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
          right: { style: "thin", color: { argb: "FFBFBFBF" } },
        };
      });
    });

    const totalStok = filtered.reduce((sum, item) => sum + item.stock, 0);
    const totalHargaGrosir = filtered.reduce((sum, item) => sum + item.wholesalePrice, 0);
    const totalHargaEceran = filtered.reduce((sum, item) => sum + item.retailPrice, 0);
    const totalNilaiStokGrosir = filtered.reduce((sum, item) => sum + item.stock * item.wholesalePrice, 0);

    const grandTotalRow = worksheet.addRow([
      `GRAND TOTAL : ${totalItems}`,
      "",
      totalStok,
      totalHargaGrosir,
      totalHargaEceran,
      totalNilaiStokGrosir,
    ]);
    worksheet.mergeCells(`A${grandTotalRow.number}:B${grandTotalRow.number}`);
    grandTotalRow.getCell(1).font = { bold: true };
    grandTotalRow.getCell(1).alignment = { horizontal: "left" };
    grandTotalRow.getCell(3).alignment = { horizontal: "right" };
    grandTotalRow.getCell(4).alignment = { horizontal: "right" };
    grandTotalRow.getCell(5).alignment = { horizontal: "right" };
    grandTotalRow.getCell(6).alignment = { horizontal: "right" };
    grandTotalRow.getCell(3).font = { bold: true };
    grandTotalRow.getCell(4).font = { bold: true };
    grandTotalRow.getCell(5).font = { bold: true };
    grandTotalRow.getCell(6).font = { bold: true };
    grandTotalRow.getCell(4).numFmt = '"Rp" #,##0';
    grandTotalRow.getCell(5).numFmt = '"Rp" #,##0';
    grandTotalRow.getCell(6).numFmt = '"Rp" #,##0';
    grandTotalRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F3F3" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFBFBFBF" } },
        left: { style: "thin", color: { argb: "FFBFBFBF" } },
        bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
        right: { style: "thin", color: { argb: "FFBFBFBF" } },
      };
    });

    const printDateRow = worksheet.addRow([`Print Date : ${new Date().toLocaleDateString("id-ID")}`]);
    worksheet.mergeCells(`A${printDateRow.number}:F${printDateRow.number}`);
    printDateRow.getCell(1).font = { italic: true, size: 10 };
    printDateRow.getCell(1).alignment = { horizontal: "left" };

    for (let i = 1; i <= 3; i += 1) {
      worksheet.getRow(i).height = 22;
    }
    worksheet.getRow(headerRowNumber).height = 24;
    worksheet.views = [{ state: "frozen", ySplit: headerRowNumber }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "LAPORAN STOCK.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Card className="overflow-hidden p-0">
        <div className="bg-primary px-6 py-4 text-primary-foreground">
          <h1 className="text-lg font-semibold">Laporan Stock</h1>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-end">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="w-full max-w-[210px]">
            <label htmlFor="dateFrom" className="mb-1 block text-xs text-muted-foreground">Tanggal Awal</label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="w-full max-w-[210px]">
            <label htmlFor="dateTo" className="mb-1 block text-xs text-muted-foreground">Tanggal Akhir</label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Button onClick={onSearch} className="rounded-none">Cari Data</Button>
        </div>
        {filterError && (
          <div className="border-b border-border bg-background px-6 pb-4 text-sm text-destructive">
            {filterError}
          </div>
        )}

        <div className="p-6">
          <div className="border border-border bg-muted/20">
            {submittedFilter === null ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
                <img src={searchDataIcon} alt="Cari data laporan" className="h-64 w-64 object-contain" />
                <p>Silahkan cari data untuk menampilkan laporan</p>
              </div>
            ) : stockQ.isLoading || stockQ.isFetching ? (
              <div className="p-6"><TableSkeleton rows={6} cols={5} /></div>
            ) : stockQ.isError || !stockQ.data ? (
              <div className="p-6"><ErrorState message="Gagal memuat laporan stock." onRetry={() => void stockQ.refetch()} /></div>
            ) : !filtered.length ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-base text-muted-foreground">
                <img src={emptyDataIcon} alt="Data tidak ada" className="h-64 w-64 object-contain" />
                <p className="text-lg font-semibold leading-none">Tidak Ada Data</p>
                <p className="text-sm text-muted-foreground">Tidak ada stock untuk tanggal yang dipilih.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold text-foreground">Produk</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Stok</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Harga Grosir</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Harga Eceran</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Nilai Stok (Grosir)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(item.stock)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.wholesalePrice)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.retailPrice)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.stock * item.wholesalePrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t border-border bg-background px-6 py-3">
                  <p className="text-sm font-medium">Total Produk: {totalItems}</p>
                </div>

                <TablePagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </div>
          {submittedFilter !== null && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                className="w-full rounded-none bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-white/80"
                onClick={exportPdf}
                disabled={!canExport}
              >
                Export PDF
              </Button>
              <Button
                type="button"
                className="w-full rounded-none bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300 disabled:text-white/80"
                disabled={!canExport}
                onClick={() => { void exportExcel(); }}
              >
                Export Excel
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
