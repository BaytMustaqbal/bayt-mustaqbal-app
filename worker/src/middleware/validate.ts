// worker/src/middleware/validate.ts
// Validation middleware using Zod

import { z } from 'zod';
import { createMiddleware } from 'hono/factory';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../../types/env';

// ============================================================
//  Common Schemas
// ============================================================
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc')
});

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// ============================================================
//  Transaction Schemas
// ============================================================
export const transactionCreateSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipe: z.enum(['income', 'expense']),
  kategori_id: z.string().uuid(),
  jumlah: z.number().int().min(1000).max(9999999999),
  account_id: z.string().uuid(),
  scope: z.enum(['pribadi', 'keluarga', 'usaha']),
  metode: z.enum(['tunai', 'transfer', 'debit', 'kredit', 'ewallet']),
  keterangan: z.string().max(500).optional(),
  tags: z.string().max(200).optional(),
  recurring_id: z.string().uuid().optional(),
  bill_id: z.string().uuid().optional()
});

export const transactionUpdateSchema = transactionCreateSchema.partial().extend({
  txn_id: z.string().uuid(),
  rev: z.number().int().min(1)
});

// ============================================================
//  Bill Schemas
// ============================================================
export const billCreateSchema = z.object({
  nama: z.string().min(1).max(100),
  tipe: z.enum(['rutin', 'cicilan', 'sekali', 'kartu_kredit', 'iuran_sampah']),
  jumlah: z.number().int().min(1000).max(9999999999),
  jatuh_tempo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cicilan_ke: z.number().int().min(0).optional(),
  total_cicilan: z.number().int().min(0).optional(),
  rec_id: z.string().uuid().optional(),
  estimasi: z.enum(['YA', 'TIDAK']).default('TIDAK'),
  prioritas: z.enum(['tinggi', 'normal', 'rendah']).default('normal'),
  kategori_id: z.string().uuid().optional(),
  catatan: z.string().max(500).optional(),
  remind_at: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/).optional(),
  remind_channel: z.enum(['WA', 'EMAIL', 'BOTH']).default('WA')
});

export const billUpdateSchema = billCreateSchema.partial().extend({
  bill_id: z.string().uuid(),
  rev: z.number().int().min(1)
});

export const billPaySchema = z.object({
  bill_id: z.string().uuid(),
  jumlah: z.number().int().min(1000),
  account_id: z.string().uuid(),
  metode: z.enum(['tunai', 'transfer', 'debit', 'kredit', 'ewallet']),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  keterangan: z.string().max(500).optional(),
  kategori_id: z.string().uuid().optional()
});

// ============================================================
//  Recurring Schemas
// ============================================================
export const recurringCreateSchema = z.object({
  nama: z.string().min(1).max(100),
  tipe: z.enum(['income', 'expense']),
  kategori_id: z.string().uuid(),
  jumlah: z.number().int().min(0).max(9999999999),
  frekuensi: z.enum(['harian', 'mingguan', 'bulanan', 'tahunan']),
  interval: z.number().int().min(1).max(12).default(1),
  tanggal_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tanggal_akhir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hari_tanggal: z.number().int().min(1).max(31).default(1),
  scope: z.enum(['pribadi', 'keluarga', 'usaha']).default('keluarga'),
  account_id: z.string().uuid().optional(),
  auto_post: z.enum(['YA', 'TIDAK']).default('TIDAK'),
  kategori_variabel: z.enum(['YA', 'TIDAK']).default('TIDAK')
});

export const recurringUpdateSchema = recurringCreateSchema.partial().extend({
  rec_id: z.string().uuid(),
  rev: z.number().int().min(1)
});

