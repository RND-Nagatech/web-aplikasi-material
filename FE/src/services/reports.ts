import { apiClient } from "@/lib/api-client";
import { unwrapData, type ApiEnvelope } from "@/lib/api-response";
import type {
  Debt,
  DebtReport,
  FinanceReport,
  FinanceReportType,
  Payable,
  PayableReport,
  StockReport,
  StockReportItem,
} from "@/types";

interface ApiStockReportItem {
  _id: string;
  nama_produk?: string;
  stock_on_hand?: number;
  harga_grosir?: number;
  harga_ecer?: number;
  name?: string;
  stock?: number;
  price_grosir?: number;
  price_ecer?: number;
}

interface ApiStockReportResponse {
  items: ApiStockReportItem[];
  summary: StockReport["summary"];
}

interface ApiDebtItem {
  _id: string;
  customer?: string | { _id: string; name?: string; nama_customer?: string };
  kode_customer?: string;
  customer_name?: string;
  nama_customer?: string;
  no_faktur_jual?: string;
  transaction?: string | { _id: string } | null;
  total: number;
  paid?: number;
  dibayar?: number;
  sisa?: number;
  remaining?: number;
  createdAt?: string;
  created_date?: string;
}

interface ApiDebtReportResponse {
  items: ApiDebtItem[];
  summary: DebtReport["summary"];
}

interface ApiPayableItem {
  _id: string;
  customer?: string | { _id: string; name?: string; nama_customer?: string };
  kode_customer?: string;
  customer_name?: string;
  nama_customer?: string;
  no_faktur_beli?: string;
  transaction?: string | { _id: string } | null;
  total: number;
  paid?: number;
  dibayar?: number;
  sisa?: number;
  remaining?: number;
  createdAt?: string;
  created_date?: string;
}

interface ApiPayableReportResponse {
  items: ApiPayableItem[];
  summary: PayableReport["summary"];
}

interface ApiFinanceItem {
  kategori: string;
  deskripsi?: string;
  uang_masuk: number;
  uang_keluar: number;
  created_date?: string;
}

interface ApiFinanceSummary {
  saldo_awal: number;
  total_uang_masuk: number;
  total_uang_keluar: number;
  saldo_akhir: number;
}

interface ApiFinanceReportResponse {
  type: FinanceReportType;
  items: ApiFinanceItem[];
  summary: ApiFinanceSummary;
}

const mapStockItem = (item: ApiStockReportItem): StockReportItem => ({
  id: item._id,
  name: item.nama_produk ?? item.name ?? "",
  stock: item.stock_on_hand ?? item.stock ?? 0,
  wholesalePrice: item.harga_grosir ?? item.price_grosir ?? 0,
  retailPrice: item.harga_ecer ?? item.price_ecer ?? 0,
});

const mapDebtItem = (item: ApiDebtItem): Debt => ({
  id: item._id,
  customerId:
    item.kode_customer
    ?? (typeof item.customer === "string" ? item.customer : item.customer?._id ?? ""),
  customerName:
    item.customer_name
    ?? item.nama_customer
    ?? (typeof item.customer === "string"
      ? undefined
      : item.customer?.nama_customer ?? item.customer?.name),
  transactionId:
    item.no_faktur_jual
    ?? (typeof item.transaction === "string"
      ? item.transaction
      : item.transaction?._id ?? ""),
  total: item.total,
  paid: item.dibayar ?? item.paid ?? 0,
  remaining: item.sisa ?? item.remaining ?? 0,
  createdAt: item.created_date ?? item.createdAt ?? "",
});

const mapPayableItem = (item: ApiPayableItem): Payable => ({
  id: item._id,
  customerId:
    item.kode_customer
    ?? (typeof item.customer === "string" ? item.customer : item.customer?._id ?? ""),
  customerName:
    item.customer_name
    ?? item.nama_customer
    ?? (typeof item.customer === "string"
      ? undefined
      : item.customer?.nama_customer ?? item.customer?.name),
  transactionId:
    item.no_faktur_beli
    ?? (typeof item.transaction === "string"
      ? item.transaction
      : item.transaction?._id ?? ""),
  total: item.total,
  paid: item.dibayar ?? item.paid ?? 0,
  remaining: item.sisa ?? item.remaining ?? 0,
  createdAt: item.created_date ?? item.createdAt ?? "",
});

const mapFinanceItem = (item: ApiFinanceItem) => ({
  kategori: item.kategori,
  deskripsi: item.deskripsi ?? "-",
  uangMasuk: item.uang_masuk ?? 0,
  uangKeluar: item.uang_keluar ?? 0,
  createdDate: item.created_date,
});

export const reportsService = {
  stock: (params?: { dateFrom?: string; dateTo?: string }) =>
    apiClient
      .get<ApiEnvelope<ApiStockReportResponse>>("/reports/stock", {
        params: {
          date_from: params?.dateFrom || undefined,
          date_to: params?.dateTo || undefined,
        },
      })
      .then((r) => {
      const payload = unwrapData(r.data);
      return {
        items: payload.items.map(mapStockItem),
        summary: payload.summary,
      } as StockReport;
      }),
  debts: (params?: { dateFrom?: string; dateTo?: string }) =>
    apiClient
      .get<ApiEnvelope<ApiDebtReportResponse>>("/reports/debts", {
        params: {
          date_from: params?.dateFrom || undefined,
          date_to: params?.dateTo || undefined,
        },
      })
      .then((r) => {
        const payload = unwrapData(r.data);
        return {
          items: payload.items.map(mapDebtItem),
          summary: payload.summary,
        } as DebtReport;
      }),
  payables: (params?: { dateFrom?: string; dateTo?: string }) =>
    apiClient
      .get<ApiEnvelope<ApiPayableReportResponse>>("/reports/payables", {
        params: {
          date_from: params?.dateFrom || undefined,
          date_to: params?.dateTo || undefined,
        },
      })
      .then((r) => {
        const payload = unwrapData(r.data);
        return {
          items: payload.items.map(mapPayableItem),
          summary: payload.summary,
        } as PayableReport;
      }),
  finance: (params?: { type?: FinanceReportType; dateFrom?: string; dateTo?: string; search?: string }) =>
    apiClient
      .get<ApiEnvelope<ApiFinanceReportResponse>>("/reports/finance", {
        params: {
          type: params?.type || "rekap",
          date_from: params?.dateFrom || undefined,
          date_to: params?.dateTo || undefined,
          search: params?.search || undefined,
        },
      })
      .then((r) => {
        const payload = unwrapData(r.data);
        return {
          type: payload.type,
          items: payload.items.map(mapFinanceItem),
          summary: {
            saldoAwal: payload.summary.saldo_awal ?? 0,
            totalUangMasuk: payload.summary.total_uang_masuk ?? 0,
            totalUangKeluar: payload.summary.total_uang_keluar ?? 0,
            saldoAkhir: payload.summary.saldo_akhir ?? 0,
          },
        } as FinanceReport;
      }),
};
