import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { TableFetchProgress } from "@/components/common/TableFetchProgress";
import { TablePagination } from "@/components/common/TablePagination";
import { ErrorState } from "@/components/common/States";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from "./hooks";
import { ProductFormDialog } from "./ProductFormDialog";
import type { Product, ProductInput } from "@/types";
import emptyDataIcon from "../../../assets/empty.svg";

const DEFAULT_PAGE_SIZE = 10;

export default function ProductsPage() {
  const { data, isLoading, isFetching, isError, refetch } = useProducts();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [pendingRestore, setPendingRestore] = useState<ProductInput | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return q ? data.filter((p) => p.name.toLowerCase().includes(q)) : data;
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
      {/* Single unified card container */}
      <Card className="p-0">
        {/* Black Header */}
        <div className="bg-primary px-4 py-4 sm:px-6 text-primary-foreground">
          <h1 className="text-lg font-semibold">Produk</h1>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button className="rounded-none" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Produk baru
          </Button>
        </div>

        <TableFetchProgress loading={isFetching && !isLoading} />
        {/* Table Content with separated background and margin */}
        {isLoading ? (
          <div className="bg-muted/20 p-4 sm:p-6"><TableSkeleton /></div>
        ) : isError ? (
          <div className="bg-muted/20 p-4 sm:p-6"><ErrorState onRetry={() => refetch()} /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-muted/20 p-4 sm:p-6">
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-base text-muted-foreground">
              <img src={emptyDataIcon} alt="Data tidak ada" className="h-64 w-64 object-contain" />
              <p className="text-lg font-semibold leading-none">Tidak Ada Data</p>
              <p className="text-sm text-muted-foreground">Belum ada produk yang tersedia.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="border border-border bg-muted/20">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold text-foreground">Nama</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Stok</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Grosir</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Eceran</TableHead>
                    <TableHead className="w-24 font-semibold text-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(p.stock)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(p.wholesalePrice)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(p.retailPrice)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setToDelete(p)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Footer with total info */}
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
            </div>
          </div>
        )}
      </Card>

      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        submitting={createMut.isPending || updateMut.isPending}
        onSubmit={async (input) => {
          try {
            if (editing) {
              await updateMut.mutateAsync({ id: editing.id, input });
              toast.success("Produk diperbarui");
            } else {
              await createMut.mutateAsync(input);
              toast.success("Produk dibuat");
            }
            setOpen(false);
          } catch (e) {
            const message = e instanceof Error ? e.message : "Gagal menyimpan";
            if (message.includes("RESTORE_CONFIRMATION_REQUIRED")) {
              setPendingRestore(input);
              setOpen(false);
              return;
            }
            toast.error(message);
          }
        }}
      />

      <AlertDialog open={!!pendingRestore} onOpenChange={(o) => !o && setPendingRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produk sudah ada sebelumnya</AlertDialogTitle>
            <AlertDialogDescription>
              Data produk <span className="font-medium text-foreground">{pendingRestore?.name}</span> sudah ada sebelumnya.
              Apakah anda ingin mengaktifkan kembali?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingRestore) return;
                try {
                  await createMut.mutateAsync({ ...pendingRestore, restoreExisting: true });
                  toast.success("Produk diaktifkan kembali");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Gagal mengaktifkan kembali");
                } finally {
                  setPendingRestore(null);
                }
              }}
            >
              Ya, Aktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus data <span className="font-medium text-foreground">{toDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!toDelete) return;
                try {
                  await deleteMut.mutateAsync(toDelete.id);
                  toast.success("Dihapus");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Gagal menghapus");
                } finally {
                  setToDelete(null);
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
