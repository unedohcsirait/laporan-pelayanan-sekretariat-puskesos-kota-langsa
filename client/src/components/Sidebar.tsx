import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileText, Database, LogOut, User, UserPen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { EditAccountDialog } from "@/components/EditAccountDialog";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Laporan Harian", icon: FileText, href: "/laporan" },
  { label: "Jenis Layanan", icon: Database, href: "/layanan" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [editAccountOpen, setEditAccountOpen] = useState(false);

  return (
    <>
      <aside className="w-64 hidden md:flex flex-col border-r border-border bg-card/50 backdrop-blur-xl h-screen sticky top-0">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Dinas Sosial Kota Langsa" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="font-display font-bold text-lg leading-tight">MediRekap</h1>
              <p className="text-xs text-muted-foreground">Automation System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 space-y-2">
          {/* User info */}
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium truncate flex-1">{user?.username}</span>
          </div>
          {/* Edit Akun button */}
          <button
            id="btn-edit-account"
            onClick={() => setEditAccountOpen(true)}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <UserPen className="h-4 w-4" />
            Edit Akun
          </button>
          {/* Logout button */}
          <button
            id="btn-logout"
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Edit Account Dialog */}
      <EditAccountDialog
        open={editAccountOpen}
        onOpenChange={setEditAccountOpen}
        currentUsername={user?.username ?? ""}
      />
    </>
  );
}
