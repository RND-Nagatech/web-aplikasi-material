import { apiClient } from "@/lib/api-client";
import { unwrapData, type ApiEnvelope, type PaginatedData } from "@/lib/api-response";
import type { Payable, PayablePaymentInput } from "@/types";

interface ApiPayable {
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

const mapPayable = (item: ApiPayable): Payable => ({
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

export const payablesService = {
  list: () =>
    apiClient
      .get<ApiEnvelope<PaginatedData<ApiPayable>>>("/payables?limit=100")
      .then((r) => unwrapData(r.data).items.map(mapPayable)),
  recordPayment: (input: PayablePaymentInput) =>
    apiClient
      .post<ApiEnvelope<ApiPayable>>("/payables/payment", {
        payable_id: input.payableId,
        amount: input.amount,
      })
      .then((r) => mapPayable(unwrapData(r.data))),
};
