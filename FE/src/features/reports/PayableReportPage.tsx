import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
// PageHeader not used; layout follows unified Card pattern
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { TablePagination } from "@/components/common/TablePagination";
import { EmptyState, ErrorState } from "@/components/common/States";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
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

export default function PayableReportPage() {
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo] = useState(TODAY);
  const [search, setSearch] = useState("");
  const [submittedFilter, setSubmittedFilter] = useState<{ dateFrom?: string; dateTo?: string } | null>(null);
  const [filterError, setFilterError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const payableQ = useQuery({
    queryKey: ["reports", "payables", submittedFilter],
    queryFn: () => reportsService.payables(submittedFilter ?? undefined),
    enabled: submittedFilter !== null,
  });

  const storesQ = useQuery({
    queryKey: ["stores", "report-header"],
    queryFn: storesService.list,
  });

  const items = payableQ.data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? items.filter((it) =>
        (it.customerName ?? "").toLowerCase().includes(q)
        || (it.transactionId ?? "").toLowerCase().includes(q))
      : items;
  }, [items, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

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
    // Convert local date strings to UTC ISO start/end to avoid timezone shifts on backend
    const toUtcStart = (d: string) => new Date(`${d}T00:00:00`).toISOString();
    const toUtcEnd = (d: string) => new Date(`${d}T23:59:59.999`).toISOString();

    const nextFilter = { dateFrom: toUtcStart(dateFrom), dateTo: toUtcEnd(dateTo) };

    const isSameFilter = submittedFilter?.dateFrom === nextFilter.dateFrom && submittedFilter?.dateTo === nextFilter.dateTo;
    if (isSameFilter) {
      void payableQ.refetch();
      return;
    }

    setSubmittedFilter(nextFilter);
  };

  const canExport = submittedFilter !== null && !payableQ.isLoading && !payableQ.isFetching && !payableQ.isError && filtered.length > 0;

  const exportPdf = () => {
    const store = storesQ.data?.[0];
    const reportDateFrom = (submittedFilter?.dateFrom ?? dateFrom).slice(0, 10);
    const reportDateTo = (submittedFilter?.dateTo ?? dateTo).slice(0, 10);

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
    doc.text("LAPORAN HUTANG", pageWidth - 40, 50, { align: "right" });
    doc.setFontSize(13);
    doc.text(`TANGGAL : ${reportDateFrom} s/d ${reportDateTo}`, pageWidth - 40, 72, { align: "right" });

    const tableBody: RowInput[] = filtered.map((item, index) => [
      String(index + 1),
      item.transactionId ?? "-",
      item.customerName ?? "-",
      formatDate(item.createdAt),
      formatCurrency(item.total),
      formatCurrency(item.paid),
      formatCurrency(item.remaining),
    ]);

    const totalSum = filtered.reduce((s, it) => s + (it.total ?? 0), 0);
    const paidSum = filtered.reduce((s, it) => s + (it.paid ?? 0), 0);
    const remainingSum = filtered.reduce((s, it) => s + (it.remaining ?? 0), 0);

    tableBody.push([
      { content: `GRAND TOTAL : ${totalItems}`, colSpan: 3, styles: { halign: "left", fontStyle: "bold" } },
      { content: "", styles: { halign: "left" } },
      { content: formatCurrency(totalSum), styles: { halign: "right", fontStyle: "bold" } },
      { content: formatCurrency(paidSum), styles: { halign: "right", fontStyle: "bold" } },
      { content: formatCurrency(remainingSum), styles: { halign: "right", fontStyle: "bold" } },
    ]);

    autoTable(doc, {
      startY: 110,
      head: [["No", "No Faktur", "Supplier", "Tanggal", "Total", "Dibayar", "Sisa"]],
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
        3: { halign: "center", cellWidth: 100 },
        4: { halign: "right", cellWidth: 110 },
        5: { halign: "right", cellWidth: 110 },
        6: { halign: "right", cellWidth: 110 },
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

    doc.save("LAPORAN HUTANG.pdf");
  };

  const exportExcel = async () => {
    const store = storesQ.data?.[0];
    const reportDateFrom = (submittedFilter?.dateFrom ?? dateFrom).slice(0, 10);
    const reportDateTo = (submittedFilter?.dateTo ?? dateTo).slice(0, 10);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("LAPORAN HUTANG");

    worksheet.columns = [
      { width: 8 },
      { width: 22 },
      { width: 34 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 22 },
    ];

    worksheet.mergeCells("A1:G1");
    worksheet.getCell("A1").value = "LAPORAN HUTANG";
    worksheet.getCell("A1").font = { bold: true, size: 16 };
    worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A2:G2");
    worksheet.getCell("A2").value = `Tanggal : ${reportDateFrom} s/d ${reportDateTo}`;
    worksheet.getCell("A2").font = { bold: true, size: 12 };
    worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A3:G3");
    worksheet.getCell("A3").value = `${store?.nama_toko ?? "-"}`;
    worksheet.getCell("A3").font = { bold: true, size: 12 };
    worksheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

    const headerRow = worksheet.addRow(["No", "No Faktur", "Supplier", "Tanggal", "Total", "Dibayar", "Sisa"]);
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
        item.transactionId ?? "-",
        item.customerName ?? "-",
        formatDate(item.createdAt),
        item.total ?? 0,
        item.paid ?? 0,
        item.remaining ?? 0,
      ]);
      row.getCell(1).alignment = { horizontal: "center" };
      row.getCell(4).alignment = { horizontal: "center" };
      row.getCell(5).alignment = { horizontal: "right" };
      row.getCell(6).alignment = { horizontal: "right" };
      row.getCell(7).alignment = { horizontal: "right" };
      row.getCell(5).numFmt = '"Rp" #,##0';
      row.getCell(6).numFmt = '"Rp" #,##0';
      row.getCell(7).numFmt = '"Rp" #,##0';
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFBFBFBF" } },
          left: { style: "thin", color: { argb: "FFBFBFBF" } },
          bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
          right: { style: "thin", color: { argb: "FFBFBFBF" } },
        };
      });
    });

    const totalSum = filtered.reduce((s, it) => s + (it.total ?? 0), 0);
    const paidSum = filtered.reduce((s, it) => s + (it.paid ?? 0), 0);
    const remainingSum = filtered.reduce((s, it) => s + (it.remaining ?? 0), 0);

    const grandTotalRow = worksheet.addRow([
      `GRAND TOTAL : ${totalItems}`,
      "",
      "",
      "",
      totalSum,
      paidSum,
      remainingSum,
    ]);
    worksheet.mergeCells(`A${grandTotalRow.number}:C${grandTotalRow.number}`);
    grandTotalRow.getCell(1).font = { bold: true };
    grandTotalRow.getCell(1).alignment = { horizontal: "left" };
    grandTotalRow.getCell(5).alignment = { horizontal: "right" };
    grandTotalRow.getCell(6).alignment = { horizontal: "right" };
    grandTotalRow.getCell(7).alignment = { horizontal: "right" };
    grandTotalRow.getCell(5).font = { bold: true };
    grandTotalRow.getCell(6).font = { bold: true };
    grandTotalRow.getCell(7).font = { bold: true };
    grandTotalRow.getCell(5).numFmt = '"Rp" #,##0';
    grandTotalRow.getCell(6).numFmt = '"Rp" #,##0';
    grandTotalRow.getCell(7).numFmt = '"Rp" #,##0';
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
    worksheet.mergeCells(`A${printDateRow.number}:G${printDateRow.number}`);
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
    link.download = "LAPORAN HUTANG.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Card className="overflow-hidden p-0">
        <div className="bg-primary px-6 py-4 text-primary-foreground">
          <h1 className="text-lg font-semibold">Laporan Hutang</h1>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-end">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari supplier / no faktur…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>

          <div className="w-full max-w-[210px]">
            <label htmlFor="dateFrom" className="mb-1 block text-xs text-muted-foreground">Tanggal Awal</label>
            <Input id="dateFrom" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div className="w-full max-w-[210px]">
            <label htmlFor="dateTo" className="mb-1 block text-xs text-muted-foreground">Tanggal Akhir</label>
            <Input id="dateTo" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <Button onClick={onSearch} className="rounded-none">Cari Data</Button>
        </div>

        {filterError && (
          <div className="border-b border-border bg-background px-6 pb-4 text-sm text-destructive">{filterError}</div>
        )}

        <div className="p-6">
          <div className="border border-border bg-muted/20">
            <div className="mb-3 grid gap-3 md:grid-cols-4">
              {/* summary boxes intentionally commented per styling guide */}
              {/* <SummaryBox label="Total record" value={formatNumber(payableQ.data?.summary.totalRecords ?? 0)} /> */}
              {/* <SummaryBox label="Total hutang" value={formatCurrency(payableQ.data?.summary.totalPayable ?? 0)} /> */}
              {/* <SummaryBox label="Sudah dibayar" value={formatCurrency(payableQ.data?.summary.totalPaid ?? 0)} /> */}
              {/* <SummaryBox label="Sisa hutang" value={formatCurrency(payableQ.data?.summary.totalOutstanding ?? 0)} /> */}
            </div>

            {submittedFilter === null ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
                <img src={searchDataIcon} alt="Cari data laporan" className="h-64 w-64 object-contain" />
                <p>Silahkan cari data untuk menampilkan laporan</p>
              </div>
            ) : payableQ.isLoading || payableQ.isFetching ? (
              <div className="p-6"><TableSkeleton rows={6} cols={5} /></div>
            ) : payableQ.isError || !payableQ.data ? (
              <div className="p-6"><ErrorState message="Gagal memuat laporan hutang." onRetry={() => void payableQ.refetch()} /></div>
            ) : !filtered.length ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-base text-muted-foreground">
                <img src={emptyDataIcon} alt="Data tidak ada" className="h-64 w-64 object-contain" />
                <p className="text-lg font-semibold leading-none">Tidak Ada Data</p>
                <p className="text-sm text-muted-foreground">Tidak ada hutang untuk tanggal yang dipilih.</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold text-foreground">No Faktur</TableHead>
                      <TableHead className="font-semibold text-foreground">Supplier</TableHead>
                      <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Total</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Dibayar</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Sisa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.transactionId ?? "-"}</TableCell>
                        <TableCell className="font-medium">{item.customerName ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(item.remaining)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between border-t border-border bg-background px-6 py-3">
                  <p className="text-sm font-medium">Total Record: {totalItems}</p>
                </div>
                <TablePagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} onPageSizeChange={setPageSize} />

                {submittedFilter !== null && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      className={`w-full rounded-none ${canExport ? "bg-red-600 text-white hover:bg-red-700" : "bg-red-300 text-white"}`}
                      onClick={exportPdf}
                      disabled={!canExport}
                    >
                      Export PDF
                    </Button>
                    <Button
                      type="button"
                      className={`w-full rounded-none ${canExport ? "bg-green-600 text-white hover:bg-green-700" : "bg-green-300 text-white"}`}
                      onClick={exportExcel}
                      disabled={!canExport}
                    >
                      Export Excel
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
