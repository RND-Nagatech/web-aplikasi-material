import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-10 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message ?? "Terjadi kesalahan"}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="40" y="80" width="120" height="80" fill="#E5E7EB" rx="4" />
          <rect x="60" y="100" width="80" height="40" fill="#9CA3AF" rx="2" />
          <circle cx="100" cy="60" r="20" fill="#D1D5DB" />
          <rect x="90" y="50" width="4" height="20" fill="#6B7280" />
          <rect x="106" y="50" width="4" height="20" fill="#6B7280" />
          <path d="M85 75 Q100 85 115 75" stroke="#6B7280" strokeWidth="3" fill="none" />
        </svg>
      </div>
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
