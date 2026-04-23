import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: TablePaginationProps) {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with sliding window
  const getPageNumbers = () => {
    const maxVisible = 5;
    const pages: number[] = [];

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Sliding window logic
      let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let end = start + maxVisible - 1;

      if (end > totalPages) {
        end = totalPages;
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground sm:text-sm">
        Menampilkan {from}-{to} dari {totalItems} data
      </p>

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <span>Per halaman</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const next = Number(value);
                if (Number.isFinite(next) && next > 0) onPageSizeChange(next);
              }}
            >
              <SelectTrigger className="h-8 w-[76px] rounded-md px-2 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" align="start" sideOffset={4} className="z-[70] min-w-[76px]">
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          </label>
        )}

        <div className="flex items-center gap-1">
          {/* First page button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className="disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &lt;&lt;
          </Button>

          {/* Previous page button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &lt;
          </Button>

          {/* Page numbers */}
          {pageNumbers.map((pageNum) => (
            <Button
              key={pageNum}
              type="button"
              variant={pageNum === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className="min-w-9"
            >
              {pageNum}
            </Button>
          ))}

          {/* Next page button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &gt;
          </Button>

          {/* Last page button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &gt;&gt;
          </Button>
        </div>
      </div>
    </div>
  );
}
