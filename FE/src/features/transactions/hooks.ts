import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transactionsService } from "@/services/transactions";
import type { TransactionInput } from "@/types";

export const txKeys = { all: ["transactions"] as const };

export function useTransactions() {
  return useQuery({ queryKey: txKeys.all, queryFn: transactionsService.list });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) => transactionsService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: txKeys.all });
      qc.invalidateQueries({ queryKey: ["debts"] });
      qc.invalidateQueries({ queryKey: ["payables"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}
