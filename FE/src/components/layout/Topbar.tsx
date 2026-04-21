import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthProvider";
import { useNavigate } from "react-router-dom";

type TopbarProps = {
  onOpenMobileSidebar?: () => void;
};

export function Topbar({ onOpenMobileSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </div>
    </header>
  );
}
