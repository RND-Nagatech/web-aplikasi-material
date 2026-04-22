import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
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
import { TablePagination } from "@/components/common/TablePagination";
import { ErrorState } from "@/components/common/States";
import emptyDataIcon from "../../../assets/empty.svg";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { formatCurrency, formatDate } from "@/lib/format";
import { useProducts } from "@/features/products/hooks";
import { useCreateTransaction, useTransactions } from "./hooks";
import type { Store, Transaction, TransactionInput } from "@/types";
import { customersService } from "@/services/customers";
import { storesService } from "@/services/stores";
import ngtcLogo from "../../../assets/NGTC.png";
import lunasIcon from "../../../assets/lunas_icon.png";
import belumLunasIcon from "../../../assets/belum_lunas_icon.png";
import reprintIcon from "../../../assets/reprint_icon.png";

const schema = z.object({
  type: z.enum(["sale", "purchase"]).optional(),
  customerId: z.string().optional(),
  customerName: z.string().trim().min(1, "Nama customer wajib diisi"),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  paid: z.coerce.number().min(0, "Harus ≥ 0"),
  items: z.array(
    z.object({
      productId: z.string().min(1, "Pilih produk"),
      quantity: z.coerce.number().int("Quantity harus bilangan bulat").min(1, "Maaf data quantity harus diisi"),
      priceType: z.enum(["wholesale", "retail"]),
      unitPrice: z.coerce.number().min(0),
    }),
  ).min(1, "Tambahkan minimal satu item"),
});
type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const typeLabel = (t: "sale" | "purchase") => (t === "sale" ? "Penjualan" : "Pembelian");
const DEFAULT_PAGE_SIZE = 10;

interface NotaItem {
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

const loadImageAsDataUrl = (src: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

const chunkItems = <T,>(list: T[], size: number): T[][] => {
  if (size <= 0) return [list];
  const chunks: T[][] = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks.length ? chunks : [[]];
};

const drawNotaSection = (
  doc: jsPDF,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    store?: Store;
    logoDataUrl: string | null;
    statusIconDataUrl: string | null;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    invoiceNumber: string;
    transactionDate: string;
    items: NotaItem[];
    total: number;
  },
) => {
  const {
    x, y, width, height, store, logoDataUrl, statusIconDataUrl, customerName, customerPhone, customerAddress,
    invoiceNumber, transactionDate, items, total,
  } = options;

  const pad = 10;
  const contentX = x + pad;
  const contentY = y + pad;
  const contentW = width - pad * 2;
  const sectionBottom = y + height;
  const rightX = x + width - pad;

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.6);
  doc.rect(x, y, width, height);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text((store?.nama_toko ?? "-").toUpperCase(), contentX, contentY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Alamat: ${(store?.alamat ?? "-").toUpperCase()}`, contentX, contentY + 14);
  doc.text(`No HP : ${store?.no_hp ?? "-"}`, contentX, contentY + 22);
  doc.text(`No Nota: ${invoiceNumber || "-"}`, contentX, contentY + 30);
  doc.text(`Tanggal: ${transactionDate}`, contentX, contentY + 38);

  if (logoDataUrl) {
    try {
      const imageProps = doc.getImageProperties(logoDataUrl);
      const targetWidth = 44;
      const targetHeight = targetWidth * (imageProps.height / imageProps.width);
      doc.addImage(logoDataUrl, "PNG", rightX - targetWidth, contentY, targetWidth, targetHeight);
    } catch {
      // ignore logo failures to keep nota generation robust
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Customer", rightX - 160, contentY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Nama  : ${customerName || "-"}`, rightX - 160, contentY + 14);
  doc.text(`No HP : ${customerPhone || "-"}`, rightX - 160, contentY + 22);
  doc.text(`Alamat: ${customerAddress || "-"}`, rightX - 160, contentY + 30, { maxWidth: 155 });

  const tableTop = contentY + 48;
  const tableBottom = sectionBottom - 40;
  const tableHeight = Math.max(56, tableBottom - tableTop);
  const rowCount = 8;
  const rowH = tableHeight / rowCount;
  const colNo = 24;
  const colProduct = 126;
  const colPrice = 66;
  const colQty = 40;
  const colTotal = contentW - (colNo + colProduct + colPrice + colQty);

