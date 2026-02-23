import { Layout } from "@/components/Layout";
import { StatCard } from "@/components/StatCard";
import { useLaporanSummary } from "@/hooks/use-laporan";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { format, parseISO } from "date-fns";
import { Activity, Calendar, Trophy, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const COLORS = ['#0ea5e9', '#0f766e', '#1e293b', '#eab308', '#f97316'];

export default function Dashboard() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));
  const [isYearly, setIsYearly] = useState(false);
  const [appTitle, setAppTitle] = useState("LAPORAN PELAYANAN SEKRETARIAT PUSKESOS KOTA LANGSA");
  const [appSubtitle, setAppSubtitle] = useState("DI KANTOR DINAS SOSIAL KOTA LANGSA");
  
  const { data: summary, isLoading } = useLaporanSummary(isYearly ? undefined : month, year);

  useEffect(() => {
    fetch("/api/settings/app_title").then(res => res.json()).then(data => {
      if (data.value) setAppTitle(data.value);
    });
    fetch("/api/settings/app_subtitle").then(res => res.json()).then(data => {
      if (data.value) setAppSubtitle(data.value);
    });
  }, []);

  const formattedChartData = isYearly 
    ? (summary?.totalPerBulan ?? []).map(item => ({
        name: MONTHS[item.bulan - 1],
        value: item.total
      }))
    : (summary?.totalPerHari ?? []).map(item => ({
        name: format(parseISO(item.tanggal), "dd MMM"),
        value: item.total
      }));

  const pieChartData = (summary?.rankingLayanan ?? []).map(item => ({
    name: item.namaLayanan,
    value: item.total
  }));

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold text-primary leading-tight uppercase">{appTitle}</h1>
              <p className="text-sm md:text-base text-muted-foreground font-medium uppercase">{appSubtitle}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            {/* Bulanan / Tahunan toggle */}
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1 gap-1">
              <Button
                variant={!isYearly ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsYearly(false)}
              >
                Bulanan
              </Button>
              <Button
                variant={isYearly ? "default" : "ghost"}
                size="sm"
                onClick={() => setIsYearly(true)}
              >
                Tahunan
              </Button>
            </div>

            {/* Period Picker */}
            <div className="flex gap-2 bg-white border border-border p-1 rounded-lg shadow-sm">
              {!isYearly && (
                <>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0">
                      <SelectValue placeholder="Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="w-px bg-border my-2" />
                </>
              )}
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[100px] border-none shadow-none focus:ring-0">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </>
          ) : (
            <>
              <StatCard
                title={isYearly ? "Total Pelayanan Tahun Ini" : "Total Pelayanan Bulan Ini"}
                value={summary?.totalKeseluruhan || 0}
                description={`Total Pengunjung ${isYearly ? `Tahun ${year}` : `${MONTHS[Number(month)-1]} ${year}`}`}
                icon={Activity}
              />
              <StatCard
                title="Rata-rata Harian"
                value={Math.round(summary?.rataRataPerHari || 0)}
                description="Pengunjung per hari operasional"
                icon={Calendar}
              />
              <StatCard
                title="Layanan Terpopuler"
                value={summary?.rankingLayanan[0]?.namaLayanan || "-"}
                description={`${summary?.rankingLayanan[0]?.total || 0} Pengunjung`}
                icon={Trophy}
              />
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold font-display text-primary">
                {isYearly ? "Tren Bulanan" : "Tren Harian"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isYearly
                  ? `Jumlah pelayanan per bulan tahun ${year}`
                  : `Jumlah pelayanan per hari bulan ${MONTHS[Number(month)-1]}`}
              </p>
            </div>
            <div className="h-[300px] w-full">
              {isLoading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : formattedChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name" axisLine={false} tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} dy={10}
                    />
                    <YAxis
                      axisLine={false} tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Belum ada data untuk periode ini
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold font-display text-primary">Komposisi Layanan</h3>
              <p className="text-sm text-muted-foreground">Proporsi total pengunjung per jenis layanan</p>
            </div>
            <div className="h-[300px] w-full">
              {isLoading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData} cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Belum ada data untuk periode ini
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
