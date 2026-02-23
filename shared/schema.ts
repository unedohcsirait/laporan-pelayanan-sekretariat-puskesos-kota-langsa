import { pgTable, text, serial, integer, boolean, timestamp, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(), // bcrypt hashed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jenisLayanan = pgTable("jenis_layanan", {
  id: serial("id").primaryKey(),
  namaLayanan: text("nama_layanan").notNull(),
  status: boolean("status").default(true).notNull(), // true = aktif, false = nonaktif
});

export const laporanHarian = pgTable("laporan_harian", {
  id: serial("id").primaryKey(),
  tanggal: date("tanggal").notNull(), // Format YYYY-MM-DD
  jenisLayananId: integer("jenis_layanan_id").notNull().references(() => jenisLayanan.id),
  jumlah: integer("jumlah").notNull(),
  noKkList: text("no_kk_list"), // JSON array of KK/KTP numbers, nullable
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Tidak boleh ada duplikasi tanggal + jenis_layanan_id
    unq: unique().on(table.tanggal, table.jenisLayananId)
  }
});

// === RELATIONS ===
export const laporanRelations = relations(laporanHarian, ({ one }) => ({
  jenisLayanan: one(jenisLayanan, {
    fields: [laporanHarian.jenisLayananId],
    references: [jenisLayanan.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertJenisLayananSchema = createInsertSchema(jenisLayanan).omit({ id: true });
// Base schema from table, then we make jumlah optional (auto-calculated from noKkList server-side)
export const insertLaporanHarianSchema = createInsertSchema(laporanHarian)
  .omit({ id: true, createdAt: true })
  .extend({
    jumlah: z.number().int().positive().optional().default(1),
    noKkList: z.string().nullable().optional(),
  });

// === EXPLICIT API CONTRACT TYPES ===
export type JenisLayanan = typeof jenisLayanan.$inferSelect;
export type InsertJenisLayanan = z.infer<typeof insertJenisLayananSchema>;
export type UpdateJenisLayananRequest = Partial<InsertJenisLayanan>;

export type LaporanHarian = typeof laporanHarian.$inferSelect;
export type InsertLaporanHarian = z.infer<typeof insertLaporanHarianSchema>;
export type UpdateLaporanHarianRequest = Partial<InsertLaporanHarian>;

// Laporan harian joined with Jenis Layanan
export type LaporanWithLayanan = LaporanHarian & { jenisLayanan: JenisLayanan };

// Users
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
