import { z } from 'zod';
import { insertJenisLayananSchema, insertLaporanHarianSchema, jenisLayanan, laporanHarian } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// Summary Response
export const summaryResponseSchema = z.object({
  totalKeseluruhan: z.number(),
  totalPerHari: z.array(z.object({
    tanggal: z.string(),
    total: z.number()
  })),
  totalPerBulan: z.array(z.object({
    bulan: z.number(),
    total: z.number()
  })).optional(),
  rataRataPerHari: z.number(),
  rankingLayanan: z.array(z.object({
    jenisLayananId: z.number(),
    namaLayanan: z.string(),
    total: z.number()
  }))
});

export const api = {
  jenisLayanan: {
    list: {
      method: 'GET' as const,
      path: '/api/jenis-layanan' as const,
      responses: {
        200: z.array(z.custom<typeof jenisLayanan.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/jenis-layanan' as const,
      input: insertJenisLayananSchema,
      responses: {
        201: z.custom<typeof jenisLayanan.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/jenis-layanan/:id' as const,
      input: insertJenisLayananSchema.partial(),
      responses: {
        200: z.custom<typeof jenisLayanan.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/jenis-layanan/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  laporanHarian: {
    list: {
      method: 'GET' as const,
      path: '/api/laporan' as const,
      input: z.object({
        month: z.string().optional(), // 1-12
        year: z.string().optional(),  // YYYY
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof laporanHarian.$inferSelect & { jenisLayanan: typeof jenisLayanan.$inferSelect }>()),
      },
    },
    summary: {
      method: 'GET' as const,
      path: '/api/laporan/summary' as const,
      input: z.object({
        month: z.string().optional(),
        year: z.string().optional(),
      }).optional(),
      responses: {
        200: summaryResponseSchema
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/laporan' as const,
      input: insertLaporanHarianSchema,
      responses: {
        201: z.custom<typeof laporanHarian.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/laporan/:id' as const,
      input: insertLaporanHarianSchema.partial(),
      responses: {
        200: z.custom<typeof laporanHarian.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/laporan/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}