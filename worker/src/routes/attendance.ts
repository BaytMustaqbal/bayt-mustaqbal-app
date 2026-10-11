// worker/src/routes/attendance.ts
// Attendance routes

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getCurrentPeriod, today, now, generateId, writeAudit } from '../utils/db';
import type { Env } from '../types/env';

export const attendanceRoutes = new Hono<{ Bindings: Env }>();

attendanceRoutes.use('*', authMiddleware);

// GET /api/att/list
attendanceRoutes.get('/list', async (c) => {
  const user = c.get('user');
  const { nama, periode, startDate, endDate, status } = c.req.query();
  
  let where = 'WHERE a.void != "YA"';
  const params: any[] = [];
  
  if (nama) { where += ' AND a.nama = ?'; params.push(nama); }
  if (periode) { where += ' AND a.periode = ?'; params.push(periode); }
  if (startDate) { where += ' AND a.tanggal >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND a.tanggal <= ?'; params.push(endDate); }
  if (status) { where += ' AND a.status = ?'; params.push(status); }
  
  if (user.role !== 'admin') {
    where += ' AND a.nama = ?';
    params.push(user.nama);
  }
  
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM attendance a
    ${where}
    ORDER BY a.tanggal DESC, a.nama
  `).bind(...params).all();
  
  const enriched = results.map(r => ({
    ...r,
    status_label: attendanceStatusLabel(r.status),
    status_color: attendanceStatusColor(r.status),
    status_icon: attendanceStatusIcon(r.status),
    formatted_tanggal: formatDate(r.tanggal),
    terjadwal_label: attendanceScheduledStatus(r.terjadwal).label,
    terjadwal_color: attendanceScheduledStatus(r.terjadwal).color,
    terjadwal_icon: attendanceScheduledStatus(r.terjadwal).icon
  }));
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { data: enriched } });
});

// GET /api/att/calendar
attendanceRoutes.get('/calendar', async (c) => {
  const user = c.get('user');
  const { tahun, bulan, nama } = c.req.query();
  const year = parseInt(tahun) || new Date().getFullYear();
  const month = parseInt(bulan) || new Date().getMonth() + 1;
  const targetPeriode = `${year}-${String(month).padStart(2, '0')}`;
  const targetNama = nama || user.nama;
  
  const daysInMonth = daysInMonth_(year, month);
  const firstDay = new Date(year, month - 1, 1).getDay();
  
  const rows = await c.env.DB.prepare(`
    SELECT * FROM attendance 
    WHERE periode = ? AND nama = ?
  `).bind(targetPeriode, targetNama).all();
  
  const byDate: Record<string, any[]> = {};
  rows.results.forEach(r => {
    if (!byDate[r.tanggal]) byDate[r.tanggal] = [];
    byDate[r.tanggal].push(r);
  });
  
  const holidays = (await getSetting(c.env.DB, 'hari_libur') || '').split(',').map(s => s.trim());
  
  const grid = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isHoliday = holidays.includes(dateStr);
    const isWeekend = isWeekend_(dateStr);
    const atts = byDate[dateStr] || [];
    
    grid.push({
      date: dateStr,
      day: d,
      is_holiday: isHoliday,
      is_weekend: isWeekend,
      attendances: atts.map(a => ({
        att_id: a.att_id,
        nama: a.nama,
        status: a.status,
        label: attendanceStatusLabel(a.status),
        color: attendanceStatusColor(a.status),
        icon: attendanceStatusIcon(a.status),
        terjadwal: a.terjadwal
      }))
    });
  }
  
  const liburDates = holidays.filter(h => h.startsWith(`${year}-${String(month).padStart(2, '0')}`));
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      year, month, month_label: monthName_(month) + ' ' + year,
      days_in_month: daysInMonth, first_day: firstDay,
      grid, libur_dates: liburDates
    }
  });
});

// POST /api/att/upsert
attendanceRoutes.post('/upsert', async (c) => {
  const user = c.get('user');
  const { att_id, tanggal, nama, status, alasan, dari_jam, sampai_jam, catatan, terjadwal, rev } = await c.req.json();
  
  if (!tanggal || !nama || !status) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Tanggal, nama, status wajib' }}, 400);
  }
  
  if (['izin', 'cuti', 'sakit'].includes(status) && !alasan) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Alasan wajib untuk Izin/Cuti/Sakit' }}, 400);
  }
  
  const existing = await c.env.DB.prepare(`
    SELECT * FROM attendance WHERE tanggal = ? AND nama = ?
  `).bind(tanggal, nama).first();
  
  const periode = periodFromDate(tanggal);
  const isHoliday = (await getSetting(c.env.DB, 'hari_libur') || '').split(',').map(s => s.trim()).includes(tanggal);
  
  if (existing && existing.void !== 'YA') {
    if (!isAdmin(user) && existing.dibuat_oleh !== user.email) {
      return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'FORBIDDEN', message: 'Hanya pemilik atau admin yang bisa mengubah' }}, 403);
    }
    
    const updateData = { status, alasan: alasan || '', dari_jam: dari_jam || '', sampai_jam: sampai_jam || '', catatan: catatan || '', terjadwal: terjadwal || 'TIDAK' };
    const updated = await c.env.DB.prepare(`
      UPDATE attendance SET status = ?, alasan = ?, dari_jam = ?, sampai_jam = ?, catatan = ?, terjadwal = ?,
        diubah_oleh = ?, diubah_pada = ?, rev = rev + 1
      WHERE att_id = ? AND rev = ?
    `).bind(status, alasan || '', dari_jam || '', sampai_jam || '', catatan || '', terjadwal || 'TIDAK', user.email, now(), att_id, rev).run();
    
    await writeAudit(c.env.DB, {
      email: user.email, role: user.role, aksi: 'update', entity: 'attendance', entityId: att_id,
      ringkas: `Update absensi: ${status}`, sebelum: existing, sesudah: { ...existing, ...updateData }
    });
    
    return c.json<Env['ApiResponse']>({ ok: true, data: updated });
  } else {
    const attData = {
      att_id: generateId(),
      tanggal, periode, nama, status, alasan: alasan || '',
      dari_jam: dari_jam || '', sampai_jam: sampai_jam || '',
      catatan: catatan || '', terjadwal: terjadwal || 'TIDAK',
      dibuat_oleh: user.email, dibuat_pada: now(), void: 'TIDAK', rev: 1
    };
    
    await c.env.DB.prepare(`
      INSERT INTO attendance (att_id, tanggal, periode, nama, status, alasan, dari_jam, sampai_jam, catatan, terjadwal, dibuat_oleh, dibuat_pada, void, rev)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TIDAK', 1)
    `).bind(
      attData.att_id, attData.tanggal, attData.periode, attData.nama, attData.status,
      attData.alasan, attData.dari_jam, attData.sampai_jam, attData.catatan, attData.terjadwal,
      attData.dibuat_oleh, attData.dibuat_pada
    ).run();
    
    await writeAudit(c.env.DB, {
      email: user.email, role: user.role, aksi: 'create', entity: 'attendance', entityId: attData.att_id,
      ringkas: `Absensi: ${nama} ${status} ${formatDate(tanggal)}`
    });
    
    return c.json<Env['ApiResponse']>({ ok: true, data: attData });
  }
});

// DELETE /api/att/delete
attendanceRoutes.delete('/delete', async (c) => {
  const user = c.get('user');
  const { att_id, rev } = c.req.query();
  
  if (!att_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'att_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM attendance WHERE att_id = ?').bind(att_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Absensi tidak ditemukan' }}, 404);
  }
  
  if (!isAdmin(user) && existing.dibuat_oleh !== user.email) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'FORBIDDEN', message: 'Hanya pemilik atau admin yang bisa menghapus' }}, 403);
  }
  
  await c.env.DB.prepare('UPDATE attendance SET void = "YA", rev = rev + 1 WHERE att_id = ? AND rev = ?').bind(att_id, rev).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'delete', entity: 'attendance', entityId: att_id,
    ringkas: `Hapus absensi: ${existing.nama} ${existing.status}`
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// GET /api/att/quota
attendanceRoutes.get('/quota', async (c) => {
  const user = c.get('user');
  const { nama, tahun } = c.req.query();
  const targetNama = nama || user.nama;
  const targetTahun = parseInt(tahun) || new Date().getFullYear();
  
  const quota = await c.env.DB.prepare(`
    SELECT * FROM attendance_quota WHERE tahun = ? AND nama = ?
  `).bind(targetTahun, targetNama).first();
  
  const periodePrefix = `${targetTahun}-`;
  const cutiUsed = await c.env.DB.prepare(`
    SELECT COUNT(*) as cnt FROM attendance WHERE nama = ? AND status = 'cuti' AND periode LIKE ?
  `).bind(targetNama, `${periodePrefix}%`).first();
  
  const izinUsed = await c.env.DB.prepare(`
    SELECT COUNT(*) as cnt FROM attendance WHERE nama = ? AND status = 'izin' AND periode LIKE ?
  `).bind(targetNama, `${periodePrefix}%`).first();
  
  const sakitUsed = await c.env.DB.prepare(`
    SELECT COUNT(*) as cnt FROM attendance WHERE nama = ? AND status = 'sakit' AND periode LIKE ?
  `).bind(targetNama, `${periodePrefix}%`).first();
  
  const hadirCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as cnt FROM attendance WHERE nama = ? AND status = 'hadir' AND periode LIKE ?
  `).bind(targetNama, `${periodePrefix}%`).first();
  
  const cutiTotal = quota?.jatah_cuti || 12;
  const izinTotal = quota?.jatah_izin || 0;
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      nama: targetNama, tahun: targetTahun,
      cuti: { total: cutiTotal, used: cutiUsed?.cnt || 0, sisa: Math.max(0, cutiTotal - (cutiUsed?.cnt || 0)), status: attendanceQuotaStatus(cutiUsed?.cnt || 0, cutiTotal) },
      izin: { total: izinTotal, used: izinUsed?.cnt || 0, sisa: Math.max(0, izinTotal - (izinUsed?.cnt || 0)) },
      sakit: { used: sakitUsed?.cnt || 0 },
      hadir: hadirCount?.cnt || 0
    }
  });
});

