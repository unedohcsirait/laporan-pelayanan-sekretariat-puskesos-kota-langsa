import { Layout } from "@/components/Layout";
import { useLaporan, useCreateLaporan, useUpdateLaporan, useDeleteLaporan } from "@/hooks/use-laporan";
import { useJenisLayanan } from "@/hooks/use-layanan";
import { useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Plus, Search, FileDown, FileSpreadsheet, Pencil, Trash2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  tanggal: z.date(), // Override string date to Date object for picker
  jumlah: z.coerce.number().min(1, "Jumlah minimal 1"),
  jenisLayananId: z.coerce.number().min(1, "Pilih layanan"),
});

export default function LaporanHarianPage() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = useState(String(currentMonth));
  const [year, setYear] = useState(String(currentYear));
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: laporan, isLoading } = useLaporan(month, year);
  const { data: jenisLayanan } = useJenisLayanan();
  
  const createMutation = useCreateLaporan();
  const updateMutation = useUpdateLaporan();
  const deleteMutation = useDeleteLaporan();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tanggal: new Date(),
      jumlah: 0,
      keterangan: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Format date back to YYYY-MM-DD string
    const payload = {
      ...values,
      tanggal: format(values.tanggal, "yyyy-MM-dd"),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setEditingId(null);
          form.reset();
        }
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
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

  const filteredData = laporan?.filter(item => 
    item.jenisLayanan.namaLayanan.toLowerCase().includes(search.toLowerCase())
  );

  const exportPDF = async () => {
    if (!filteredData) return;
    
    let appTitle = "LAPORAN PELAYANAN SEKRETARIAT PUSKESOS KOTA LANGSA";
    let appSubtitle = "DI KANTOR DINAS SOSIAL KOTA LANGSA";
    
    try {
      const tRes = await fetch("/api/settings/app_title").then(res => res.json());
      const sRes = await fetch("/api/settings/app_subtitle").then(res => res.json());
      if (tRes.value) appTitle = tRes.value;
      if (sRes.value) appSubtitle = sRes.value;
    } catch (e) {}

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(appTitle, 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(appSubtitle, 105, 22, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);
    
    doc.setFontSize(10);
    doc.text(`Periode: ${format(new Date(Number(year), Number(month)-1, 1), "MMMM yyyy", { locale: localeId })}`, 14, 35);
    
    autoTable(doc, {
      head: [['NO', 'JENIS LAYANAN', 'TANGGAL', 'JUMLAH', 'KETERANGAN']],
      body: filteredData.map((row, index) => [
        index + 1,
        row.jenisLayanan.namaLayanan,
        format(new Date(row.tanggal), "dd MMM yyyy", { locale: localeId }),
        `${row.jumlah} orang`,
        row.keterangan || "-"
      ]),
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillStyle: 'DF', fillColor: [14, 165, 233] }
    });
    
    doc.save(`laporan-puskesos-${month}-${year}.pdf`);
  };

  const exportExcel = async () => {
    if (!filteredData) return;
    
    let appTitle = "LAPORAN PELAYANAN SEKRETARIAT PUSKESOS KOTA LANGSA";
    let appSubtitle = "DI KANTOR DINAS SOSIAL KOTA LANGSA";
    
    try {
      const tRes = await fetch("/api/settings/app_title").then(res => res.json());
      const sRes = await fetch("/api/settings/app_subtitle").then(res => res.json());
      if (tRes.value) appTitle = tRes.value;
      if (sRes.value) appSubtitle = sRes.value;
    } catch (e) {}

    const data = filteredData.map((row, index) => ({
      'NO': index + 1,
      'JENIS LAYANAN': row.jenisLayanan.namaLayanan,
      'TANGGAL': format(new Date(row.tanggal), "dd MMM yyyy", { locale: localeId }),
      'JUMLAH': `${row.jumlah} orang`,
      'KETERANGAN': row.keterangan || "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet([]);
    
    // Add custom headers like PDF
    XLSX.utils.sheet_add_aoa(worksheet, [
      [appTitle],
      [appSubtitle],
      [],
      [`Periode: ${format(new Date(Number(year), Number(month)-1, 1), "MMMM yyyy", { locale: localeId })}`],
      []
    ], { origin: "A1" });

    // Add table starting after header
    XLSX.utils.sheet_add_json(worksheet, data, { origin: "A6", skipHeader: false });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    XLSX.writeFile(workbook, `laporan-puskesos-${month}-${year}.xlsx`);
  };

  const activeServices = jenisLayanan?.filter(l => l.status) || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Laporan Harian</h1>
            <p className="text-muted-foreground">Input dan monitoring data pelayanan harian.</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <FileDown className="mr-2 h-4 w-4 text-red-500" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
              Excel
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingId(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/25">
                  <Plus className="mr-2 h-4 w-4" />
                  Input Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Laporan" : "Input Laporan Baru"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="tanggal"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Tanggal</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: localeId })
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
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
                    
                    <FormField
                      control={form.control}
                      name="jenisLayananId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jenis Layanan</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value ? String(field.value) : undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih layanan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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

                    <FormField
                      control={form.control}
                      name="jumlah"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jumlah Pasien</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="keterangan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Keterangan (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : "Simpan Data"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari jenis layanan..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/50"
            />
          </div>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-full md:w-[150px] bg-white/50">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {format(new Date(2024, i, 1), "MMMM", { locale: localeId })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-full md:w-[120px] bg-white/50">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Table */}
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
                      {format(new Date(item.tanggal), "dd MMM yyyy", { locale: localeId })}
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
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data laporan ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
