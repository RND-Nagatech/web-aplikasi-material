import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { TablePagination } from "@/components/common/TablePagination";
import { ErrorState } from "@/components/common/States";
import { formatCurrency } from "@/lib/format";
import { reportsService } from "@/services/reports";
import { storesService } from "@/services/stores";
import type { FinanceReportType } from "@/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RowInput } from "jspdf-autotable";
import ExcelJS from "exceljs";
import searchDataIcon from "../../../assets/cari data.svg";
import emptyDataIcon from "../../../assets/empty.svg";

const DEFAULT_PAGE_SIZE = 10;
const TODAY = new Date().toISOString().slice(0, 10);

export default function FinanceReportPage() {
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo] = useState(TODAY);
  const [search, setSearch] = useState("");
  const [reportType, setReportType] = useState<FinanceReportType>("rekap");
  const [submittedFilter, setSubmittedFilter] = useState<{
    type: FinanceReportType;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  } | null>(null);
  const [filterError, setFilterError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const financeQ = useQuery({
    queryKey: ["reports", "finance", submittedFilter],
    queryFn: () => reportsService.finance(submittedFilter ?? undefined),
    enabled: submittedFilter !== null,
  });

  const storesQ = useQuery({
    queryKey: ["stores", "report-header"],
    queryFn: storesService.list,
  });

  const items = financeQ.data?.items ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      (it.kategori ?? "").toLowerCase().includes(q)
      || (it.deskripsi ?? "").toLowerCase().includes(q)
    );
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
  }, [pageSize, submittedFilter, reportType, search]);

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
    const nextFilter = { type: reportType, dateFrom, dateTo, search: search.trim() || undefined };
    const isSame =
      submittedFilter?.type === nextFilter.type
      && submittedFilter?.dateFrom === nextFilter.dateFrom
      && submittedFilter?.dateTo === nextFilter.dateTo
      && submittedFilter?.search === nextFilter.search;
    if (isSame) {
      void financeQ.refetch();
      return;
    }
    setSubmittedFilter(nextFilter);
  };

  const canExport =
    submittedFilter !== null
    && !financeQ.isLoading
    && !financeQ.isFetching
    && !financeQ.isError
    && filtered.length > 0;

  const exportPdf = () => {
    const store = storesQ.data?.[0];
    const reportDateFrom = submittedFilter?.dateFrom ?? dateFrom;
    const reportDateTo = submittedFilter?.dateTo ?? dateTo;
    const title = reportType === "rekap" ? "LAPORAN KEUANGAN (REKAP)" : "LAPORAN KEUANGAN (DETAIL)";
    const formatNumberId = (value: number) => new Intl.NumberFormat("id-ID").format(value);
    const toDateOnly = (value?: string) => {
      if (!value) return reportDateFrom;
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const normalized = value.replace(" GMT+7", "+07:00").replace(" ", "T");
      const parsed = new Date(normalized);
      if (Number.isNaN(parsed.getTime())) return reportDateFrom;
      return parsed.toISOString().slice(0, 10);
    };

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
    doc.setFontSize(17);
    doc.text(title, pageWidth - 40, 50, { align: "right" });
    doc.setFontSize(13);
    doc.text(`TANGGAL : ${reportDateFrom} s/d ${reportDateTo}`, pageWidth - 40, 72, { align: "right" });

    const summary = financeQ.data?.summary;
    const totalMasuk = summary?.totalUangMasuk ?? 0;
    const totalKeluar = summary?.totalUangKeluar ?? 0;

    const head = reportType === "rekap"
      ? [["KATEGORI", "UANG MASUK", "UANG KELUAR"]]
      : [["NO", "TANGGAL", "KATEGORI", "DESKRIPSI", "UANG MASUK", "UANG KELUAR"]];

    const body: RowInput[] = reportType === "rekap"
      ? filtered.map((item) => [
        item.kategori.toUpperCase(),
        formatNumberId(item.uangMasuk),
        formatNumberId(item.uangKeluar),
      ])
      : filtered.map((item, idx) => [
        idx + 1,
        toDateOnly(item.createdDate),
        item.kategori.toUpperCase(),
        item.deskripsi,
        formatNumberId(item.uangMasuk),
        formatNumberId(item.uangKeluar),
      ]);

    body.push(
      reportType === "rekap"
        ? ["GRAND TOTAL", formatNumberId(totalMasuk), formatNumberId(totalKeluar)]
        : ["", "", "GRAND TOTAL", "", formatNumberId(totalMasuk), formatNumberId(totalKeluar)],
    );

    autoTable(doc, {
      startY: 110,
      head,
      body,
      theme: "plain",
      styles: { font: "helvetica", fontSize: 10, cellPadding: 7 },
      headStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: "bold" },
      columnStyles: reportType === "rekap"
        ? {
            0: { halign: "left", cellWidth: 430 },
            1: { halign: "right", cellWidth: 166 },
            2: { halign: "right", cellWidth: 166 },
          }
        : {
            0: { halign: "left", cellWidth: 40 },
            1: { halign: "left", cellWidth: 90 },
            2: { halign: "left", cellWidth: 130 },
            3: { halign: "left", cellWidth: 285 },
            4: { halign: "right", cellWidth: 110 },
            5: { halign: "right", cellWidth: 110 },
          },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === body.length - 1) {
          data.cell.styles.fillColor = [220, 220, 220];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const summaryStartY = ((doc as any).lastAutoTable?.finalY ?? 120) + 14;
    const tableRightX = pageWidth - 40;
    const summaryValueX = tableRightX - 6;
    const summaryLabelX = summaryValueX - 170;
    const lineHeight = 22;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Saldo Awal :", summaryLabelX, summaryStartY);
    doc.text(formatNumberId(summary?.saldoAwal ?? 0), summaryValueX, summaryStartY, { align: "right" });
    doc.text("Uang Masuk :", summaryLabelX, summaryStartY + lineHeight);
    doc.text(formatNumberId(summary?.totalUangMasuk ?? 0), summaryValueX, summaryStartY + lineHeight, { align: "right" });
    doc.text("Uang Keluar :", summaryLabelX, summaryStartY + lineHeight * 2);
    doc.text(formatNumberId(summary?.totalUangKeluar ?? 0), summaryValueX, summaryStartY + lineHeight * 2, { align: "right" });
    doc.setLineWidth(0.8);
    doc.line(summaryLabelX, summaryStartY + lineHeight * 2.45, summaryValueX, summaryStartY + lineHeight * 2.45);
    doc.text("Saldo Akhir :", summaryLabelX, summaryStartY + lineHeight * 3.35);
    doc.text(formatNumberId(summary?.saldoAkhir ?? 0), summaryValueX, summaryStartY + lineHeight * 3.35, { align: "right" });

    const footerY = summaryStartY + lineHeight * 4.2;
    doc.setFontSize(10);
    doc.text(`Print Date : ${new Date().toLocaleDateString("id-ID")}`, 40, footerY);
    const pdfName = title.replace(/\s+/g, " ") + ".pdf";
    doc.save(pdfName);
  };

  const exportExcel = async () => {
    const store = storesQ.data?.[0];
    const reportDateFrom = submittedFilter?.dateFrom ?? dateFrom;
    const reportDateTo = submittedFilter?.dateTo ?? dateTo;
    const title = reportType === "rekap" ? "LAPORAN KEUANGAN (REKAP)" : "LAPORAN KEUANGAN (DETAIL)";

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    worksheet.columns = reportType === "rekap"
      ? [{ width: 46 }, { width: 30 }, { width: 32 }]
      : [{ width: 36 }, { width: 58 }, { width: 26 }, { width: 28 }];

    const endCol = reportType === "rekap" ? "C" : "D";
    const tableHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } } as const;
    const whiteFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } } as const;
    const tableBorder = {
      top: { style: "thin", color: { argb: "FFBFBFBF" } },
      left: { style: "thin", color: { argb: "FFBFBFBF" } },
      bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
      right: { style: "thin", color: { argb: "FFBFBFBF" } },
    } as const;
    const moneyFmt = "#,##0";
    const totalCols = reportType === "rekap" ? 3 : 4;

    for (let rowIdx = 1; rowIdx <= 5; rowIdx += 1) {
      worksheet.mergeCells(`A${rowIdx}:${endCol}${rowIdx}`);
      const cell = worksheet.getCell(`A${rowIdx}`);
      cell.fill = whiteFill;
      cell.border = tableBorder;
      cell.alignment = { horizontal: rowIdx === 1 ? "center" : "left", vertical: "middle" };
      cell.font = { bold: true, size: rowIdx === 1 ? 17 : 12 };
    }
    worksheet.getCell("A1").value = title;
    worksheet.getCell("A2").value = "Tanggal";
    worksheet.getCell("A3").value = `${reportDateFrom} s/d ${reportDateTo}`;
    worksheet.getCell("A4").value = `TOKO : ${(store?.nama_toko ?? "-").toUpperCase()}`;
    worksheet.getCell("A5").value = `ALAMAT : ${(store?.alamat ?? "-").toUpperCase()}`;

    worksheet.addRow([]);
    const headerRowIndex = 7;
    const headers = reportType === "rekap"
      ? ["Kategori", "Uang Masuk", "Uang Keluar"]
      : ["Kategori", "Deskripsi", "Uang Masuk", "Uang Keluar"];
    const headerRow = worksheet.getRow(headerRowIndex);
    headers.forEach((value, idx) => {
      headerRow.getCell(idx + 1).value = value;
    });
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      const isMoneyHeader = reportType === "rekap" ? cell.col >= 2 : cell.col >= 3;
      cell.alignment = { horizontal: isMoneyHeader ? "right" : "left", vertical: "middle" };
      cell.fill = tableHeaderFill;
      cell.border = tableBorder;
    });
    headerRow.height = 30;

    let currentRow = headerRowIndex + 1;
    filtered.forEach((item) => {
      const row = worksheet.getRow(currentRow);
      const values = reportType === "rekap"
        ? [item.kategori.toUpperCase(), item.uangMasuk, item.uangKeluar]
        : [item.kategori.toUpperCase(), item.deskripsi, item.uangMasuk, item.uangKeluar];
      values.forEach((value, idx) => {
        row.getCell(idx + 1).value = value;
      });
      const moneyStartCol = reportType === "rekap" ? 2 : 3;
      row.getCell(moneyStartCol).alignment = { horizontal: "right" };
      row.getCell(moneyStartCol + 1).alignment = { horizontal: "right" };
      row.getCell(moneyStartCol).numFmt = moneyFmt;
      row.getCell(moneyStartCol + 1).numFmt = moneyFmt;
      row.eachCell((cell) => {
        cell.border = tableBorder;
        cell.alignment = { ...(cell.alignment ?? {}), vertical: "middle" };
      });
      row.height = 30;
      currentRow += 1;
    });

    const summary = financeQ.data?.summary;
    const totalRow = worksheet.getRow(currentRow);
    if (reportType === "detail") {
      worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    }
    totalRow.getCell(1).value = "GRAND TOTAL";
    totalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    if (reportType === "rekap") {
      totalRow.getCell(2).value = summary?.totalUangMasuk ?? 0;
      totalRow.getCell(3).value = summary?.totalUangKeluar ?? 0;
      totalRow.getCell(2).numFmt = moneyFmt;
      totalRow.getCell(3).numFmt = moneyFmt;
      totalRow.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
      totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
    } else {
      totalRow.getCell(3).value = summary?.totalUangMasuk ?? 0;
      totalRow.getCell(4).value = summary?.totalUangKeluar ?? 0;
      totalRow.getCell(3).numFmt = moneyFmt;
      totalRow.getCell(4).numFmt = moneyFmt;
      totalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
      totalRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
    }
    for (let col = 1; col <= totalCols; col += 1) {
      const cell = totalRow.getCell(col);
      cell.font = { bold: true, size: 12 };
      cell.fill = tableHeaderFill;
      cell.border = tableBorder;
    }
    totalRow.height = 30;

    const summaryStartRow = currentRow + 2;
    const summaryLabelCol = reportType === "rekap" ? 2 : 3;
    const summaryValueCol = reportType === "rekap" ? 3 : 4;
    const summaryRows = [
      ["Saldo Awal", summary?.saldoAwal ?? 0],
      ["Uang Masuk", summary?.totalUangMasuk ?? 0],
      ["Uang Keluar", summary?.totalUangKeluar ?? 0],
      ["Saldo Akhir", summary?.saldoAkhir ?? 0],
    ] as const;

    summaryRows.forEach(([label, value], idx) => {
      const rowNumber = summaryStartRow + idx;
      if (reportType === "detail") {
        worksheet.mergeCells(`A${rowNumber}:B${rowNumber}`);
      }
      const row = worksheet.getRow(rowNumber);
      for (let col = 1; col <= totalCols; col += 1) {
        const cell = row.getCell(col);
        cell.fill = tableHeaderFill;
        cell.border = tableBorder;
      }
      row.getCell(summaryLabelCol).value = label;
      row.getCell(summaryValueCol).value = value;
      row.getCell(summaryLabelCol).font = { bold: true, size: 12 };
      row.getCell(summaryLabelCol).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(summaryValueCol).font = { bold: true, size: 12 };
      row.getCell(summaryValueCol).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(summaryValueCol).numFmt = moneyFmt;
      row.height = 30;
    });

    const printDateRow = worksheet.getRow(summaryStartRow + summaryRows.length + 1);
    printDateRow.getCell(1).value = `Print Date : ${new Date().toLocaleDateString("id-ID")}`;
    printDateRow.getCell(1).font = { italic: true, size: 12 };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const xlsxName = title.replace(/\s+/g, " ") + ".xlsx";
    link.download = xlsxName;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Card className="overflow-hidden p-0">
        <div className="bg-primary px-6 py-4 text-primary-foreground">
          <h1 className="text-lg font-semibold">Laporan Keuangan</h1>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-end">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari data…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>

          <div className="w-full max-w-[170px]">
            <label className="mb-1 block text-xs text-muted-foreground">Tipe Laporan</label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as FinanceReportType)}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rekap">Rekap</SelectItem>
                <SelectItem value="detail">Detail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full max-w-[210px]">
            <label htmlFor="dateFrom" className="mb-1 block text-xs text-muted-foreground">Tanggal Awal</label>
            <Input id="dateFrom" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="w-full max-w-[210px]">
            <label htmlFor="dateTo" className="mb-1 block text-xs text-muted-foreground">Tanggal Akhir</label>
            <Input id="dateTo" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button className="rounded-none" onClick={onSearch}>Cari Data</Button>
        </div>

        {filterError && (
          <div className="border-b border-border bg-background px-6 pb-4 text-sm text-destructive">{filterError}</div>
        )}

        <div className="p-6">
          <div className="border border-border bg-muted/20">
            {submittedFilter === null ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
                <img src={searchDataIcon} alt="Cari data laporan" className="h-64 w-64 object-contain" />
                <p>Silahkan cari data untuk menampilkan laporan</p>
              </div>
            ) : financeQ.isLoading || financeQ.isFetching ? (
              <div className="p-6"><TableSkeleton rows={6} cols={reportType === "rekap" ? 3 : 4} /></div>
            ) : financeQ.isError || !financeQ.data ? (
              <div className="p-6"><ErrorState message="Gagal memuat laporan keuangan." onRetry={() => void financeQ.refetch()} /></div>
            ) : !filtered.length ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-base text-muted-foreground">
                <img src={emptyDataIcon} alt="Data tidak ada" className="h-64 w-64 object-contain" />
                <p className="text-lg font-semibold leading-none">Tidak Ada Data</p>
                <p className="text-sm text-muted-foreground">Tidak ada transaksi untuk tanggal yang dipilih.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold text-foreground">Kategori</TableHead>
                      {reportType === "detail" && <TableHead className="font-semibold text-foreground">Deskripsi</TableHead>}
                      <TableHead className="text-right font-semibold text-foreground">Uang Masuk</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Uang Keluar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((item, idx) => (
                      <TableRow key={`${item.kategori}-${item.deskripsi}-${idx}`}>
                        <TableCell className="font-medium">{item.kategori}</TableCell>
                        {reportType === "detail" && <TableCell className="text-muted-foreground">{item.deskripsi || "-"}</TableCell>}
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.uangMasuk)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.uangKeluar)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between border-t border-border bg-background px-6 py-3">
                  <p className="text-sm font-medium">Total Record: {totalItems}</p>
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
            <>
              <div className="mt-4 flex justify-end">
                <div className="w-full max-w-md space-y-1 text-right">
                  <p className="text-2xl">Saldo Awal : {formatCurrency(financeQ.data?.summary.saldoAwal ?? 0)}</p>
                  <p className="text-2xl">Uang Masuk : {formatCurrency(financeQ.data?.summary.totalUangMasuk ?? 0)}</p>
                  <p className="text-2xl">Uang Keluar : {formatCurrency(financeQ.data?.summary.totalUangKeluar ?? 0)}</p>
                  <hr className="my-2 border-border" />
                  <p className="text-2xl font-semibold">Saldo Akhir : {formatCurrency(financeQ.data?.summary.saldoAkhir ?? 0)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  className="w-full rounded-none bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-white/80"
                  disabled={!canExport}
                  onClick={exportPdf}
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
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
