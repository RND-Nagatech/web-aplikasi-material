import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { TablePagination } from "@/components/common/TablePagination";
import { ErrorState } from "@/components/common/States";
import emptyDataIcon from "../../../assets/empty.svg";
import { formatDate } from "@/lib/format";
import { useCreateStore, useStores, useUpdateStore } from "./hooks";
import type { StoreInput } from "@/types";

const schema = z.object({
  nama_toko: z.string().trim().min(1, "Wajib diisi").max(120),
  no_hp: z.string().trim().min(1, "Wajib diisi").max(40),
  alamat: z.string().trim().min(1, "Wajib diisi").max(255),
});

const DEFAULT_PAGE_SIZE = 10;

export default function StoresPage() {
  const { data, isLoading, isError, refetch } = useStores();
  const createMut = useCreateStore();
  const updateMut = useUpdateStore();
  const [editing, setEditing] = useState<null | { id: string; nama_toko: string; no_hp: string; alamat: string }>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const form = useForm<StoreInput>({
    resolver: zodResolver(schema),
    defaultValues: { nama_toko: "", no_hp: "", alamat: "" },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return q
      ? data.filter((s) => (s.nama_toko ?? "").toLowerCase().includes(q)
        || (s.kode_toko ?? "").toLowerCase().includes(q)
        || (s.no_hp ?? "").toLowerCase().includes(q)
        || (s.alamat ?? "").toLowerCase().includes(q))
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
      <Card className="overflow-hidden p-0">
        <div className="bg-primary px-6 py-4 text-primary-foreground">
          <h1 className="text-lg font-semibold">Master Toko</h1>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari toko…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button className="rounded-none" onClick={() => { form.reset({ nama_toko: "", no_hp: "", alamat: "" }); setEditing(null); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Tambah data
          </Button>
        </div>

        {isLoading ? (
          <div className="bg-muted/20 p-6"><TableSkeleton /></div>
        ) : isError ? (
          <div className="bg-muted/20 p-6"><ErrorState onRetry={() => refetch()} /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-muted/20 p-6">
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-base text-muted-foreground">
              <img src={emptyDataIcon} alt="Data tidak ada" className="h-64 w-64 object-contain" />
              <p className="text-lg font-semibold leading-none">Belum ada data toko</p>
              <p className="text-sm text-muted-foreground">Tambahkan data master toko untuk memulai.</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="border border-border bg-muted/20">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold text-foreground">Kode Toko</TableHead>
                    <TableHead className="font-semibold text-foreground">Nama Toko</TableHead>
                    <TableHead className="font-semibold text-foreground">Telepon</TableHead>
                    <TableHead className="font-semibold text-foreground">Alamat</TableHead>
                    <TableHead className="font-semibold text-foreground">Ditambahkan</TableHead>
                    <TableHead className="w-24 font-semibold text-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-medium">{store.kode_toko}</TableCell>
                      <TableCell>{store.nama_toko}</TableCell>
                      <TableCell className="text-muted-foreground">{store.no_hp}</TableCell>
                      <TableCell className="text-muted-foreground">{store.alamat}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(store.createdAt ?? "")}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              form.reset({ nama_toko: store.nama_toko, no_hp: store.no_hp, alamat: store.alamat });
                              setEditing({ id: store.id, nama_toko: store.nama_toko, no_hp: store.no_hp, alamat: store.alamat });
                              setOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t border-border bg-background px-6 py-3">
                <p className="text-sm font-medium">Total Toko: {totalItems}</p>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Toko" : "Tambah Toko"}</DialogTitle></DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              try {
                if (editing) {
                  await updateMut.mutateAsync({ id: editing.id, input: values });
                  toast.success("Data toko diperbarui");
                } else {
                  await createMut.mutateAsync(values);
                  toast.success("Data toko ditambahkan");
                }
                setOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Gagal");
              }
            })}
          >
            <div className="space-y-2">
              <Label htmlFor="nama_toko">Nama Toko</Label>
              <Input id="nama_toko" {...form.register("nama_toko")} />
              {form.formState.errors.nama_toko && <p className="text-xs text-destructive">{form.formState.errors.nama_toko.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="no_hp">No Telpon</Label>
              <Input id="no_hp" {...form.register("no_hp")} />
              {form.formState.errors.no_hp && <p className="text-xs text-destructive">{form.formState.errors.no_hp.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat</Label>
              <Input id="alamat" {...form.register("alamat")} />
              {form.formState.errors.alamat && <p className="text-xs text-destructive">{form.formState.errors.alamat.message}</p>}
            </div>
            <DialogFooter>
              <Button className="rounded-none" type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button className="rounded-none" type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
