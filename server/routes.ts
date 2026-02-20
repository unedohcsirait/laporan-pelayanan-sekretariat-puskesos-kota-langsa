import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { requireAuth, seedAdminUser } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === AUTH ROUTES (tidak perlu auth) ===
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login gagal" });
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        res.json({ user });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(204).end();
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  // === SEMUA ROUTE DI BAWAH INI BUTUH AUTH ===
  app.use("/api", requireAuth);

  // Edit akun (username / password)
  app.put("/api/auth/account", async (req, res, next) => {
    try {
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const bcrypt = (await import("bcryptjs")).default;

      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { username, currentPassword, newPassword } = req.body as {
        username?: string;
        currentPassword?: string;
        newPassword?: string;
      };

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

      // Verify current password
      if (!currentPassword) return res.status(400).json({ message: "Password saat ini diperlukan" });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ message: "Password saat ini salah" });

      const updates: Record<string, any> = {};

      if (username && username !== user.username) {
        // Check uniqueness
        const [existing] = await db.select().from(users).where(eq(users.username, username));
        if (existing) return res.status(400).json({ message: "Username sudah digunakan" });
        updates.username = username;
      }

      if (newPassword) {
        updates.password = await bcrypt.hash(newPassword, 10);
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Tidak ada perubahan" });
      }

      await db.update(users).set(updates).where(eq(users.id, userId));
      res.json({ message: "Akun berhasil diperbarui" });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/settings/:key", async (req, res) => {

    const value = await storage.getSetting(req.params.key);
    res.json({ value });
  });

  app.post("/api/settings", async (req, res) => {
    const { key, value } = req.body;
    await storage.setSetting(key, value);
    res.status(204).end();
  });

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
  await seedAdminUser();

  return httpServer;
}

async function seedDatabase() {
  // Seed basic settings
  const title = await storage.getSetting("app_title");
  if (!title) {
    await storage.setSetting("app_title", "LAPORAN PELAYANAN SEKRETARIAT PUSKESOS KOTA LANGSA");
    await storage.setSetting("app_subtitle", "DI KANTOR DINAS SOSIAL KOTA LANGSA");
  }

  const existingLayanan = await storage.getJenisLayananList();
  if (existingLayanan.length === 0) {
    const services = [
      "Pengaktifan BPJS",
      "Pengecekan DESIL",
      "Pembuatan DTKS",
      "Rekomendasi Jampersal",
      "Rekomendasi KIP Kuliah",
      "Surat Keterangan Terdaftar DTKS",
      "Penerbitan Kartu Kusuka",
      "Laporan Anak Terlantar",
      "Laporan Lansia Terlantar",
      "Penyelesaian Konflik Sosial",
      "Bantuan Masa Panik",
      "Usulan Rumah Layak Huni",
      "Penerbitan Surat Kematian (Ahli Waris)"
    ];

    const createdLayanan = [];
    for (const name of services) {
      const s = await storage.createJenisLayanan({ namaLayanan: name, status: true });
      createdLayanan.push(s);
    }
    
    // Create some realistic laporan for January 2026 as per Excel
    const jan26 = (day: number) => `2026-01-${day.toString().padStart(2, '0')}`;
    
    // Seed with some data from the first week of Jan 2026
    // Monday Jan 5 to Friday Jan 9, 2026
    const days = [5, 6, 7, 8, 9];
    const dataMatrix = [
      [26, 13, 18, 7, 4],  // BPJS
      [36, 28, 31, 19, 18] // DESIL
    ];

    for (let i = 0; i < dataMatrix.length; i++) {
      for (let j = 0; j < days.length; j++) {
        await storage.createLaporan({
          tanggal: jan26(days[j]),
          jenisLayananId: createdLayanan[i].id,
          jumlah: dataMatrix[i][j],
          keterangan: "-"
        });
      }
    }
  }
}
