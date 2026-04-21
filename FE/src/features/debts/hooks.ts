import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { debtsService } from "@/services/debts";
import type { DebtPaymentInput } from "@/types";

export const debtsKeys = { all: ["debts"] as const };

export function useDebts() {
  return useQuery({ queryKey: debtsKeys.all, queryFn: debtsService.list });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DebtPaymentInput) => debtsService.recordPayment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: debtsKeys.all });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}
