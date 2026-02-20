import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Jenis Layanan
  app.get(api.jenisLayanan.list.path, async (req, res) => {
    const data = await storage.getJenisLayananList();
    res.json(data);
  });

  app.post(api.jenisLayanan.create.path, async (req, res) => {
    try {
      const input = api.jenisLayanan.create.input.parse(req.body);
      const data = await storage.createJenisLayanan(input);
      res.status(201).json(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.jenisLayanan.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.jenisLayanan.update.input.parse(req.body);
      const existing = await storage.getJenisLayanan(id);
      if (!existing) return res.status(404).json({ message: "Jenis Layanan tidak ditemukan" });
      
      const data = await storage.updateJenisLayanan(id, input);
      res.json(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.jenisLayanan.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getJenisLayanan(id);
      if (!existing) return res.status(404).json({ message: "Jenis Layanan tidak ditemukan" });
      
      await storage.deleteJenisLayanan(id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Laporan Harian
  app.get(api.laporanHarian.list.path, async (req, res) => {
    try {
      const month = req.query.month ? Number(req.query.month) : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      const data = await storage.getLaporanList(month, year);
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.laporanHarian.summary.path, async (req, res) => {
    try {
      const month = req.query.month ? Number(req.query.month) : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      const summary = await storage.getLaporanSummary(month, year);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.laporanHarian.create.path, async (req, res) => {
    try {
      const input = api.laporanHarian.create.input.parse(req.body);
      
      // Check duplicate
      const existing = await storage.getLaporanByDateAndLayanan(input.tanggal, input.jenisLayananId);
      if (existing) {
        return res.status(400).json({ message: "Laporan untuk layanan ini pada tanggal tersebut sudah ada." });
      }

      const data = await storage.createLaporan(input);
      res.status(201).json(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.laporanHarian.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.laporanHarian.update.input.parse(req.body);
      
      const existing = await storage.getLaporan(id);
      if (!existing) return res.status(404).json({ message: "Laporan tidak ditemukan" });
      
      // Check duplicate if date or jenisLayananId changed
      if ((input.tanggal && input.tanggal !== existing.tanggal) || 
          (input.jenisLayananId && input.jenisLayananId !== existing.jenisLayananId)) {
        const checkTanggal = input.tanggal || existing.tanggal;
        const checkLayanan = input.jenisLayananId || existing.jenisLayananId;
        const duplicate = await storage.getLaporanByDateAndLayanan(checkTanggal, checkLayanan);
        
        if (duplicate && duplicate.id !== id) {
          return res.status(400).json({ message: "Laporan untuk layanan ini pada tanggal tersebut sudah ada." });
        }
      }

      const data = await storage.updateLaporan(id, input);
      res.json(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.laporanHarian.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getLaporan(id);
      if (!existing) return res.status(404).json({ message: "Laporan tidak ditemukan" });
      
      await storage.deleteLaporan(id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingLayanan = await storage.getJenisLayananList();
  if (existingLayanan.length === 0) {
    const l1 = await storage.createJenisLayanan({ namaLayanan: "Pembuatan KTP", status: true });
    const l2 = await storage.createJenisLayanan({ namaLayanan: "Pembuatan KK", status: true });
    const l3 = await storage.createJenisLayanan({ namaLayanan: "Surat Keterangan Pindah", status: true });
    
    // Create some laporan
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    
    await storage.createLaporan({ tanggal: fmt(today), jenisLayananId: l1.id, jumlah: 15, keterangan: "Normal" });
    await storage.createLaporan({ tanggal: fmt(today), jenisLayananId: l2.id, jumlah: 8, keterangan: "" });
    await storage.createLaporan({ tanggal: fmt(yesterday), jenisLayananId: l1.id, jumlah: 20, keterangan: "Ramai" });
    await storage.createLaporan({ tanggal: fmt(yesterday), jenisLayananId: l3.id, jumlah: 5, keterangan: "" });
  }
}
