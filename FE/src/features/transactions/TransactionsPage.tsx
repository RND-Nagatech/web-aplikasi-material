import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Search, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
// PageHeader not used; layout follows the styling guide inside a unified Card
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { TableFetchProgress } from "@/components/common/TableFetchProgress";
import { TablePagination } from "@/components/common/TablePagination";
import { ErrorState } from "@/components/common/States";
import emptyDataIcon from "../../../assets/empty.svg";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { formatCurrency, formatDate } from "@/lib/format";
import { useProducts } from "@/features/products/hooks";
import { useCreateTransaction, useTransactions } from "./hooks";
import type { Transaction, TransactionInput } from "@/types";
import { customersService } from "@/services/customers";
import { storesService } from "@/services/stores";
import ngtcLogo from "../../../assets/NGTC.png";
import lunasIcon from "../../../assets/lunas_icon.png";
import belumLunasIcon from "../../../assets/belum_lunas_icon.png";
import reprintIcon from "../../../assets/reprint_icon.png";
import { DEFAULT_PAGE_SIZE, transactionSchema, typeLabel, type TransactionFormOutput, type TransactionFormValues } from "./transaction-form";
import type { NotaItem } from "./nota-pdf";

type NotaPdfModule = typeof import("./nota-pdf");
let notaPdfModulePromise: Promise<NotaPdfModule> | null = null;
const getNotaPdfModule = (): Promise<NotaPdfModule> => {
  if (!notaPdfModulePromise) {
    notaPdfModulePromise = import("./nota-pdf");
  }
  return notaPdfModulePromise;
};

