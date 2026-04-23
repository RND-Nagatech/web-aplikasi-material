import { apiClient } from "@/lib/api-client";
import { unwrapData, type ApiEnvelope, type PaginatedData } from "@/lib/api-response";
import type { Debt, DebtPaymentInput } from "@/types";

interface ApiDebt {
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
  kembalian?: number;
  sisa?: number;
  remaining?: number;
  createdAt?: string;
  created_date?: string;
}

const mapDebt = (item: ApiDebt): Debt => ({
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
  change: item.kembalian ?? 0,
  remaining: item.sisa ?? item.remaining ?? 0,
  createdAt: item.created_date ?? item.createdAt ?? "",
});

export const debtsService = {
  list: () =>
    apiClient
      .get<ApiEnvelope<PaginatedData<ApiDebt>>>("/debts?limit=100")
      .then((r) => unwrapData(r.data).items.map(mapDebt)),
  recordPayment: (input: DebtPaymentInput) =>
    apiClient
      .post<ApiEnvelope<ApiDebt>>("/debts/payment", {
        debt_id: input.debtId,
        amount: input.amount,
      })
      .then((r) => mapDebt(unwrapData(r.data))),
};
