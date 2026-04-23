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
import { TableFetchProgress } from "@/components/common/TableFetchProgress";
import { TablePagination } from "@/components/common/TablePagination";
import { EmptyState, ErrorState } from "@/components/common/States";
import { formatCurrency, formatDate, formatNumber, getTodayInputDate } from "@/lib/format";
import { reportsService } from "@/services/reports";
import { storesService } from "@/services/stores";
import type { RowInput } from "jspdf-autotable";
import { getPdfEngine } from "./export-engine/lazy";
import { exportExcelWithWorker } from "./export-engine/excel-worker.client";
import searchDataIcon from "../../../assets/cari data.svg";
import emptyDataIcon from "../../../assets/empty.svg";

const DEFAULT_PAGE_SIZE = 10;
const TODAY = getTodayInputDate();

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

  const filtered = useMemo(() => {
    const items = payableQ.data?.items ?? [];
    const q = search.trim().toLowerCase();
    return q
      ? items.filter((it) =>
        (it.customerName ?? "").toLowerCase().includes(q)
        || (it.transactionId ?? "").toLowerCase().includes(q))
      : items;
  }, [payableQ.data?.items, search]);

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
    const nextFilter = { dateFrom, dateTo };

    const isSameFilter = submittedFilter?.dateFrom === nextFilter.dateFrom && submittedFilter?.dateTo === nextFilter.dateTo;
    if (isSameFilter) {
      void payableQ.refetch();
      return;
    }

    setSubmittedFilter(nextFilter);
  };

  const canExport = submittedFilter !== null && !payableQ.isLoading && !payableQ.isFetching && !payableQ.isError && filtered.length > 0;

  const exportPdf = async () => {
    const pdf = await getPdfEngine();
    const store = storesQ.data?.[0];
    const reportDateFrom = submittedFilter?.dateFrom ?? dateFrom;
    const reportDateTo = submittedFilter?.dateTo ?? dateTo;
    const pdfSideInset = 34;

    const doc = pdf.createLandscapePdf();
    pdf.drawStandardReportHeader(doc, {
      store,
      title: "LAPORAN HUTANG",
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
      leftInset: pdfSideInset,
      rightInset: pdfSideInset,
    });

    const tableBody: RowInput[] = filtered.map((item, index) => [
      String(index + 1),
      item.transactionId ?? "-",
      item.customerName ?? "-",
      item.customerCode ?? "-",
      formatDate(item.createdAt),
      formatCurrency(item.total),
      formatCurrency(item.paid),
      formatCurrency(item.change ?? 0),
      formatCurrency(item.remaining),
    ]);

    const totalSum = filtered.reduce((s, it) => s + (it.total ?? 0), 0);
    const paidSum = filtered.reduce((s, it) => s + (it.paid ?? 0), 0);
    const changeSum = filtered.reduce((s, it) => s + (it.change ?? 0), 0);
    const remainingSum = filtered.reduce((s, it) => s + (it.remaining ?? 0), 0);

    tableBody.push([
      { content: `GRAND TOTAL : ${totalItems}`, colSpan: 5, styles: { halign: "left", fontStyle: "bold" } },
      { content: formatCurrency(totalSum), styles: { halign: "right", fontStyle: "bold" } },
      { content: formatCurrency(paidSum), styles: { halign: "right", fontStyle: "bold" } },
      { content: formatCurrency(changeSum), styles: { halign: "right", fontStyle: "bold" } },
      { content: formatCurrency(remainingSum), styles: { halign: "right", fontStyle: "bold" } },
    ]);

    pdf.renderReportTablePdf(doc, {
      head: [["No", "No Faktur", "Supplier", "Kode Customer", "Tanggal", "Total", "Dibayar", "Kembalian", "Sisa"]],
      body: tableBody,
      autoTableOptions: {
        margin: { left: pdfSideInset, right: pdfSideInset },
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 20 }, // No (diperkecil)
          1: { halign: "left", cellWidth: 92 },
          2: { halign: "left", cellWidth: 110 }, // Supplier (dipanjangkan)
          3: { halign: "left", cellWidth: 72 },
          4: { halign: "center", cellWidth: 68 }, // Tanggal (diperkecil)
          5: { halign: "right", cellWidth: 103 }, // Nominal diperlebar agar sejajar kanan header
          6: { halign: "right", cellWidth: 103 },
          7: { halign: "right", cellWidth: 103 },
          8: { halign: "right", cellWidth: 103 },
        },
      },
    });

    pdf.drawPdfPrintDate(doc);
    pdf.savePdfFile(doc, "LAPORAN HUTANG.pdf");
  };

  const exportExcel = async () => {
    const store = storesQ.data?.[0];
    const reportDateFrom = submittedFilter?.dateFrom ?? dateFrom;
    const reportDateTo = submittedFilter?.dateTo ?? dateTo;
    await exportExcelWithWorker({
      kind: "payable",
      fileName: "LAPORAN HUTANG.xlsx",
      title: "LAPORAN HUTANG",
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
      storeName: store?.nama_toko,
      items: filtered.map((item) => ({
        transactionId: item.transactionId,
        customerName: item.customerName,
        customerCode: item.customerCode,
        createdAt: item.createdAt,
        total: item.total,
        paid: item.paid,
        change: item.change ?? 0,
        remaining: item.remaining,
      })),
    });
  };

  return (
    <div>
      <Card className="p-0">
        <div className="bg-primary px-4 py-4 sm:px-6 text-primary-foreground">
          <h1 className="text-lg font-semibold">Laporan Hutang</h1>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-4 sm:px-6 sm:flex-row sm:items-end">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari supplier / no faktur…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>

          <div className="w-full sm:max-w-[210px]">
            <label htmlFor="dateFrom" className="mb-1 block text-xs text-muted-foreground">Tanggal Awal</label>
            <Input id="dateFrom" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div className="w-full sm:max-w-[210px]">
            <label htmlFor="dateTo" className="mb-1 block text-xs text-muted-foreground">Tanggal Akhir</label>
            <Input id="dateTo" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <Button onClick={onSearch} className="rounded-none">Cari Data</Button>
        </div>

        {filterError && (
          <div className="border-b border-border bg-background px-6 pb-4 text-sm text-destructive">{filterError}</div>
        )}
        <TableFetchProgress loading={payableQ.isFetching && !payableQ.isLoading} />

        <div className="p-4 sm:p-6">
          <div className="border border-border bg-muted/20">

            {submittedFilter === null ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
                <img src={searchDataIcon} alt="Cari data laporan" className="h-64 w-64 object-contain" />
                <p>Silahkan cari data untuk menampilkan laporan</p>
              </div>
            ) : payableQ.isLoading ? (
              <div className="p-4 sm:p-6"><TableSkeleton rows={6} cols={5} /></div>
            ) : payableQ.isError || !payableQ.data ? (
              <div className="p-4 sm:p-6"><ErrorState message="Gagal memuat laporan hutang." onRetry={() => void payableQ.refetch()} /></div>
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
                      <TableHead className="font-semibold text-foreground">Kode Customer</TableHead>
                      <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Total</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Dibayar</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Kembalian</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Sisa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.transactionId ?? "-"}</TableCell>
                        <TableCell className="font-medium">{(item.customerName ?? "").toUpperCase() || "—"}</TableCell>
                        <TableCell className="font-medium">{item.customerCode ?? "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.total)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.change ?? 0)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(item.remaining)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 sm:px-6">
                  <p className="text-sm font-medium">Total Record: {totalItems}</p>
                </div>
                <TablePagination page={page} pageSize={pageSize} totalItems={totalItems} onPageChange={setPage} onPageSizeChange={setPageSize} />

                {submittedFilter !== null && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      className={`w-full rounded-none ${canExport ? "bg-red-600 text-white hover:bg-red-700" : "bg-red-300 text-white"}`}
                      onClick={() => { void exportPdf(); }}
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
