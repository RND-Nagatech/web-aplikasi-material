import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import LoginPage from "@/features/auth/LoginPage";
import { AppLayout } from "@/components/layout/AppLayout";
import DashboardPage from "@/features/dashboard/DashboardPage";
import ProductsPage from "@/features/products/ProductsPage";
import CustomersPage from "@/features/customers/CustomersPage";
import TransactionsPage from "@/features/transactions/TransactionsPage";
import DebtsPage from "@/features/debts/DebtsPage";
import PayablesPage from "@/features/payables/PayablesPage";
import StoresPage from "@/features/stores/StoresPage";
import StockReportPage from "@/features/reports/StockReportPage";
import DebtReportPage from "@/features/reports/DebtReportPage";
import PayableReportPage from "@/features/reports/PayableReportPage";
import FinanceReportPage from "@/features/reports/FinanceReportPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/stores" element={<StoresPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/debts" element={<DebtsPage />} />
              <Route path="/payables" element={<PayablesPage />} />
              <Route path="/reports/stock" element={<StockReportPage />} />
              <Route path="/reports/debts" element={<DebtReportPage />} />
              <Route path="/reports/payables" element={<PayableReportPage />} />
              <Route path="/reports/finance" element={<FinanceReportPage />} />
            </Route>
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