// Helper functions
function attendanceStatusLabel(status: string): string {
  const labels: Record<string, string> = { hadir: 'Hadir', izin: 'Izin', cuti: 'Cuti', sakit: 'Sakit', lembur: 'Lembur', WFH: 'WFH' };
  return labels[status] || status;
}

function attendanceStatusColor(status: string): string {
  const colors: Record<string, string> = { hadir: '#4CAF50', izin: '#2196F3', cuti: '#FF9800', sakit: '#E91E63', lembur: '#9C27B0', WFH: '#00BCD4' };
  return colors[status] || '#757575';
}

function attendanceStatusIcon(status: string): string {
  const icons: Record<string, string> = { hadir: '✅', izin: '📝', cuti: '🏖️', sakit: '🤒', lembur: '⏰', WFH: '🏠' };
  return icons[status] || '❓';
}

function attendanceScheduledStatus(terjadwal: string): { label: string; color: string; icon: string } {
  return terjadwal === 'YA' ? { label: 'Terjadwal', color: '#2196F3', icon: '📅' } : { label: '', color: '', icon: '' };
}

function attendanceQuotaStatus(terpakai: number, jatah: number): { label: string; color: string; icon: string } {
  const sisa = jatah - terpakai;
  if (sisa <= 0) return { label: 'Habis', color: '#f44336', icon: '🔴' };
  if (sisa <= 2) return { label: 'Hampir Habis', color: '#FF9800', icon: '🟡' };
  return { label: 'Aman', color: '#4CAF50', icon: '🟢' };
}

function isWeekend_(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

function daysInMonth_(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function monthName_(month: number): string {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return months[month - 1] || '';
}

function periodFromDate(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function isAdmin(user: any): boolean {
  return user?.role === 'admin';
}

async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT v FROM settings WHERE k = ?').bind(key).first();
  return row?.v ?? null;
}