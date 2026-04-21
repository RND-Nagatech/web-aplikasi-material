import { apiClient } from "@/lib/api-client";
import { unwrapData, type ApiEnvelope, type PaginatedData } from "@/lib/api-response";
import type { Transaction, TransactionInput } from "@/types";

interface ApiTransactionItem {
  product?: string | { _id: string; name?: string; nama_produk?: string };
  kode_produk?: string;
  qty: number;
  price?: number;
  harga_jual?: number;
  harga_beli?: number;
  subtotal: number;
}

interface ApiTransaction {
  _id: string;
  type?: string;
  type_trx?: string;
  no_faktur_jual?: string;
  no_faktur_beli?: string;
  customer?: string | { _id: string; name?: string; nama_customer?: string };
  kode_customer?: string;
  nama_customer?: string;
  no_hp?: string;
  alamat?: string;
  customer_name?: string;
  items: ApiTransactionItem[];
  total: number;
  paid?: number;
  dibayar?: number;
  kembalian?: number;
  status?: string;
  createdAt: string;
  created_date?: string;
}

const mapTypeFromApi = (type: string): Transaction["type"] => {
  const t = (type ?? "jual").toString().toLowerCase();
  return t === "jual" ? "sale" : "purchase";
};

const mapTypeToApi = (type: TransactionInput["type"]): ApiTransaction["type"] =>
  type === "sale" ? "jual" : "beli";

const mapTransaction = (item: ApiTransaction): Transaction => {
  const resolvedType = mapTypeFromApi(item.type_trx ?? item.type ?? "jual");
  return {
    id: item._id,
    type: resolvedType,
    invoiceNumber: item.no_faktur_jual ?? item.no_faktur_beli,
    customerId:
      item.kode_customer
      ?? (typeof item.customer === "string" ? item.customer : item.customer?._id ?? ""),
    customerName:
      item.nama_customer
      ?? item.customer_name
      ?? (typeof item.customer === "string"
        ? undefined
        : item.customer?.nama_customer ?? item.customer?.name),
    customerPhone: item.no_hp,
    customerAddress: item.alamat,
    items: item.items.map((it) => {
      const unitPrice = resolvedType === "sale"
        ? (it.harga_jual ?? it.price ?? 0)
        : (it.harga_beli ?? it.price ?? 0);

      return {
        productId: it.kode_produk ?? (typeof it.product === "string" ? it.product : it.product?._id ?? ""),
        productName:
          it.kode_produk
            ? undefined
            : typeof it.product === "string"
            ? undefined
            : it.product?.nama_produk ?? it.product?.name,
        quantity: it.qty,
        priceType: "retail",
        unitPrice,
        subtotal: it.subtotal,
      };
    }),
    total: item.total,
    paid: item.dibayar ?? item.paid ?? 0,
    change: item.kembalian ?? 0,
    createdAt: item.created_date ?? item.createdAt,
  };
};

export const transactionsService = {
  list: () =>
    apiClient
      .get<ApiEnvelope<PaginatedData<ApiTransaction>>>("/transactions?limit=100")
      .then((r) => unwrapData(r.data).items.map(mapTransaction)),
  create: (input: TransactionInput) =>
    apiClient
      .post<ApiEnvelope<ApiTransaction>>("/transactions", {
        type: mapTypeToApi(input.type),
        customer: input.customerId || undefined,
        nama_customer: input.customerName,
        no_hp: input.customerPhone,
        alamat: input.customerAddress,
        items: input.items.map((it) => ({
          product: it.productId,
          qty: it.quantity,
          price: it.unitPrice,
          harga_jual: it.unitPrice,
          harga_beli: it.unitPrice,
          subtotal: it.quantity * it.unitPrice,
        })),
        total: input.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
        dibayar: input.paid,
      })
      .then((r) => mapTransaction(unwrapData(r.data))),
};
