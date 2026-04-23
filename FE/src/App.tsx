import { lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const ProductsPage = lazy(() => import("@/features/products/ProductsPage"));
const CustomersPage = lazy(() => import("@/features/customers/CustomersPage"));
const StoresPage = lazy(() => import("@/features/stores/StoresPage"));
const TransactionsPage = lazy(() => import("@/features/transactions/TransactionsPage"));
const DebtsPage = lazy(() => import("@/features/debts/DebtsPage"));
const PayablesPage = lazy(() => import("@/features/payables/PayablesPage"));
const StockReportPage = lazy(() => import("@/features/reports/StockReportPage"));
const DebtReportPage = lazy(() => import("@/features/reports/DebtReportPage"));
const PayableReportPage = lazy(() => import("@/features/reports/PayableReportPage"));
const FinanceReportPage = lazy(() => import("@/features/reports/FinanceReportPage"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 30 * 60_000,
    },
  },
});

const RouteFallback = () => (
  <div className="rounded border border-border bg-card p-4 text-sm text-muted-foreground">
    Memuat halaman...
  </div>
);

const withRouteSuspense = (node: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>
    {node}
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={withRouteSuspense(<LoginPage />)} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={withRouteSuspense(<DashboardPage />)} />
              <Route path="/products" element={withRouteSuspense(<ProductsPage />)} />
              <Route path="/customers" element={withRouteSuspense(<CustomersPage />)} />
              <Route path="/stores" element={withRouteSuspense(<StoresPage />)} />
              <Route path="/transactions" element={withRouteSuspense(<TransactionsPage />)} />
              <Route path="/debts" element={withRouteSuspense(<DebtsPage />)} />
              <Route path="/payables" element={withRouteSuspense(<PayablesPage />)} />
              <Route path="/reports/stock" element={withRouteSuspense(<StockReportPage />)} />
              <Route path="/reports/debts" element={withRouteSuspense(<DebtReportPage />)} />
              <Route path="/reports/payables" element={withRouteSuspense(<PayableReportPage />)} />
              <Route path="/reports/finance" element={withRouteSuspense(<FinanceReportPage />)} />
            </Route>
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="*" element={withRouteSuspense(<NotFound />)} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
