import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertJenisLayanan, type JenisLayanan } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useJenisLayanan() {
  return useQuery({
    queryKey: [api.jenisLayanan.list.path],
    queryFn: async () => {
      const res = await fetch(api.jenisLayanan.list.path);
      if (!res.ok) throw new Error("Failed to fetch services");
      return api.jenisLayanan.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateJenisLayanan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertJenisLayanan) => {
      const res = await fetch(api.jenisLayanan.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create service");
      }
      return api.jenisLayanan.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jenisLayanan.list.path] });
      toast({ title: "Success", description: "Service created successfully" });
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

export function useUpdateJenisLayanan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InsertJenisLayanan> & { id: number }) => {
      const url = buildUrl(api.jenisLayanan.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update service");
      }
      return api.jenisLayanan.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jenisLayanan.list.path] });
      toast({ title: "Success", description: "Service updated successfully" });
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

export function useDeleteJenisLayanan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.jenisLayanan.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      
      if (!res.ok) {
        throw new Error("Failed to delete service");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.jenisLayanan.list.path] });
      toast({ title: "Success", description: "Service deleted successfully" });
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
