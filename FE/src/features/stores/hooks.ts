import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storesService } from "@/services/stores";
import type { StoreInput } from "@/types";

export const storesKeys = { all: ["stores"] as const };

export function useStores() {
  return useQuery({ queryKey: storesKeys.all, queryFn: storesService.list });
}

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StoreInput) => storesService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: storesKeys.all }),
  });
}

export function useUpdateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StoreInput }) => storesService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: storesKeys.all }),
  });
}
