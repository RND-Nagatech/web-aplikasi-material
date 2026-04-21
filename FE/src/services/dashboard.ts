import { apiClient } from "@/lib/api-client";
import { unwrapData, type ApiEnvelope } from "@/lib/api-response";
import type { DashboardSummary } from "@/types";

type ApiDashboardSummary = {
  totalProducts: number;
  totalTransactions: number;
  totalOutstandingDebts: number;
  totalOutstandingPayables: number;
  trend?: {
    period_days?: 7 | 30;
    items?: Array<{
      date: string;
      label: string;
      penjualan: number;
      pembelian: number;
    }>;
  };
  due?: {
    piutang?: Array<{
      id: string;
      no_faktur: string;
      tanggal_transaksi: string;
      tanggal_jatuh_tempo: string;
      nama_customer: string;
      no_hp: string;
      alamat: string;
      total: number;
      dibayar: number;
      sisa: number;
    }>;
    hutang?: Array<{
      id: string;
      no_faktur: string;
      tanggal_transaksi: string;
      tanggal_jatuh_tempo: string;
      nama_customer: string;
      no_hp: string;
      alamat: string;
      total: number;
      dibayar: number;
      sisa: number;
    }>;
  };
};

const mapSummary = (payload: ApiDashboardSummary): DashboardSummary => ({
  totalProducts: payload.totalProducts ?? 0,
  totalTransactions: payload.totalTransactions ?? 0,
  totalOutstandingDebts: payload.totalOutstandingDebts ?? 0,
  totalOutstandingPayables: payload.totalOutstandingPayables ?? 0,
  trend: {
    periodDays: payload.trend?.period_days === 30 ? 30 : 7,
    items: (payload.trend?.items ?? []).map((item) => ({
      date: item.date,
      label: item.label,
      penjualan: item.penjualan ?? 0,
      pembelian: item.pembelian ?? 0,
    })),
  },
  due: {
    piutang: (payload.due?.piutang ?? []).map((item) => ({
      id: item.id,
      noFaktur: item.no_faktur,
      tanggalTransaksi: item.tanggal_transaksi,
      tanggalJatuhTempo: item.tanggal_jatuh_tempo,
      namaCustomer: item.nama_customer,
      noHp: item.no_hp,
      alamat: item.alamat,
      total: item.total ?? 0,
      dibayar: item.dibayar ?? 0,
      sisa: item.sisa ?? 0,
    })),
    hutang: (payload.due?.hutang ?? []).map((item) => ({
      id: item.id,
      noFaktur: item.no_faktur,
      tanggalTransaksi: item.tanggal_transaksi,
      tanggalJatuhTempo: item.tanggal_jatuh_tempo,
      namaCustomer: item.nama_customer,
      noHp: item.no_hp,
      alamat: item.alamat,
      total: item.total ?? 0,
      dibayar: item.dibayar ?? 0,
      sisa: item.sisa ?? 0,
    })),
  },
});

export const dashboardService = {
  summary: (period: 7 | 30 = 7) =>
    apiClient
      .get<ApiEnvelope<ApiDashboardSummary>>("/dashboard/summary", {
        params: { period },
      })
      .then((r) => mapSummary(unwrapData(r.data))),
};
