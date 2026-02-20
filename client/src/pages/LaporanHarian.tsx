import { Layout } from "@/components/Layout";
import { useLaporan, useCreateLaporan, useUpdateLaporan, useDeleteLaporan } from "@/hooks/use-laporan";
import { useJenisLayanan } from "@/hooks/use-layanan";
import { useState, useMemo } from "react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Plus, Search, FileDown, FileSpreadsheet, Pencil, Trash2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLaporanHarianSchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import { z } from "zod";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formSchema = insertLaporanHarianSchema.extend({
  tanggal: z.date(),
  jumlah: z.coerce.number().min(1, "Jumlah minimal 1"),
  jenisLayananId: z.coerce.number().min(1, "Pilih layanan"),
});

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Urutan tampilan: Harian → Mingguan → Bulanan → Tahunan
type ViewMode = "daily" | "weekly" | "monthly" | "yearly";

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

const VIEW_MODE_ORDER: ViewMode[] = ["daily", "weekly", "monthly", "yearly"];

export default function LaporanHarianPage() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Harian: single date
  const [dailyDate, setDailyDate] = useState<Date>(today);
  const [dailyOpen, setDailyOpen] = useState(false);

  // Mingguan: custom date range
  const [weekFrom, setWeekFrom] = useState<Date>(() => {
    // Default: awal minggu ini (Senin)
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  });
  const [weekTo, setWeekTo] = useState<Date>(() => {
    // Default: akhir minggu ini (Minggu)
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + diff);
    return d;
  });
  const [weekFromOpen, setWeekFromOpen] = useState(false);
  const [weekToOpen, setWeekToOpen] = useState(false);

  const isYearly = viewMode === "yearly";
  const isWeekly = viewMode === "weekly";
  const isDaily = viewMode === "daily";
  const isMonthly = viewMode === "monthly";

  // Fetch: yearly = no month filter; daily/weekly = fetch by month of the dates; monthly = fetch by month
  const fetchMonth = isYearly ? undefined : isDaily ? String(dailyDate.getMonth() + 1) : isWeekly ? String(weekFrom.getMonth() + 1) : month;
  const fetchYear = isYearly ? year : isDaily ? String(dailyDate.getFullYear()) : isWeekly ? String(weekFrom.getFullYear()) : year;

  const { data: laporan, isLoading } = useLaporan(
    isYearly ? undefined : fetchMonth,
    fetchYear
  );
  const { data: jenisLayanan } = useJenisLayanan();

  const createMutation = useCreateLaporan();
  const updateMutation = useUpdateLaporan();
  const deleteMutation = useDeleteLaporan();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tanggal: new Date(),
      jumlah: 1,
      keterangan: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      tanggal: format(values.tanggal, "yyyy-MM-dd"),
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingId(null);
          form.reset({ tanggal: new Date(), jumlah: 1, keterangan: "" });
        }
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset({ tanggal: new Date(), jumlah: 1, keterangan: "" });
        }
      });
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    form.reset({
      tanggal: new Date(item.tanggal),
      jumlah: item.jumlah,
      keterangan: item.keterangan || "",
      jenisLayananId: item.jenisLayananId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };

  // Filter data
  const filteredData = useMemo(() => {
    if (!laporan) return [];
    let data = laporan.filter(item =>
      item.jenisLayanan.namaLayanan.toLowerCase().includes(search.toLowerCase())
    );
    if (isDaily) {
      const dayStart = startOfDay(dailyDate);
      const dayEnd = endOfDay(dailyDate);
      data = data.filter(item => {
        const d = parseISO(item.tanggal);
        return isWithinInterval(d, { start: dayStart, end: dayEnd });
      });
    } else if (isWeekly) {
      const rangeStart = startOfDay(weekFrom);
      const rangeEnd = endOfDay(weekTo);
      data = data.filter(item => {
        const d = parseISO(item.tanggal);
        return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
      });
    }
    return data;
  }, [laporan, search, isDaily, isWeekly, dailyDate, weekFrom, weekTo]);

  const getPeriodLabel = () => {
    if (isYearly) return `Tahun ${year}`;
    if (isDaily) return format(dailyDate, "dd MMMM yyyy", { locale: localeId });
    if (isWeekly) return `${format(weekFrom, "dd MMM yyyy", { locale: localeId })} – ${format(weekTo, "dd MMM yyyy", { locale: localeId })}`;
    return `${MONTHS[Number(month) - 1]} ${year}`;
  };

  // ─── Exports ──────────────────────────────────────────────────────────────
  const getAppSettings = async () => {
    let appTitle = "LAPORAN PELAYANAN SEKRETARIAT PUSKESOS KOTA LANGSA";
    let appSubtitle = "DI KANTOR DINAS SOSIAL KOTA LANGSA";
    try {
      const tRes = await fetch("/api/settings/app_title").then(r => r.json());
      const sRes = await fetch("/api/settings/app_subtitle").then(r => r.json());
      if (tRes.value) appTitle = tRes.value;
      if (sRes.value) appSubtitle = sRes.value;
    } catch {}
    return { appTitle, appSubtitle };
  };

  const getExportFilename = (ext: string) => {
    if (isYearly) return `laporan-tahunan-${year}.${ext}`;
    if (isDaily) return `laporan-harian-${format(dailyDate, "yyyy-MM-dd")}.${ext}`;
    if (isWeekly) return `laporan-mingguan-${format(weekFrom, "yyyy-MM-dd")}-sd-${format(weekTo, "yyyy-MM-dd")}.${ext}`;
    return `laporan-bulanan-${year}-${month}.${ext}`;
  };

  const exportPDF = async () => {
    if (!filteredData.length) return;
    const { appTitle, appSubtitle } = await getAppSettings();
    const doc = new jsPDF();
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text(appTitle, 105, 15, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(appSubtitle, 105, 22, { align: "center" });
    doc.setLineWidth(0.5); doc.line(20, 25, 190, 25);
    doc.setFontSize(10);
    doc.text(`Periode: ${getPeriodLabel()}`, 14, 35);
    autoTable(doc, {
      head: [['NO', 'JENIS LAYANAN', 'TANGGAL', 'JUMLAH', 'KETERANGAN']],
      body: filteredData.map((row, i) => [
        i + 1,
        row.jenisLayanan.namaLayanan,
        format(parseISO(row.tanggal), "dd MMM yyyy", { locale: localeId }),
        `${row.jumlah} orang`,
        row.keterangan || "-"
      ]),
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [14, 165, 233] }
    });
    doc.save(getExportFilename("pdf"));
  };

  const exportExcel = async () => {
    if (!filteredData.length) return;
    const { appTitle, appSubtitle } = await getAppSettings();
    const data = filteredData.map((row, i) => ({
      'NO': i + 1,
      'JENIS LAYANAN': row.jenisLayanan.namaLayanan,
      'TANGGAL': format(parseISO(row.tanggal), "dd MMM yyyy", { locale: localeId }),
      'JUMLAH': `${row.jumlah} orang`,
      'KETERANGAN': row.keterangan || "-"
    }));
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(worksheet, [
      [appTitle], [appSubtitle], [],
      [`Periode: ${getPeriodLabel()}`], []
    ], { origin: "A1" });
    XLSX.utils.sheet_add_json(worksheet, data, { origin: "A6" });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    XLSX.writeFile(workbook, getExportFilename("xlsx"));
  };

  const activeServices = jenisLayanan?.filter(l => l.status) || [];

  // Generate year options (5 years around current)
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  return (
    <Layout>
      <div className="space-y-6">

        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Laporan Harian</h1>
            <p className="text-muted-foreground">Input dan monitoring data pelayanan harian.</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <FileDown className="mr-1.5 h-4 w-4 text-red-500" />PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4 text-green-600" />Excel
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingId(null);
                form.reset({ tanggal: new Date(), jumlah: 1, keterangan: "" });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/25">
                  <Plus className="mr-2 h-4 w-4" />Input Data
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader className="pb-2 border-b border-border">
                  <DialogTitle className="text-lg font-semibold">
                    {editingId ? "✏️ Edit Laporan" : "➕ Input Laporan Baru"}
                  </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="pt-4 space-y-5">

                    {/* Tanggal */}
                    <FormField
                      control={form.control}
                      name="tanggal"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="font-semibold text-foreground">Tanggal</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-10 bg-white border-border",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                                  {field.value
                                    ? format(field.value, "dd MMMM yyyy", { locale: localeId })
                                    : "Pilih tanggal"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0 z-[300] bg-white border border-border shadow-xl rounded-xl"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Jenis Layanan */}
                    <FormField
                      control={form.control}
                      name="jenisLayananId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Jenis Layanan</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ? String(field.value) : undefined}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full h-10 bg-white border-border">
                                <SelectValue placeholder="Pilih jenis layanan…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="z-[300] bg-white border border-border shadow-xl max-h-60 overflow-y-auto">
                              {activeServices.map((service) => (
                                <SelectItem key={service.id} value={String(service.id)}>
                                  {service.namaLayanan}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Jumlah */}
                    <FormField
                      control={form.control}
                      name="jumlah"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Jumlah Pasien</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              placeholder="Masukkan jumlah pasien"
                              className="h-10 bg-white border-border"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Keterangan */}
                    <FormField
                      control={form.control}
                      name="keterangan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">
                            Keterangan <span className="text-muted-foreground font-normal">(Opsional)</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tambahkan catatan tambahan jika perlu…"
                              className="resize-none bg-white border-border min-h-[80px]"
                              name={field.name}
                              ref={field.ref}
                              onBlur={field.onBlur}
                              onChange={field.onChange}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {createMutation.isPending || updateMutation.isPending ? "Menyimpan…" : "Simpan Data"}
                      </Button>
                    </div>

                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ─── View Mode Toggle + Filters ──────────────────────── */}
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col gap-3">

          {/* Toggle: Harian → Mingguan → Bulanan → Tahunan */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Tampilan:</span>
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1 gap-1">
              {VIEW_MODE_ORDER.map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                >
                  {VIEW_MODE_LABELS[mode]}
                </Button>
              ))}
            </div>
          </div>

          {/* Filter inputs */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center flex-wrap">
            {/* Search */}
            <div className="relative flex-1 w-full min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari jenis layanan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-border h-10"
              />
            </div>

            {/* HARIAN: single date picker */}
            {isDaily && (
              <Popover open={dailyOpen} onOpenChange={setDailyOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 bg-white border-border justify-start gap-2 min-w-[180px]">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    {format(dailyDate, "dd MMMM yyyy", { locale: localeId })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[200] bg-white border border-border shadow-xl rounded-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={dailyDate}
                    onSelect={(d) => { if (d) { setDailyDate(d); setDailyOpen(false); } }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* MINGGUAN: date range from–to */}
            {isWeekly && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Dari:</span>
                <Popover open={weekFromOpen} onOpenChange={setWeekFromOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 bg-white border-border justify-start gap-2 min-w-[150px]">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {format(weekFrom, "dd MMM yyyy", { locale: localeId })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200] bg-white border border-border shadow-xl rounded-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={weekFrom}
                      onSelect={(d) => { if (d) { setWeekFrom(d); setWeekFromOpen(false); } }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-sm text-muted-foreground whitespace-nowrap">s/d:</span>
                <Popover open={weekToOpen} onOpenChange={setWeekToOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 bg-white border-border justify-start gap-2 min-w-[150px]">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {format(weekTo, "dd MMM yyyy", { locale: localeId })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200] bg-white border border-border shadow-xl rounded-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={weekTo}
                      onSelect={(d) => { if (d) { setWeekTo(d); setWeekToOpen(false); } }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* BULANAN: month + year selector */}
            {isMonthly && (
              <>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger className="w-full md:w-[150px] bg-white border-border h-10">
                    <SelectValue placeholder="Bulan" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border shadow-xl">
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-full md:w-[110px] bg-white border-border h-10">
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-border shadow-xl">
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {/* TAHUNAN: year selector only */}
            {isYearly && (
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-full md:w-[110px] bg-white border-border h-10">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-border shadow-xl">
                  {yearOptions.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Info line */}
          <p className="text-xs text-muted-foreground">
            Menampilkan data: <span className="font-medium text-foreground">{getPeriodLabel()}</span>
            {" "}— {filteredData?.length ?? 0} entri ditemukan
          </p>
        </div>

        {/* ─── Data Table ──────────────────────────────────────── */}
        <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jenis Layanan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="w-[100px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filteredData?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Tidak ada data ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData?.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {format(parseISO(item.tanggal), "dd MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {item.jenisLayanan.namaLayanan}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold">{item.jumlah}</TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                      {item.keterangan || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── Delete Confirm ──────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data laporan akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