export default function TransactionsPage() {
  const { data: txs, isLoading, isFetching, isError, refetch } = useTransactions();
  const { data: products = [] } = useProducts();
  const storesQ = useQuery({
    queryKey: ["stores", "nota-header"],
    queryFn: storesService.list,
  });
  const createMut = useCreateTransaction();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!txs) return [];
    const q = search.trim().toLowerCase();
    return q
      ? txs.filter((t) => (
        (t.customerName ?? "").toLowerCase().includes(q)
        || (t.invoiceNumber ?? "").toLowerCase().includes(q)
        || (t.type ?? "").toLowerCase().includes(q)
        || formatDate(t.createdAt ?? "").toLowerCase().includes(q)
      ))
      : txs;
  }, [txs, search]);

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

  const handleReprintNota = async (transaction: Transaction) => {
    try {
      const notaPdf = await getNotaPdfModule();
      const [logoDataUrl, lunasIconDataUrl, belumLunasIconDataUrl] = await Promise.all([
        notaPdf.loadImageAsDataUrl(ngtcLogo),
        notaPdf.loadImageAsDataUrl(lunasIcon),
        notaPdf.loadImageAsDataUrl(belumLunasIcon),
      ]);
      const mappedItems: NotaItem[] = notaPdf.mapNotaItemsFromTransaction(transaction, products);
      const statusIconDataUrl = (Number(transaction.paid) || 0) >= (Number(transaction.total) || 0)
        ? lunasIconDataUrl
        : belumLunasIconDataUrl;
      await notaPdf.downloadNotaPdf({
        store: storesQ.data?.[0],
        logoDataUrl,
        statusIconDataUrl,
        transaction,
        items: mappedItems,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal reprint nota.");
    }
  };

  return (
    <div>
      <Card className="overflow-hidden p-0">
        <div className="bg-primary px-6 py-4 text-primary-foreground">
          <h1 className="text-lg font-semibold">Transaksi</h1>
        </div>

        <div className="flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari transaksi…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button className="rounded-none" onClick={() => setOpen(true)} disabled={products.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> Transaksi baru
          </Button>
        </div>

        <TableFetchProgress loading={isFetching && !isLoading} />
        {isLoading ? (
          <div className="bg-muted/20 p-6"><TableSkeleton /></div>
        ) : isError ? (
          <div className="bg-muted/20 p-6"><ErrorState onRetry={() => refetch()} /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-muted/20 p-6">
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-base text-muted-foreground">
              <img src={emptyDataIcon} alt="Data tidak ada" className="h-64 w-64 object-contain" />
              <p className="text-lg font-semibold leading-none">Belum ada transaksi</p>
              <p className="text-sm text-muted-foreground">Buat transaksi untuk mencatat penjualan atau pembelian.</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="border border-border bg-muted/20">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                    <TableHead className="font-semibold text-foreground">No Faktur</TableHead>
                    <TableHead className="font-semibold text-foreground">Kode</TableHead>
                    <TableHead className="font-semibold text-foreground">Nama</TableHead>
                    <TableHead className="font-semibold text-foreground">Tipe</TableHead>
                    <TableHead className="text-right font-semibold tabular-nums">Item</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Total</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Dibayar</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Kembalian</TableHead>
                    <TableHead className="w-[74px] text-center font-semibold text-foreground">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                      <TableCell className="font-medium">{t.invoiceNumber ?? "-"}</TableCell>
                      <TableCell className="font-medium">{t.customerId ?? "-"}</TableCell>
                      <TableCell>{t.customerName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === "sale" ? "default" : "secondary"}>{typeLabel(t.type)}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{t.items.length}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(t.total)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(t.paid)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(t.change ?? 0)}</TableCell>
                      <TableCell className="text-center">
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
                            <DropdownMenuItem onClick={() => void handleReprintNota(t)} className="flex h-8 w-8 justify-center p-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex h-8 w-8 items-center justify-center">
                                    <img src={reprintIcon} alt="Reprint" className="h-4 w-4 object-cover" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="whitespace-nowrap px-1 py-0.5 text-xs">
                                  {t.type === "sale" ? "Reprint Nota Penjualan" : "Reprint Nota Pembelian"}
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

              <div className="flex items-center justify-between border-t border-border bg-background px-6 py-3">
                <p className="text-sm font-medium">Total Transaksi: {totalItems}</p>
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

      <TransactionDialog
        open={open}
        onOpenChange={setOpen}
        submitting={createMut.isPending}
        onSubmit={async (input) => {
          try {
            const created = await createMut.mutateAsync(input);
            const notaPdf = await getNotaPdfModule();
            const [logoDataUrl, lunasIconDataUrl, belumLunasIconDataUrl] = await Promise.all([
              notaPdf.loadImageAsDataUrl(ngtcLogo),
              notaPdf.loadImageAsDataUrl(lunasIcon),
              notaPdf.loadImageAsDataUrl(belumLunasIcon),
            ]);
            const mappedItems: NotaItem[] = notaPdf.mapNotaItemsFromTransaction(created, products);
            const statusIconDataUrl = (Number(created.paid) || 0) >= (Number(created.total) || 0)
              ? lunasIconDataUrl
              : belumLunasIconDataUrl;
            await notaPdf.downloadNotaPdf({
              store: storesQ.data?.[0],
              logoDataUrl,
              statusIconDataUrl,
              transaction: created,
              items: mappedItems,
            });
            toast.success("Transaksi tercatat");
            setOpen(false);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Gagal");
          }
        }}
      />
    </div>
  );
}

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: TransactionInput) => Promise<void> | void;
  submitting?: boolean;
}

