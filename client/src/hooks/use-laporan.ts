import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertLaporanHarian } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function useLaporan(month?: string, year?: string) {
  return useQuery({
    queryKey: [api.laporanHarian.list.path, month, year],
    queryFn: async () => {
      const url = new URL(api.laporanHarian.list.path, window.location.origin);
      if (month) url.searchParams.append("month", month);
      if (year) url.searchParams.append("year", year);
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch reports");
      return api.laporanHarian.list.responses[200].parse(await res.json());
    },
  });
}

export function useLaporanSummary(month?: string, year?: string) {
  return useQuery({
    queryKey: [api.laporanHarian.summary.path, month, year],
    queryFn: async () => {
      const url = new URL(api.laporanHarian.summary.path, window.location.origin);
      if (month) url.searchParams.append("month", month);
      if (year) url.searchParams.append("year", year);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch summary");
      return api.laporanHarian.summary.responses[200].parse(await res.json());
    },
  });
}

export function useCreateLaporan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertLaporanHarian) => {
      // Coerce inputs
      const payload = {
        ...data,
        jumlah: Number(data.jumlah),
        jenisLayananId: Number(data.jenisLayananId),
      };

      const res = await fetch(api.laporanHarian.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create report");
      }
      return api.laporanHarian.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.laporanHarian.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.laporanHarian.summary.path] });
      toast({ title: "Success", description: "Report entry created" });
    },
    onError: (error) => {
      toast({ 
        title: "Submission Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}

export function useUpdateLaporan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InsertLaporanHarian> & { id: number }) => {
      const payload = {
        ...data,
        jumlah: data.jumlah ? Number(data.jumlah) : undefined,
        jenisLayananId: data.jenisLayananId ? Number(data.jenisLayananId) : undefined,
      };

      const url = buildUrl(api.laporanHarian.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update report");
      }
      return api.laporanHarian.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.laporanHarian.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.laporanHarian.summary.path] });
      toast({ title: "Success", description: "Report updated" });
    },
    onError: (error) => {
      toast({ 
        title: "Update Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}

export function useDeleteLaporan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.laporanHarian.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete report");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.laporanHarian.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.laporanHarian.summary.path] });
      toast({ title: "Deleted", description: "Report entry removed" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}
