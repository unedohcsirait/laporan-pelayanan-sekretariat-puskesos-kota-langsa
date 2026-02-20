import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Activity, LayoutDashboard, FileText, Database } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Laporan Harian", icon: FileText, href: "/laporan" },
  { label: "Jenis Layanan", icon: Database, href: "/layanan" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="md:hidden border-b border-border bg-background/80 backdrop-blur-md p-4 sticky top-0 z-50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 p-1.5 rounded-md">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <span className="font-display font-bold text-lg">MediRekap</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger>
          <Menu className="h-6 w-6 text-muted-foreground" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
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
          <nav className="p-4 space-y-1">
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
        </SheetContent>
      </Sheet>
    </div>
  );
}