  const colX = [
    contentX,
    contentX + colNo,
    contentX + colNo + colProduct,
    contentX + colNo + colProduct + colPrice,
    contentX + colNo + colProduct + colPrice + colQty,
    contentX + colNo + colProduct + colPrice + colQty + colTotal,
  ];

  doc.setLineWidth(0.5);
  doc.rect(contentX, tableTop, contentW, tableHeight);
  const grandRowTop = tableTop + (rowCount - 1) * rowH;
  for (let i = 1; i < colX.length - 1; i += 1) {
    if (i === 4) {
      // Keep JUMLAH column separated on grand total row.
      doc.line(colX[i], tableTop, colX[i], tableTop + tableHeight);
      continue;
    }
    // Merge NO/JENIS/HARGA/QTY cells on grand total row.
    doc.line(colX[i], tableTop, colX[i], grandRowTop);
  }
  for (let r = 1; r < rowCount; r += 1) {
    const yLine = tableTop + r * rowH;
    doc.line(contentX, yLine, contentX + contentW, yLine);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("NO", colX[0] + colNo / 2, tableTop + rowH / 2 + 3, { align: "center" });
  doc.text("JENIS BARANG", colX[1] + 3, tableTop + rowH / 2 + 3);
  doc.text("HARGA", colX[2] + colPrice / 2, tableTop + rowH / 2 + 3, { align: "center" });
  doc.text("QTY", colX[3] + colQty / 2, tableTop + rowH / 2 + 3, { align: "center" });
  doc.text("JUMLAH", colX[4] + colTotal / 2, tableTop + rowH / 2 + 3, { align: "center" });

  const sixRows = [...items];
  while (sixRows.length < 6) sixRows.push({ productName: "", qty: 0, unitPrice: 0, subtotal: 0 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  sixRows.forEach((item, idx) => {
    const rowY = tableTop + (idx + 1) * rowH + rowH / 2 + 3;
    doc.text(item.productName ? String(idx + 1) : "", colX[0] + colNo / 2, rowY, { align: "center" });
    doc.text(item.productName || "", colX[1] + 3, rowY, { maxWidth: colProduct - 6 });
    doc.text(item.productName ? formatCurrency(item.unitPrice) : "", colX[3] - 4, rowY, { align: "right" });
    doc.text(item.productName ? String(item.qty) : "", colX[3] + colQty / 2, rowY, { align: "center" });
    doc.text(item.productName ? formatCurrency(item.subtotal) : "", colX[5] - 4, rowY, { align: "right" });
  });

  if (statusIconDataUrl) {
    try {
      const wmProps = doc.getImageProperties(statusIconDataUrl);
      const wmWidth = 112;
      const wmHeight = wmWidth * (wmProps.height / wmProps.width);
      const wmX = x + (width - wmWidth) / 2;
      const wmY = y + (height - wmHeight) / 2;
      const docAny = doc as any;
      if (typeof docAny.setGState === "function" && typeof docAny.GState === "function") {
        docAny.setGState(new docAny.GState({ opacity: 0.22 }));
      }
      doc.addImage(statusIconDataUrl, "PNG", wmX, wmY, wmWidth, wmHeight);
      if (typeof docAny.setGState === "function" && typeof docAny.GState === "function") {
        docAny.setGState(new docAny.GState({ opacity: 1 }));
      }
    } catch {
      // ignore watermark failures to keep nota generation robust
    }
  }

  const grandY = tableTop + (rowCount - 1) * rowH + rowH / 2 + 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const grandLabelCenterX = (colX[0] + colX[4]) / 2;
  doc.text("GRAND TOTAL", grandLabelCenterX, grandY, { align: "center" });
  doc.text(formatCurrency(total), colX[5] - 4, grandY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.rect(contentX, sectionBottom - 26, 120, 18);
  doc.text("Barang yang sudah dibeli", contentX + 60, sectionBottom - 18, { align: "center" });
  doc.text("tidak dapat ditukar/diuangkan", contentX + 60, sectionBottom - 11, { align: "center" });

  const signatureCenterX = rightX - 90;
  doc.setFontSize(10);
  doc.text("Hormat Kami,", signatureCenterX, sectionBottom - 32, { align: "center" });
  doc.text("(.....................................)", signatureCenterX, sectionBottom - 4, { align: "center" });
};

const downloadNotaPdf = async (params: {
  store?: Store;
  logoDataUrl: string | null;
  statusIconDataUrl: string | null;
  transaction: Transaction;
  items: NotaItem[];
}) => {
  const { store, logoDataUrl, statusIconDataUrl, transaction, items } = params;
  const chunks = chunkItems(items, 6);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const sectionsPerPage = 3;
  const sectionH = (pageH - margin * 2) / 3;
  const customerPhone = transaction.customerPhone?.trim() || "-";
  const customerAddress = transaction.customerAddress?.trim() || "-";
  const customerName = transaction.customerName?.trim() || "-";
  const transactionDate = formatDate(transaction.createdAt);
  const invoiceNumber = transaction.invoiceNumber ?? "-";

  chunks.forEach((chunk, idx) => {
    if (idx > 0 && idx % sectionsPerPage === 0) {
      doc.addPage();
    }
    const positionInPage = idx % sectionsPerPage;
    const y = margin + positionInPage * sectionH;
    drawNotaSection(doc, {
      x: margin,
      y,
      width: pageW - margin * 2,
      height: sectionH,
      store,
      logoDataUrl,
      statusIconDataUrl,
      customerName,
      customerPhone,
      customerAddress,
      invoiceNumber,
      transactionDate,
      items: chunk,
      total: transaction.total,
    });
  });

  const fileName = `NOTA-${(transaction.invoiceNumber ?? "TRANSAKSI").replace(/\s+/g, "-")}.pdf`;
  doc.save(fileName);
};

export default function TransactionsPage() {
  const { data: txs, isLoading, isError, refetch } = useTransactions();
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
      const [logoDataUrl, lunasIconDataUrl, belumLunasIconDataUrl] = await Promise.all([
        loadImageAsDataUrl(ngtcLogo),
        loadImageAsDataUrl(lunasIcon),
        loadImageAsDataUrl(belumLunasIcon),
      ]);
      const mappedItems: NotaItem[] = transaction.items.map((it, idx) => ({
        productName:
          it.productName
          ?? products.find((p) => p.id === it.productId || p.kodeProduk === it.productId)?.name
          ?? it.productId
          ?? `Item ${idx + 1}`,
        qty: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        subtotal: Number(it.subtotal) || ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)),
      }));
      const statusIconDataUrl = (Number(transaction.paid) || 0) >= (Number(transaction.total) || 0)
        ? lunasIconDataUrl
        : belumLunasIconDataUrl;
      await downloadNotaPdf({
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
                    <TableHead className="font-semibold text-foreground">Tipe</TableHead>
                    <TableHead className="font-semibold text-foreground">Pelanggan</TableHead>
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
                      <TableCell>
                        <Badge variant={t.type === "sale" ? "default" : "secondary"}>{typeLabel(t.type)}</Badge>
                      </TableCell>
                      <TableCell>{t.customerName ?? "—"}</TableCell>
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
            const [logoDataUrl, lunasIconDataUrl, belumLunasIconDataUrl] = await Promise.all([
              loadImageAsDataUrl(ngtcLogo),
              loadImageAsDataUrl(lunasIcon),
              loadImageAsDataUrl(belumLunasIcon),
            ]);
            const mappedItems: NotaItem[] = input.items.map((it) => {
              const productName = products.find((p) => p.id === it.productId)?.name ?? "-";
              const subtotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
              return {
                productName,
                qty: Number(it.quantity) || 0,
                unitPrice: Number(it.unitPrice) || 0,
                subtotal,
              };
            });
            const statusIconDataUrl = (Number(created.paid) || 0) >= (Number(created.total) || 0)
              ? lunasIconDataUrl
              : belumLunasIconDataUrl;
            await downloadNotaPdf({
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

  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(schema),
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
                    form.setValue("customerName", e.target.value, { shouldValidate: true });
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
                    form.setValue("customerAddress", e.target.value, { shouldValidate: false });
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
                  onChange={(e) => setFilterName(e.target.value)}
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
                  onChange={(e) => setFilterAddress(e.target.value)}
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
