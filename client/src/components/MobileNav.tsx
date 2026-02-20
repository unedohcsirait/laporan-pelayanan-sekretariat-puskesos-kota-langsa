import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LayoutDashboard, FileText, Database, LogOut, User, UserPen } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { EditAccountDialog } from "@/components/EditAccountDialog";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Laporan Harian", icon: FileText, href: "/laporan" },
  { label: "Jenis Layanan", icon: Database, href: "/layanan" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <>
      <div className="md:hidden border-b border-border bg-background/80 backdrop-blur-md p-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Dinas Sosial Kota Langsa" className="h-8 w-8 object-contain" />
          <span className="font-display font-bold text-lg">MediRekap</span>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <Menu className="h-6 w-6 text-muted-foreground" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Dinas Sosial Kota Langsa" className="h-10 w-10 object-contain" />
                <div>
                  <h1 className="font-display font-bold text-lg leading-tight">MediRekap</h1>
                  <p className="text-xs text-muted-foreground">Automation System</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-border/50 space-y-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium truncate">{user?.username}</span>
              </div>
              <button
                onClick={() => { setOpen(false); setEditAccountOpen(true); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <UserPen className="h-4 w-4" />
                Edit Akun
              </button>
              <button
                onClick={() => { logout(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Edit Account Dialog */}
      <EditAccountDialog
        open={editAccountOpen}
        onOpenChange={setEditAccountOpen}
        currentUsername={user?.username ?? ""}
      />
    </>
  );
}
