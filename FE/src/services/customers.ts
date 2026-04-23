import { apiClient } from "@/lib/api-client";
import { unwrapData, type ApiEnvelope, type PaginatedData } from "@/lib/api-response";
import type { Customer, CustomerInput } from "@/types";

interface ApiCustomer {
  _id: string;
  kode_customer?: string;
  nama_customer: string;
  no_hp?: string;
  alamat?: string;
  is_active?: boolean;
  created_date?: string;
  edited_by?: string;
  edited_date?: string;
  deleted_by?: string;
  deleted_date?: string;
  createdAt?: string;
}

const mapCustomer = (item: ApiCustomer): Customer => ({
  id: item._id,
  kodeCustomer: item.kode_customer,
  nama_customer: item.nama_customer,
  no_hp: item.no_hp || "",
  alamat: item.alamat || "",
  createdAt: item.created_date ?? item.createdAt,
});

const toApiInput = (input: CustomerInput): CustomerInput => ({
  ...input,
  nama_customer: input.nama_customer.trim().toUpperCase(),
  no_hp: input.no_hp?.trim() ?? "",
  alamat: input.alamat?.trim().toUpperCase() ?? "",
});

export const customersService = {
  list: () =>
    apiClient
      .get<ApiEnvelope<PaginatedData<ApiCustomer>>>("/customers?limit=100")
      .then((r) => unwrapData(r.data).items.map(mapCustomer)),
  create: (input: CustomerInput) =>
    apiClient
      .post<ApiEnvelope<ApiCustomer>>("/customers", toApiInput(input))
      .then((r) => mapCustomer(unwrapData(r.data))),
  update: (id: string, input: CustomerInput) =>
    apiClient
      .put<ApiEnvelope<ApiCustomer>>(`/customers/${id}`, toApiInput(input))
      .then((r) => mapCustomer(unwrapData(r.data))),
  remove: (id: string) => apiClient.delete(`/customers/${id}`).then((r) => unwrapData(r.data)),
  searchPaged: (params: {
    page?: number;
    limit?: number;
    nama_customer?: string;
    no_hp?: string;
    alamat?: string;
    search?: string;
  }) =>
    apiClient
      .get<ApiEnvelope<PaginatedData<ApiCustomer>>>("/customers", {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 10,
          nama_customer: params.nama_customer || undefined,
          no_hp: params.no_hp || undefined,
          alamat: params.alamat || undefined,
          search: params.search || undefined,
        },
      })
      .then((r) => {
        const payload = unwrapData(r.data);
        return {
          ...payload,
          items: payload.items.map(mapCustomer),
        };
      }),
};
