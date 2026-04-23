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
import { TableFetchProgress } from "@/components/common/TableFetchProgress";
import { TablePagination } from "@/components/common/TablePagination";
import { ErrorState } from "@/components/common/States";
import { formatCurrency, formatNumber } from "@/lib/format";
import { reportsService } from "@/services/reports";
import { storesService } from "@/services/stores";
import type { RowInput } from "jspdf-autotable";
import { getPdfEngine } from "./export-engine/lazy";
import { exportExcelWithWorker } from "./export-engine/excel-worker.client";
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

  const filtered = useMemo(() => {
    const items = stockQ.data?.items ?? [];
    const q = search.trim().toLowerCase();
    return q ? items.filter((it) => (it.name ?? "").toLowerCase().includes(q)) : items;
  }, [stockQ.data?.items, search]);

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

  const exportPdf = async () => {
    const pdf = await getPdfEngine();
    const store = storesQ.data?.[0];
    const reportDateFrom = submittedFilter?.dateFrom ?? dateFrom;
    const reportDateTo = submittedFilter?.dateTo ?? dateTo;

    const doc = pdf.createLandscapePdf();
    pdf.drawStandardReportHeader(doc, {
      store,
      title: "LAPORAN STOCK",
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
    });

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

    pdf.renderReportTablePdf(doc, {
      head: [["No", "Produk", "Stok", "Harga Grosir", "Harga Eceran", "Nilai Stok (Grosir)"]],
      body: tableBody,
      autoTableOptions: {
        columnStyles: {
          0: { halign: "center", cellWidth: 56 },
          2: { halign: "right", cellWidth: 80 },
          3: { halign: "right", cellWidth: 120 },
          4: { halign: "right", cellWidth: 120 },
          5: { halign: "right", cellWidth: 150 },
        },
      },
    });

    pdf.drawPdfPrintDate(doc);
    pdf.savePdfFile(doc, "LAPORAN STOCK.pdf");
  };

  const exportExcel = async () => {
    const store = storesQ.data?.[0];
    const reportDateFrom = submittedFilter?.dateFrom ?? dateFrom;
    const reportDateTo = submittedFilter?.dateTo ?? dateTo;
    await exportExcelWithWorker({
      kind: "stock",
      fileName: "LAPORAN STOCK.xlsx",
      title: "LAPORAN STOCK",
      dateFrom: reportDateFrom,
      dateTo: reportDateTo,
      storeName: store?.nama_toko,
      items: filtered.map((item) => ({
        name: item.name,
        stock: item.stock,
        wholesalePrice: item.wholesalePrice,
        retailPrice: item.retailPrice,
      })),
    });
  };

  return (
    <div>
      <Card className="p-0">
        <div className="bg-primary px-4 py-4 sm:px-6 text-primary-foreground">
          <h1 className="text-lg font-semibold">Laporan Stock</h1>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-4 sm:px-6 sm:flex-row sm:items-end">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="w-full sm:max-w-[210px]">
            <label htmlFor="dateFrom" className="mb-1 block text-xs text-muted-foreground">Tanggal Awal</label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="w-full sm:max-w-[210px]">
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
        <TableFetchProgress loading={stockQ.isFetching && !stockQ.isLoading} />

        <div className="p-4 sm:p-6">
          <div className="border border-border bg-muted/20">
            {submittedFilter === null ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
                <img src={searchDataIcon} alt="Cari data laporan" className="h-64 w-64 object-contain" />
                <p>Silahkan cari data untuk menampilkan laporan</p>
              </div>
            ) : stockQ.isLoading ? (
              <div className="p-4 sm:p-6"><TableSkeleton rows={6} cols={5} /></div>
            ) : stockQ.isError || !stockQ.data ? (
              <div className="p-4 sm:p-6"><ErrorState message="Gagal memuat laporan stock." onRetry={() => void stockQ.refetch()} /></div>
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
                        <TableCell className="font-medium">{(item.name ?? "").toUpperCase()}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(item.stock)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.wholesalePrice)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.retailPrice)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(item.stock * item.wholesalePrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 sm:px-6">
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
                onClick={() => { void exportPdf(); }}
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
