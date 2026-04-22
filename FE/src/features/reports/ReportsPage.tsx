import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { EmptyState, ErrorState } from "@/components/common/States";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { reportsService } from "@/services/reports";

export default function ReportsPage() {
  const stockQ = useQuery({ queryKey: ["reports", "stock"], queryFn: () => reportsService.stock() });
  const debtQ = useQuery({ queryKey: ["reports", "debts"], queryFn: () => reportsService.debts() });
  const payableQ = useQuery({ queryKey: ["reports", "payables"], queryFn: () => reportsService.payables() });

  const isLoading = stockQ.isLoading || debtQ.isLoading || payableQ.isLoading;
  const isError = stockQ.isError || debtQ.isError || payableQ.isError;

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Laporan" description="Laporan stok, piutang, dan hutang." />
        <Card className="p-4"><TableSkeleton rows={6} cols={5} /></Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Laporan" description="Laporan stok, piutang, dan hutang." />
        <Card className="p-4">
          <ErrorState
            message="Gagal memuat laporan."
            onRetry={() => {
              void stockQ.refetch();
              void debtQ.refetch();
              void payableQ.refetch();
            }}
          />
        </Card>
      </div>
    );
  }

  const stock = stockQ.data;
  const debts = debtQ.data;
  const payables = payableQ.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan" description="Laporan stok, piutang, dan hutang." />

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Laporan Stok</h2>
        <div className="mb-3 grid gap-3 md:grid-cols-4">
          <SummaryBox label="Total produk" value={formatNumber(stock?.summary.totalItems ?? 0)} />
          <SummaryBox label="Total stok" value={formatNumber(stock?.summary.totalStock ?? 0)} />
          <SummaryBox label="Nilai stok grosir" value={formatCurrency(stock?.summary.totalStockValueWholesale ?? 0)} />
          <SummaryBox label="Nilai stok eceran" value={formatCurrency(stock?.summary.totalStockValueRetail ?? 0)} />
        </div>
        {!stock?.items.length ? (
          <EmptyState title="Tidak ada data stok" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="text-right">Harga Grosir</TableHead>
                <TableHead className="text-right">Harga Eceran</TableHead>
                <TableHead className="text-right">Nilai Stok (Grosir)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.items.map((item) => (
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
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Laporan Piutang</h2>
        <div className="mb-3 grid gap-3 md:grid-cols-4">
          <SummaryBox label="Total record" value={formatNumber(debts?.summary.totalRecords ?? 0)} />
          <SummaryBox label="Total piutang" value={formatCurrency(debts?.summary.totalDebt ?? 0)} />
          <SummaryBox label="Sudah dibayar" value={formatCurrency(debts?.summary.totalPaid ?? 0)} />
          <SummaryBox label="Sisa piutang" value={formatCurrency(debts?.summary.totalOutstanding ?? 0)} />
        </div>
        {!debts?.items.length ? (
          <EmptyState title="Tidak ada data piutang" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Dibayar</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.customerName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(item.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(item.paid)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(item.remaining)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold">Laporan Hutang</h2>
        <div className="mb-3 grid gap-3 md:grid-cols-4">
          <SummaryBox label="Total record" value={formatNumber(payables?.summary.totalRecords ?? 0)} />
          <SummaryBox label="Total hutang" value={formatCurrency(payables?.summary.totalPayable ?? 0)} />
          <SummaryBox label="Sudah dibayar" value={formatCurrency(payables?.summary.totalPaid ?? 0)} />
          <SummaryBox label="Sisa hutang" value={formatCurrency(payables?.summary.totalOutstanding ?? 0)} />
        </div>
        {!payables?.items.length ? (
          <EmptyState title="Tidak ada data hutang" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Dibayar</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.customerName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(item.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(item.paid)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(item.remaining)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
