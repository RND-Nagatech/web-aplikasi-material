import { apiClient } from "@/lib/api-client";
import { unwrapData, type ApiEnvelope, type PaginatedData } from "@/lib/api-response";
import type { Product, ProductInput } from "@/types";

interface ApiProduct {
  _id: string;
  kode_produk?: string;
  nama_produk?: string;
  stock_on_hand?: number;
  harga_grosir?: number;
  harga_ecer?: number;
  name?: string;
  stock?: number;
  price_grosir?: number;
  price_ecer?: number;
  createdAt?: string;
}

const mapProduct = (item: ApiProduct): Product => ({
  id: item._id,
  kodeProduk: item.kode_produk,
  name: item.nama_produk ?? item.name ?? "",
  stock: item.stock_on_hand ?? item.stock ?? 0,
  wholesalePrice: item.harga_grosir ?? item.price_grosir ?? 0,
  retailPrice: item.harga_ecer ?? item.price_ecer ?? 0,
  createdAt: item.createdAt,
});

const toApiInput = (input: ProductInput) => ({
  nama_produk: input.name.trim().toUpperCase(),
  stock_on_hand: input.stock,
  harga_grosir: input.wholesalePrice,
  harga_ecer: input.retailPrice,
});

export const productsService = {
  list: () =>
    apiClient
      .get<ApiEnvelope<PaginatedData<ApiProduct>>>("/products?limit=100")
      .then((r) => unwrapData(r.data).items.map(mapProduct)),
  create: (input: ProductInput & { restoreExisting?: boolean }) =>
    apiClient
      .post<ApiEnvelope<ApiProduct>>("/products", {
        ...toApiInput(input),
        restore_existing: input.restoreExisting ? true : undefined,
      })
      .then((r) => mapProduct(unwrapData(r.data))),
  update: (id: string, input: ProductInput) =>
    apiClient
      .put<ApiEnvelope<ApiProduct>>(`/products/${id}`, toApiInput(input))
      .then((r) => mapProduct(unwrapData(r.data))),
  remove: (id: string) =>
    apiClient.delete<ApiEnvelope<void>>(`/products/${id}`).then(() => undefined),
};
