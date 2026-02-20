import { db } from "./db";
import {
  jenisLayanan,
  laporanHarian,
  type JenisLayanan,
  type InsertJenisLayanan,
  type UpdateJenisLayananRequest,
  type LaporanHarian,
  type InsertLaporanHarian,
  type UpdateLaporanHarianRequest,
  type LaporanWithLayanan
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Jenis Layanan
  getJenisLayananList(): Promise<JenisLayanan[]>;
  getJenisLayanan(id: number): Promise<JenisLayanan | undefined>;
  createJenisLayanan(data: InsertJenisLayanan): Promise<JenisLayanan>;
  updateJenisLayanan(id: number, data: UpdateJenisLayananRequest): Promise<JenisLayanan>;
  deleteJenisLayanan(id: number): Promise<void>;

  // Laporan Harian
  getLaporanList(month?: number, year?: number): Promise<LaporanWithLayanan[]>;
  getLaporan(id: number): Promise<LaporanHarian | undefined>;
  getLaporanByDateAndLayanan(tanggal: string, jenisLayananId: number): Promise<LaporanHarian | undefined>;
  createLaporan(data: InsertLaporanHarian): Promise<LaporanHarian>;
  updateLaporan(id: number, data: UpdateLaporanHarianRequest): Promise<LaporanHarian>;
  deleteLaporan(id: number): Promise<void>;
  
  // Summary
  getLaporanSummary(month?: number, year?: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Jenis Layanan
  async getJenisLayananList(): Promise<JenisLayanan[]> {
    return await db.select().from(jenisLayanan).orderBy(jenisLayanan.namaLayanan);
  }

  async getJenisLayanan(id: number): Promise<JenisLayanan | undefined> {
    const [result] = await db.select().from(jenisLayanan).where(eq(jenisLayanan.id, id));
    return result;
  }

  async createJenisLayanan(data: InsertJenisLayanan): Promise<JenisLayanan> {
    const [result] = await db.insert(jenisLayanan).values(data).returning();
    return result;
  }

  async updateJenisLayanan(id: number, data: UpdateJenisLayananRequest): Promise<JenisLayanan> {
    const [result] = await db.update(jenisLayanan).set(data).where(eq(jenisLayanan.id, id)).returning();
    return result;
  }

  async deleteJenisLayanan(id: number): Promise<void> {
    await db.delete(jenisLayanan).where(eq(jenisLayanan.id, id));
  }

  // Laporan Harian
  async getLaporanList(month?: number, year?: number): Promise<LaporanWithLayanan[]> {
    let conditions = [];
    
    if (month && year) {
      conditions.push(sql`EXTRACT(MONTH FROM ${laporanHarian.tanggal}) = ${month}`);
      conditions.push(sql`EXTRACT(YEAR FROM ${laporanHarian.tanggal}) = ${year}`);
    } else if (month) {
      conditions.push(sql`EXTRACT(MONTH FROM ${laporanHarian.tanggal}) = ${month}`);
    } else if (year) {
      conditions.push(sql`EXTRACT(YEAR FROM ${laporanHarian.tanggal}) = ${year}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.select({
      laporan: laporanHarian,
      layanan: jenisLayanan
    })
    .from(laporanHarian)
    .innerJoin(jenisLayanan, eq(laporanHarian.jenisLayananId, jenisLayanan.id))
    .where(whereClause)
    .orderBy(desc(laporanHarian.tanggal));

    return rows.map(r => ({
      ...r.laporan,
      jenisLayanan: r.layanan
    }));
  }

  async getLaporan(id: number): Promise<LaporanHarian | undefined> {
    const [result] = await db.select().from(laporanHarian).where(eq(laporanHarian.id, id));
    return result;
  }

  async getLaporanByDateAndLayanan(tanggal: string, jenisLayananId: number): Promise<LaporanHarian | undefined> {
    const [result] = await db.select()
      .from(laporanHarian)
      .where(and(eq(laporanHarian.tanggal, tanggal), eq(laporanHarian.jenisLayananId, jenisLayananId)));
    return result;
  }

  async createLaporan(data: InsertLaporanHarian): Promise<LaporanHarian> {
    const [result] = await db.insert(laporanHarian).values(data).returning();
    return result;
  }

  async updateLaporan(id: number, data: UpdateLaporanHarianRequest): Promise<LaporanHarian> {
    const [result] = await db.update(laporanHarian).set(data).where(eq(laporanHarian.id, id)).returning();
    return result;
  }

  async deleteLaporan(id: number): Promise<void> {
    await db.delete(laporanHarian).where(eq(laporanHarian.id, id));
  }
  
  async getLaporanSummary(month?: number, year?: number): Promise<any> {
    const laporans = await this.getLaporanList(month, year);
    
    let totalKeseluruhan = 0;
    const rankingMap: Record<number, { namaLayanan: string, total: number }> = {};
    const dailyMap: Record<string, number> = {};
    
    for (const lap of laporans) {
      totalKeseluruhan += lap.jumlah;
      
      // Ranking
      if (!rankingMap[lap.jenisLayananId]) {
        rankingMap[lap.jenisLayananId] = { namaLayanan: lap.jenisLayanan.namaLayanan, total: 0 };
      }
      rankingMap[lap.jenisLayananId].total += lap.jumlah;
      
      // Daily
      const tgl = lap.tanggal;
      if (!dailyMap[tgl]) dailyMap[tgl] = 0;
      dailyMap[tgl] += lap.jumlah;
    }
    
    const uniqueDays = Object.keys(dailyMap).length;
    const rataRataPerHari = uniqueDays > 0 ? totalKeseluruhan / uniqueDays : 0;
    
    const rankingLayanan = Object.entries(rankingMap)
      .map(([id, data]) => ({ jenisLayananId: Number(id), namaLayanan: data.namaLayanan, total: data.total }))
      .sort((a, b) => b.total - a.total);
      
    return {
      totalKeseluruhan,
      totalPerHari: Object.entries(dailyMap).map(([tanggal, total]) => ({ tanggal, total })).sort((a,b) => a.tanggal.localeCompare(b.tanggal)),
      rataRataPerHari,
      rankingLayanan
    };
  }
}

export const storage = new DatabaseStorage();
