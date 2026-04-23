import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { MoreVertical, Search } from "lucide-react";
import pelunasanIcon from "../../../assets/pelunasan_icon.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { TableFetchProgress } from "@/components/common/TableFetchProgress";
import { TablePagination } from "@/components/common/TablePagination";
import { ErrorState } from "@/components/common/States";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDate } from "@/lib/format";
import { useDebts, useRecordPayment } from "./hooks";
import type { Debt } from "@/types";
import emptyDataIcon from "../../../assets/empty.svg";

const schema = z.object({
  amount: z.coerce.number().positive("Harus > 0"),
});
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;
const DEFAULT_PAGE_SIZE = 10;

export default function DebtsPage() {
  const { data, isLoading, isFetching, isError, refetch } = useDebts();
  const recordMut = useRecordPayment();
  const [target, setTarget] = useState<Debt | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0 },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return q
      ? data.filter((d) => (d.customerName ?? "").toLowerCase().includes(q)
        || (d.transactionId ?? "").toLowerCase().includes(q)
        || formatDate(d.createdAt ?? "").toLowerCase().includes(q))
      : data;
  }, [data, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div>
      <Card className="p-0">
        <div className="bg-primary px-4 py-4 sm:px-6 text-primary-foreground">
          <h1 className="text-lg font-semibold">Piutang</h1>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari piutang / no faktur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <TableFetchProgress loading={isFetching && !isLoading} />
        {isLoading ? (
          <div className="bg-muted/20 p-4 sm:p-6"><TableSkeleton /></div>
        ) : isError ? (
          <div className="bg-muted/20 p-4 sm:p-6"><ErrorState onRetry={() => refetch()} /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-muted/20 p-4 sm:p-6">
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-base text-muted-foreground">
              <img src={emptyDataIcon} alt="Data tidak ada" className="h-64 w-64 object-contain" />
              <p className="text-lg font-semibold leading-none">Tidak ada piutang</p>
              <p className="text-sm text-muted-foreground">Semua penjualan telah lunas.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="border border-border bg-muted/20">
              <Table>
                  <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold text-foreground">No Faktur</TableHead>
                    <TableHead className="font-semibold text-foreground">Kode</TableHead>
                    <TableHead className="font-semibold text-foreground">Nama</TableHead>
                    <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Total</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Dibayar</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Kembalian</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Sisa</TableHead>
                    <TableHead className="w-[74px] text-center font-semibold text-foreground">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.transactionId || "-"}</TableCell>
                      <TableCell className="font-medium">{d.customerId ?? "-"}</TableCell>
                      <TableCell className="font-medium">{d.customerName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(d.total)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(d.paid)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(d.change ?? 0)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(d.remaining)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-none border-0 p-0 shadow-none outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-transparent"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="left" align="start" sideOffset={6} className="w-10 min-w-0 p-1">
                            <DropdownMenuItem
                              disabled={d.remaining <= 0}
                              onClick={() => {
                                if (d.remaining <= 0) return;
                                form.reset({ amount: d.remaining });
                                setTarget(d);
                              }}
                              className="flex h-8 w-8 justify-center p-0 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
                            >
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                  <span className="inline-flex h-8 w-8 items-center justify-center">
                                    <img src={pelunasanIcon} alt="Pelunasan" className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="whitespace-nowrap px-1 py-0.5 text-xs">
                                  Pelunasan
                                </TooltipContent>
                              </Tooltip>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 sm:px-6">
                <p className="text-sm font-medium">Total Piutang: {totalItems}</p>
              </div>

              <TablePagination
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Catat pembayaran</DialogTitle></DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              if (!target) return;
              if ((target.remaining ?? 0) <= 0) {
                toast.error("Piutang ini sudah lunas");
                setTarget(null);
                return;
              }
              try {
                await recordMut.mutateAsync({ debtId: target.id, amount: values.amount });
                toast.success("Pembayaran dicatat");
                setTarget(null);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Gagal");
              }
            })}
          >
            <div className="border border-border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pelanggan</span>
                <span className="font-medium">{target?.customerName}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Sisa</span>
                <span className="font-semibold">{formatCurrency(target?.remaining ?? 0)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Jumlah</Label>
              <CurrencyInput
                id="amount"
                value={Number(form.watch("amount")) || 0}
                onChange={(value) => form.setValue("amount", value, { shouldValidate: true })}
              />
              {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
            <DialogFooter>
              <Button className="rounded-none" type="button" variant="outline" onClick={() => setTarget(null)}>Batal</Button>
              <Button className="rounded-none" type="submit" disabled={recordMut.isPending}>
                {recordMut.isPending ? "Menyimpan…" : "Catat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
