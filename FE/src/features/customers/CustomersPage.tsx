import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
// PageHeader not used; layout follows the styling guide inside a unified Card
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { TableFetchProgress } from "@/components/common/TableFetchProgress";
import { TablePagination } from "@/components/common/TablePagination";
import { ErrorState } from "@/components/common/States";
import emptyDataIcon from "../../../assets/empty.svg";
import { formatDate } from "@/lib/format";
import { useCreateCustomer, useCustomers, useUpdateCustomer, useDeleteCustomer } from "./hooks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CustomerInput } from "@/types";

const schema = z.object({
  nama_customer: z.string().trim().min(1, "Wajib diisi").max(120),
  no_hp: z.string().trim().max(40).optional().or(z.literal("")),
  alamat: z.string().trim().max(255).optional().or(z.literal("")),
});

const DEFAULT_PAGE_SIZE = 10;

export default function CustomersPage() {
  const { data, isLoading, isFetching, isError, refetch } = useCustomers();
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const deleteMut = useDeleteCustomer();
  const [editing, setEditing] = useState<null | { id: string; nama_customer: string; no_hp?: string; alamat?: string }>(null);
  const [toDelete, setToDelete] = useState<null | { id: string; nama_customer?: string }>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const form = useForm<CustomerInput>({
    resolver: zodResolver(schema),
    defaultValues: { nama_customer: "", no_hp: "", alamat: "" },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return q
      ? data.filter((c) => (c.nama_customer ?? "").toLowerCase().includes(q)
        || (c.kodeCustomer ?? "").toLowerCase().includes(q)
        || (c.no_hp ?? "").toLowerCase().includes(q)
        || (c.alamat ?? "").toLowerCase().includes(q))
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
          <h1 className="text-lg font-semibold">Pelanggan</h1>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button className="rounded-none" onClick={() => { form.reset({ nama_customer: "", no_hp: "", alamat: "" }); setEditing(null); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Pelanggan baru
          </Button>
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
              <p className="text-lg font-semibold leading-none">Belum ada pelanggan</p>
              <p className="text-sm text-muted-foreground">Belum ada pelanggan yang tersedia.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="border border-border bg-muted/20">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold text-foreground">Kode</TableHead>
                      <TableHead className="font-semibold text-foreground">Nama</TableHead>
                      <TableHead className="font-semibold text-foreground">Telepon</TableHead>
                      <TableHead className="font-semibold text-foreground">Alamat</TableHead>
                      <TableHead className="font-semibold text-foreground">Ditambahkan</TableHead>
                    <TableHead className="w-24 font-semibold text-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((c) => (
                    <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.kodeCustomer ?? "-"}</TableCell>
                        <TableCell className="font-medium">{c.nama_customer}</TableCell>
                      <TableCell className="text-muted-foreground">{c.no_hp || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.alamat || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(c.createdAt ?? "")}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { form.reset({ nama_customer: c.nama_customer, no_hp: c.no_hp, alamat: c.alamat }); setEditing({ id: c.id, nama_customer: c.nama_customer, no_hp: c.no_hp, alamat: c.alamat }); setOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setToDelete({ id: c.id, nama_customer: c.nama_customer })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3 sm:px-6">
                <p className="text-sm font-medium">Total Pelanggan: {totalItems}</p>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Pelanggan' : 'Pelanggan baru'}</DialogTitle></DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                if (editing) {
                  await updateMut.mutateAsync({ id: editing.id, input: values });
                  toast.success('Pelanggan diperbarui');
                } else {
                  await createMut.mutateAsync(values);
                  toast.success('Pelanggan ditambahkan');
                }
                setOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Gagal');
              }
            })}
          >
            <div className="space-y-2">
              <Label htmlFor="nama_customer">Nama</Label>
              <Input
                id="nama_customer"
                value={form.watch("nama_customer") ?? ""}
                onChange={(e) =>
                  form.setValue("nama_customer", e.target.value.toUpperCase(), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              {form.formState.errors.nama_customer && <p className="text-xs text-destructive">{form.formState.errors.nama_customer.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="no_hp">Telepon</Label>
              <Input id="no_hp" {...form.register("no_hp")} />
              {form.formState.errors.no_hp && <p className="text-xs text-destructive">{form.formState.errors.no_hp.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat</Label>
              <Input
                id="alamat"
                value={form.watch("alamat") ?? ""}
                onChange={(e) =>
                  form.setValue("alamat", e.target.value.toUpperCase(), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              {form.formState.errors.alamat && <p className="text-xs text-destructive">{form.formState.errors.alamat.message}</p>}
            </div>
            <DialogFooter>
              <Button className="rounded-none" type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button className="rounded-none" type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pelanggan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menandai pelanggan sebagai <span className="font-medium text-foreground">{toDelete?.nama_customer} </span> terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!toDelete) return;
                try {
                  await deleteMut.mutateAsync(toDelete.id);
                  toast.success('Dihapus');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Gagal menghapus');
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
