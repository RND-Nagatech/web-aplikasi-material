import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsService } from "@/services/products";
import type { ProductInput } from "@/types";

export const productsKeys = {
  all: ["products"] as const,
};

export function useProducts() {
  return useQuery({ queryKey: productsKeys.all, queryFn: productsService.list });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput & { restoreExisting?: boolean }) => productsService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKeys.all }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) =>
      productsService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKeys.all }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: productsKeys.all }),
  });
}
