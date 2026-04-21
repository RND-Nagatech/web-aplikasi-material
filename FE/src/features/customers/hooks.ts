import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customersService } from "@/services/customers";
import type { CustomerInput } from "@/types";

export const customersKeys = { all: ["customers"] as const };

export function useCustomers() {
  return useQuery({ queryKey: customersKeys.all, queryFn: customersService.list });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) => customersService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: customersKeys.all }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerInput }) => customersService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: customersKeys.all }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: customersKeys.all }),
  });
}
