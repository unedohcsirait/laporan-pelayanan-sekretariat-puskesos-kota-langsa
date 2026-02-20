import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileText, Database, Settings, Activity } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Laporan Harian", icon: FileText, href: "/laporan" },
  { label: "Jenis Layanan", icon: Database, href: "/layanan" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 hidden md:flex flex-col border-r border-border bg-card/50 backdrop-blur-xl h-screen sticky top-0">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Activity className="h-6 w-6 text-primary" />
          </div>
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

      <div className="p-4 border-t border-border/50">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4">
          <p className="text-xs font-medium text-primary mb-1">Butuh Bantuan?</p>
          <p className="text-[10px] text-muted-foreground mb-3">Hubungi tim IT support untuk kendala sistem.</p>
          <button className="text-xs font-semibold text-primary hover:underline">
            Contact Support
          </button>
        </div>
      </div>
    </aside>
  );
}