function TransactionDialog({ open, onOpenChange, onSubmit, submitting }: DialogProps) {
  const { data: products = [] } = useProducts();
  const [customerEntryOpen, setCustomerEntryOpen] = useState(false);
  const [itemEntryOpen, setItemEntryOpen] = useState(false);
  const [paymentEntryOpen, setPaymentEntryOpen] = useState(false);
  const [customerFilterOpen, setCustomerFilterOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterAddress, setFilterAddress] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerPageSize, setPickerPageSize] = useState(10);
  const [basePickerFilter, setBasePickerFilter] = useState<{
    nama_customer?: string;
    no_hp?: string;
    alamat?: string;
  } | null>(null);
  const [pickerFilter, setPickerFilter] = useState<{
    nama_customer?: string;
    no_hp?: string;
    alamat?: string;
    search?: string;
  } | null>(null);
  const [pickerLoaded, setPickerLoaded] = useState(false);
  const [draftPaid, setDraftPaid] = useState(0);
  const [draftItem, setDraftItem] = useState<{
    productId: string;
    priceType: "wholesale" | "retail";
    quantity: number | "";
    unitPrice: number;
  }>({
    productId: "",
    priceType: "retail",
    quantity: "",
    unitPrice: 0,
  });

  const form = useForm<TransactionFormValues, unknown, TransactionFormOutput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "sale",
      customerId: undefined,
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      paid: 0,
      items: [],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const type = form.watch("type");
  const selectedCustomerId = form.watch("customerId");
  const pickerQ = useQuery({
    queryKey: ["customers", "picker", pickerFilter, pickerPage, pickerPageSize],
    queryFn: () =>
      customersService.searchPaged({
        page: pickerPage,
        limit: pickerPageSize,
        nama_customer: pickerFilter?.nama_customer,
        no_hp: pickerFilter?.no_hp,
        alamat: pickerFilter?.alamat,
        search: pickerFilter?.search,
      }),
    enabled: pickerLoaded && pickerFilter !== null,
  });

  const filteredCustomers = pickerQ.data?.items ?? [];

  const total = items.reduce(
    (sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0),
    0,
  );
  const paidValue = Number(form.watch("paid")) || 0;
  const remaining = Math.max(0, total - paidValue);
  const change = Math.max(0, paidValue - total);
  const paymentRemainingDraft = Math.max(0, total - draftPaid);
  const paymentChangeDraft = Math.max(0, draftPaid - total);

  const syncDraftPrice = (productId: string, priceType: "wholesale" | "retail") => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    return priceType === "wholesale" ? product.wholesalePrice : product.retailPrice;
  };

  useEffect(() => {
    if (open) {
      form.reset({
        type: undefined,
        customerId: undefined,
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        paid: 0,
        items: [],
      });
      setCustomerEntryOpen(false);
      setItemEntryOpen(false);
      setPaymentEntryOpen(false);
      setCustomerFilterOpen(false);
      setDraftPaid(0);
      setDraftItem({ productId: "", priceType: "retail", quantity: "", unitPrice: 0 });
      setPickerLoaded(false);
      setFilterName("");
      setFilterPhone("");
      setFilterAddress("");
      setFilterSearch("");
      setBasePickerFilter(null);
      setPickerFilter(null);
      setPickerPage(1);
      setPickerPageSize(10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!customerFilterOpen) return;
    setPickerPage(1);
    setPickerPageSize(10);
  }, [customerFilterOpen]);

  const submitCustomerBaseFilter = () => {
    const nama_customer = filterName.trim();
    const no_hp = filterPhone.trim();
    const alamat = filterAddress.trim();
    if (!nama_customer && !no_hp && !alamat) {
      toast.error("Isi minimal satu filter: nama customer, no hp, atau alamat.");
      return;
    }
    const nextBase = {
      nama_customer: nama_customer || undefined,
      no_hp: no_hp || undefined,
      alamat: alamat || undefined,
    };
    setPickerPage(1);
    setBasePickerFilter(nextBase);
    setPickerFilter({ ...nextBase, search: undefined });
    setPickerLoaded(true);
  };

  const submitCustomerSearch = () => {
    if (!pickerLoaded || !basePickerFilter) return;
    setPickerPage(1);
    setPickerFilter({
      ...basePickerFilter,
      search: filterSearch.trim() || undefined,
    });
  };

  const onAddItem = () => {
    if (!draftItem.productId) {
      toast.error("Pilih produk terlebih dahulu");
      return;
    }
    const qty = Number(draftItem.quantity);
    if (!qty || Number.isNaN(qty) || qty < 1) {
      toast.error("Maaf data quantity harus diisi");
      return;
    }
    append({
      productId: draftItem.productId,
      quantity: qty,
      priceType: draftItem.priceType,
      unitPrice: draftItem.unitPrice,
    });
    setDraftItem({ productId: "", priceType: "retail", quantity: "", unitPrice: 0 });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[90vh] max-h-[90vh] w-[calc(100%-1.5rem)] max-w-5xl flex-col p-0 sm:h-[86vh] sm:rounded-none">
        <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>Transaksi baru</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={form.handleSubmit(
            async (values) => {
              if (!values.type) {
                toast.error("Type transaksi belum dipilih");
                return;
              }
              await onSubmit({
                type: values.type,
                customerId: values.customerId,
                customerName: values.customerName,
                customerPhone: (values.customerPhone ?? "").trim() || "-",
                customerAddress: (values.customerAddress ?? "").trim() || "-",
                paid: values.paid,
                items: values.items.map((it) => ({
                  productId: it.productId,
                  quantity: it.quantity,
                  priceType: it.priceType,
                  unitPrice: it.unitPrice,
                })),
              });
            },
            (errors) => {
              const hasTypeError = Boolean(errors.type);
              const hasQuantityError = Array.isArray(errors.items)
                && errors.items.some((itemErr) => Boolean(itemErr?.quantity));
              if (hasTypeError && hasQuantityError) {
                toast.error("Type transaksi belum dipilih dan quantity belum diisi");
                return;
              }
              if (hasTypeError) {
                toast.error("Type transaksi belum dipilih");
                return;
              }
              if (hasQuantityError) {
                toast.error("Maaf data quantity harus diisi");
                return;
              }
              toast.error("Mohon periksa data transaksi terlebih dahulu");
            },
          )}
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-6 sm:px-6">
            <div className="grid grid-cols-1 gap-3 sm:max-w-sm">
              <div className="space-y-1">
                <Label>Tipe</Label>
                <Select value={type} onValueChange={(v) => form.setValue("type", v as "sale" | "purchase")}>
                  <SelectTrigger className="rounded-none"><SelectValue placeholder="Silahkan pilih type transaksi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Penjualan</SelectItem>
                    <SelectItem value="purchase">Pembelian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button type="button" className="rounded-none bg-blue-600 text-white hover:bg-blue-700" onClick={() => setCustomerEntryOpen(true)}>
                Data Customer
              </Button>
              <Button type="button" className="rounded-none bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setItemEntryOpen(true)}>
                Tambah Barang
              </Button>
              <Button type="button" className="rounded-none bg-amber-600 text-white hover:bg-amber-700" onClick={() => {
                setDraftPaid(paidValue);
                setPaymentEntryOpen(true);
              }}>
                Bayar Sekarang
              </Button>
            </div>

            <div className="space-y-3 border border-border p-3">
              <p className="text-sm font-semibold">Data Customer</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>No Hp</TableHead>
                    <TableHead>Alamat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{form.watch("customerName") || "-"}</TableCell>
                    <TableCell>{form.watch("customerPhone") || "-"}</TableCell>
                    <TableCell>{form.watch("customerAddress") || "-"}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {form.formState.errors.customerName && (
                <p className="text-xs text-destructive">{form.formState.errors.customerName.message}</p>
              )}
            </div>

            <div className="space-y-3 border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Data Barang ({fields.length})</p>
                <p className="text-sm text-muted-foreground">Total: {formatCurrency(total)}</p>
              </div>
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Tipe Harga</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">Belum ada item</TableCell>
                      </TableRow>
                    ) : (
                      fields.map((field, idx) => {
                        const it = items[idx];
                        const productName = products.find((p) => p.id === it.productId)?.name ?? "-";
                        const subtotal = (Number(it?.quantity) || 0) * (Number(it?.unitPrice) || 0);
                        return (
                          <TableRow key={field.id}>
                            <TableCell>{productName}</TableCell>
                            <TableCell>{it.priceType === "wholesale" ? "Grosir" : "Eceran"}</TableCell>
                            <TableCell className="text-right">{Number(it.quantity) || 0}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(it.unitPrice) || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {form.formState.errors.items && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.items.message ?? "Periksa item"}
                </p>
              )}
            </div>

            <div className="space-y-1 border border-border p-3">
              <p className="text-sm font-semibold">Pembayaran</p>
              <p className="text-sm text-muted-foreground">Dibayar: {formatCurrency(paidValue)}</p>
              <p className="text-sm text-muted-foreground">Sisa: {formatCurrency(remaining)}</p>
              <p className="text-sm text-muted-foreground">Kembalian: {formatCurrency(change)}</p>
            </div>
          </div>

          <div className="border-t border-border bg-background px-4 py-4 shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.25)] sm:px-6">
            <div className="flex items-end justify-between">
              <div className="text-sm text-muted-foreground">Pastikan data customer, item, dan pembayaran sudah benar.</div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-2xl font-semibold tabular-nums">{formatCurrency(total)}</div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-none">Batal</Button>
              <Button type="submit" disabled={submitting} className="rounded-none">{submitting ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </div>
        </form>
        </DialogContent>
      </Dialog>

      <Dialog open={customerEntryOpen} onOpenChange={setCustomerEntryOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-1.5rem)] max-w-4xl overflow-hidden p-0 sm:rounded-none">
          <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
            <DialogTitle>Data Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Nama Customer</Label>
                <Input
                  placeholder="Masukkan nama customer"
                  value={form.watch("customerName")}
                  onChange={(e) => {
                    form.setValue("customerName", e.target.value.toUpperCase(), { shouldValidate: true });
                    form.setValue("customerId", undefined, { shouldValidate: false });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>No Hp</Label>
                <Input
                  placeholder="Masukkan no hp"
                  value={form.watch("customerPhone") ?? ""}
                  onChange={(e) => {
                    form.setValue("customerPhone", e.target.value, { shouldValidate: false });
                    form.setValue("customerId", undefined, { shouldValidate: false });
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Alamat Customer</Label>
                <Input
                  placeholder="Masukkan alamat customer"
                  value={form.watch("customerAddress") ?? ""}
                  onChange={(e) => {
                    form.setValue("customerAddress", e.target.value.toUpperCase(), { shouldValidate: false });
                    form.setValue("customerId", undefined, { shouldValidate: false });
                  }}
                />
              </div>
            </div>
            <div className="flex justify-start">
              <Button type="button" className="rounded-none bg-blue-600 text-white hover:bg-blue-700" onClick={() => setCustomerFilterOpen(true)}>
                Filter Data Customer
              </Button>
            </div>
            <div className="border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>No Hp</TableHead>
                    <TableHead>Alamat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{form.watch("customerName") || "-"}</TableCell>
                    <TableCell>{form.watch("customerPhone") || "-"}</TableCell>
                    <TableCell>{form.watch("customerAddress") || "-"}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter className="border-t border-border px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => {
                form.setValue("customerId", undefined, { shouldValidate: false });
                form.setValue("customerName", "", { shouldValidate: true });
                form.setValue("customerPhone", "", { shouldValidate: false });
                form.setValue("customerAddress", "", { shouldValidate: false });
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => {
                const name = (form.watch("customerName") ?? "").trim();
                if (!name) {
                  toast.error("Nama customer wajib diisi");
                  return;
                }
                setCustomerEntryOpen(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemEntryOpen} onOpenChange={setItemEntryOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-1.5rem)] max-w-5xl overflow-hidden p-0 sm:rounded-none">
          <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
            <DialogTitle>Tambah Barang</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-5">
                <Label className="mb-1 block">Produk</Label>
                <Select
                  value={draftItem.productId}
                  onValueChange={(value) => {
                    const nextPrice = syncDraftPrice(value, draftItem.priceType);
                    setDraftItem((prev) => ({ ...prev, productId: value, unitPrice: nextPrice }));
                  }}
                >
                  <SelectTrigger className="rounded-none"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block">Tipe Harga</Label>
                <Select
                  value={draftItem.priceType}
                  onValueChange={(value) => {
                    const priceType = value as "wholesale" | "retail";
                    const nextPrice = syncDraftPrice(draftItem.productId, priceType);
                    setDraftItem((prev) => ({ ...prev, priceType, unitPrice: nextPrice }));
                  }}
                >
                  <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Eceran</SelectItem>
                    <SelectItem value="wholesale">Grosir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Label className="mb-1 block">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="qty"
                  value={draftItem.quantity}
                  onChange={(e) => setDraftItem((prev) => ({ ...prev, quantity: e.target.value === "" ? "" : Number(e.target.value) || "" }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block">Harga</Label>
                <CurrencyInput
                  value={draftItem.unitPrice}
                  onChange={(value) => setDraftItem((prev) => ({ ...prev, unitPrice: value }))}
                />
              </div>
              <div className="flex items-end justify-end md:col-span-2">
                <Button type="button" className="rounded-none" onClick={onAddItem}>
                  <Plus className="mr-1 h-4 w-4" /> Tambah item
                </Button>
              </div>
            </div>

            <div className="max-h-[45vh] overflow-auto border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Tipe Harga</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-14 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">Belum ada item</TableCell>
                    </TableRow>
                  ) : (
                    fields.map((field, idx) => {
                      const it = items[idx];
                      const productName = products.find((p) => p.id === it.productId)?.name ?? "-";
                      const subtotal = (Number(it?.quantity) || 0) * (Number(it?.unitPrice) || 0);
                      return (
                        <TableRow key={field.id}>
                          <TableCell>{productName}</TableCell>
                          <TableCell>{it.priceType === "wholesale" ? "Grosir" : "Eceran"}</TableCell>
                          <TableCell className="text-right">{Number(it.quantity) || 0}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(it.unitPrice) || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)} className="rounded-none">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter className="border-t border-border px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" className="rounded-none" onClick={() => replace([])}>
              Reset
            </Button>
            <Button type="button" className="rounded-none" onClick={() => setItemEntryOpen(false)}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentEntryOpen} onOpenChange={setPaymentEntryOpen}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle>Bayar Sekarang</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Total Transaksi: {formatCurrency(total)}</div>
            <div className="space-y-1">
              <Label>Jumlah dibayar</Label>
              <CurrencyInput value={draftPaid} onChange={setDraftPaid} />
            </div>
            <p className="text-sm text-muted-foreground">Sisa: {formatCurrency(paymentRemainingDraft)}</p>
            <p className="text-sm text-muted-foreground">Kembalian: {formatCurrency(paymentChangeDraft)}</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-none" onClick={() => setDraftPaid(0)}>
              Reset
            </Button>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => {
                form.setValue("paid", draftPaid, { shouldValidate: true });
                setPaymentEntryOpen(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={customerFilterOpen} onOpenChange={setCustomerFilterOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-1.5rem)] max-w-6xl overflow-hidden p-0 sm:rounded-none">
          <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
            <DialogTitle>Filter Data Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Nama Customer</Label>
                <Input
                  placeholder="Masukkan nama customer"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value.toUpperCase())}
                  className="w-full max-w-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitCustomerBaseFilter();
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>No Hp</Label>
                <Input
                  placeholder="Masukkan no hp"
                  value={filterPhone}
                  onChange={(e) => setFilterPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitCustomerBaseFilter();
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Alamat Customer</Label>
                <Input
                  placeholder="Masukkan alamat customer"
                  value={filterAddress}
                  onChange={(e) => setFilterAddress(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitCustomerBaseFilter();
                    }
                  }}
                />
              </div>
            </div>

            <div className="max-w-xs">
              <Input
                placeholder={pickerLoaded ? "Cari data..." : "Isi nama/no/alamat lalu tekan enter (Enter)"}
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full"
                disabled={!pickerLoaded}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitCustomerSearch();
                  }
                }}
              />
            </div>

            <div className="max-h-[45vh] overflow-auto border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-14" />
                    <TableHead>Kode Customer</TableHead>
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>No Hp</TableHead>
                    <TableHead>Alamat Customer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!pickerLoaded ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                        Isi salah satu filter dari nama/no hp/alamat lalu tekan Enter untuk memuat data.
                      </TableCell>
                    </TableRow>
                  ) : pickerQ.isLoading || pickerQ.isFetching ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                        Memuat data customer...
                      </TableCell>
                    </TableRow>
                  ) : pickerQ.isError ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-destructive">
                        Gagal memuat data customer.
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                        Data customer tidak ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedCustomerId === customer.id}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                form.setValue("customerId", undefined, { shouldValidate: false });
                                return;
                              }
                              form.setValue("customerId", customer.id, { shouldValidate: false });
                              form.setValue("customerName", customer.nama_customer, { shouldValidate: true });
                              form.setValue("customerPhone", customer.no_hp || "-", { shouldValidate: false });
                              form.setValue("customerAddress", customer.alamat || "-", { shouldValidate: false });
                              setCustomerFilterOpen(false);
                            }}
                          />
                        </TableCell>
                        <TableCell>{customer.kodeCustomer ?? "-"}</TableCell>
                        <TableCell>{customer.nama_customer}</TableCell>
                        <TableCell>{customer.no_hp || "-"}</TableCell>
                        <TableCell>{customer.alamat || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {pickerLoaded && (
              <TablePagination
                page={pickerQ.data?.page ?? pickerPage}
                pageSize={pickerQ.data?.limit ?? pickerPageSize}
                totalItems={pickerQ.data?.total ?? 0}
                onPageChange={setPickerPage}
                onPageSizeChange={(value) => {
                  setPickerPage(1);
                  setPickerPageSize(value);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
