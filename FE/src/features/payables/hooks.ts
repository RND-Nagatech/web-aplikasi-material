import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { payablesService } from "@/services/payables";
import type { PayablePaymentInput } from "@/types";

export const payablesKeys = { all: ["payables"] as const };

export function usePayables() {
  return useQuery({ queryKey: payablesKeys.all, queryFn: payablesService.list });
}

export function useRecordPayablePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PayablePaymentInput) => payablesService.recordPayment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payablesKeys.all });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}