// ============================================================
//  Attendance Schemas
// ============================================================
export const attendanceUpsertSchema = z.object({
  att_id: z.string().uuid().optional(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nama: z.string().min(1).max(50),
  status: z.enum(['hadir', 'izin', 'cuti', 'sakit', 'lembur', 'WFH']),
  alasan: z.string().max(500).optional(),
  dari_jam: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  sampai_jam: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  catatan: z.string().max(500).optional(),
  terjadwal: z.enum(['YA', 'TIDAK']).default('TIDAK')
});

// ============================================================
//  Calendar Schemas
// ============================================================
export const calendarCreateSchema = z.object({
  judul: z.string().min(1).max(100),
  kategori: z.enum(['keluarga', 'liburan', 'rencana', 'kerja', 'spiritual', 'ultah']),
  tanggal_mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tanggal_selesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  jam_mulai: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  jam_selesai: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  lokasi: z.string().max(100).optional(),
  deskripsi: z.string().max(500).optional(),
  biaya_rencana: z.number().int().min(0).default(0),
  all_day: z.enum(['YA', 'TIDAK']).default('YA'),
  reminder_hari: z.number().int().min(0).max(30).default(1),
  reminder_email: z.enum(['YA', 'TIDAK']).default('TIDAK'),
  prioritas: z.enum(['tinggi', 'normal', 'rendah']).default('normal'),
  rec_id: z.string().uuid().optional()
});

export const calendarUpdateSchema = calendarCreateSchema.partial().extend({
  event_id: z.string().uuid(),
  rev: z.number().int().min(1)
});

export const calendarToggleSchema = z.object({
  event_id: z.string().uuid(),
  rev: z.number().int().min(1),
  selesai: z.boolean()
});

// ============================================================
//  Service Schemas
// ============================================================
export const serviceAssetCreateSchema = z.object({
  nama: z.string().min(1).max(100),
  grup: z.enum(['motor', 'rumah', 'elektronik', 'perabot', 'lainnya']),
  merek: z.string().max(50).optional(),
  tipe: z.string().max(50).optional(),
  tahun: z.string().max(4).optional(),
  no_seri: z.string().max(50).optional(),
  lokasi: z.string().max(100).optional(),
  interval_hari: z.number().int().min(1).max(3650).default(0),
  interval_km: z.number().int().min(1).max(999999).default(0),
  keterangan: z.string().max(500).optional()
});

export const serviceLogCreateSchema = z.object({
  asset_id: z.string().uuid(),
  jenis: z.enum(['servis', 'ganti', 'perbaikan', 'rutin', 'claim_asuransi']),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kilometer: z.number().int().min(0).max(999999).default(0),
  biaya: z.number().int().min(0).max(9999999999).default(0),
  vendor: z.string().max(100).optional(),
  no_nota: z.string().max(50).optional(),
  parts: z.string().max(500).optional(),
  catatan: z.string().max(500).optional(),
  selesai: z.enum(['YA', 'TIDAK']).default('YA')
});

// ============================================================
//  Notes Schemas
// ============================================================
export const noteCreateSchema = z.object({
  judul: z.string().min(1).max(100),
  isi: z.string().max(5000).optional(),
  kategori: z.enum(['ide', 'resep', 'referensi', 'lainnya']).default('lainnya'),
  pin: z.enum(['YA', 'TIDAK']).default('TIDAK')
});

export const noteUpdateSchema = noteCreateSchema.partial().extend({
  note_id: z.string().uuid(),
  rev: z.number().int().min(1)
});

// ============================================================
//  Settings Schemas
// ============================================================
export const settingsUpdateSchema = z.object({
  key: z.string(),
  value: z.string()
});

export const fonnteConfigSchema = z.object({
  fonnte_token: z.string().min(1),
  fonnte_target: z.string().regex(/^62\d+@g\.us$/),
  fonnte_device: z.string().default('default'),
  notifikasi_channel: z.enum(['WA', 'EMAIL', 'BOTH', 'NONE']).default('WA'),
  jam_notifikasi: z.string().regex(/^\d{2}:\d{2}$/).default('07:00')
});

// ============================================================
//  Auth Schemas
// ============================================================
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  nama: z.string().min(1).max(50),
  role: z.enum(['admin', 'user']),
  password: z.string().min(6)
});

export const userUpdateSchema = z.object({
  user_id: z.string().uuid(),
  nama: z.string().min(1).max(50).optional(),
  role: z.enum(['admin', 'user']).optional(),
  aktif: z.enum(['YA', 'TIDAK']).optional(),
  rev: z.number().int().min(1)
});

// ============================================================
//  Category Schemas
// ============================================================
export const categoryCreateSchema = z.object({
  nama: z.string().min(1).max(100),
  tipe: z.enum(['income', 'expense']),
  scope: z.enum(['pribadi', 'keluarga', 'usaha']),
  parent_id: z.string().uuid().optional(),
  warna: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#757575'),
  ikon: z.string().max(10).default('📁'),
  budget_bulanan: z.number().int().min(0).default(0)
});

export const categoryUpdateSchema = categoryCreateSchema.partial().extend({
  category_id: z.string().uuid(),
  rev: z.number().int().min(1)
});

export const categoryReorderSchema = z.object({
  orders: z.array(z.object({
    category_id: z.string().uuid(),
    urutan: z.number().int().min(0)
  }))
});

// ============================================================
//  Validator Middleware Factory
// ============================================================
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types/env';

// Wrapper for consistent error response
export const validate = <T extends z.ZodSchema>(schema: T, target: 'json' | 'query' | 'param' = 'json') => {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      }
      return c.json<Env['ApiResponse']>({
        ok: false,
        error: { code: 'VALIDATION', message: 'Validasi gagal', details: errors }
      }, 400);
    }
  });
};

// Pre-built validators
export const validateTransactionCreate = validate(transactionCreateSchema);
export const validateTransactionUpdate = validate(transactionUpdateSchema);
export const validateBillCreate = validate(billCreateSchema);
export const validateBillUpdate = validate(billUpdateSchema);
export const validateBillPay = validate(billPaySchema);
export const validateRecurringCreate = validate(recurringCreateSchema);
export const validateRecurringUpdate = validate(recurringUpdateSchema);
export const validateAttendanceUpsert = validate(attendanceUpsertSchema);
export const validateCalendarCreate = validate(calendarCreateSchema);
export const validateCalendarUpdate = validate(calendarUpdateSchema);
export const validateCalendarToggle = validate(calendarToggleSchema);
export const validateServiceAssetCreate = validate(serviceAssetCreateSchema);
export const validateServiceLogCreate = validate(serviceLogCreateSchema);
export const validateNoteCreate = validate(noteCreateSchema);
export const validateNoteUpdate = validate(noteUpdateSchema);
export const validateSettingsUpdate = validate(settingsUpdateSchema);
export const validateFonnteConfig = validate(fonnteConfigSchema);
export const validateLogin = validate(loginSchema);
export const validateUserCreate = validate(userCreateSchema);
export const validateUserUpdate = validate(userUpdateSchema);
export const validateCategoryCreate = validate(categoryCreateSchema);
export const validateCategoryUpdate = validate(categoryUpdateSchema);
export const validateCategoryReorder = validate(categoryReorderSchema);
export const validatePagination = validate(paginationSchema, 'query');
export const validateDateRange = validate(dateRangeSchema, 'query');