import { apiClient } from "@/lib/api-client";
import { unwrapData, type ApiEnvelope, type PaginatedData } from "@/lib/api-response";
import type { Store, StoreInput } from "@/types";

interface ApiStore {
  _id: string;
  kode_toko: string;
  nama_toko: string;
  no_hp: string;
  alamat: string;
  created_date?: string;
  edited_by?: string;
  edited_date?: string;
  createdAt?: string;
}

const mapStore = (item: ApiStore): Store => ({
  id: item._id,
  kode_toko: item.kode_toko,
  nama_toko: item.nama_toko,
  no_hp: item.no_hp,
  alamat: item.alamat,
  createdAt: item.created_date ?? item.createdAt ?? "",
  edited_by: item.edited_by ?? "-",
  edited_date: item.edited_date ?? "-",
});

export const storesService = {
  list: () =>
    apiClient
      .get<ApiEnvelope<PaginatedData<ApiStore>>>("/stores?limit=100")
      .then((r) => unwrapData(r.data).items.map(mapStore)),
  create: (input: StoreInput) =>
    apiClient
      .post<ApiEnvelope<ApiStore>>("/stores", input)
      .then((r) => mapStore(unwrapData(r.data))),
  update: (id: string, input: StoreInput) =>
    apiClient
      .put<ApiEnvelope<ApiStore>>(`/stores/${id}`, input)
      .then((r) => mapStore(unwrapData(r.data))),
};
