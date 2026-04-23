import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TopbarProps = {
  onOpenMobileSidebar?: () => void;
};

export function Topbar({ onOpenMobileSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const systemDateLabel = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="text-sm text-muted-foreground">
        Selamat datang, <span className="font-medium text-foreground">{user?.name ?? "Admin"}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:block">
          Tanggal Sistem : <span className="font-medium text-foreground">{systemDateLabel}</span>
        </div>
        <div className="shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:hidden">
          <span className="font-medium text-foreground">{systemDateLabel}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Keluar"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keluar</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
