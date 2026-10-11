// worker/src/routes/calendar.ts
// Calendar routes

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { generateId, now, writeAudit, getSetting } from '../utils/db';
import type { Env } from '../types/env';

export const calendarRoutes = new Hono<{ Bindings: Env }>();

calendarRoutes.use('*', authMiddleware);

// GET /api/cal/list
calendarRoutes.get('/list', async (c) => {
  const user = c.get('user');
  const { kategori, startDate, endDate, selesai, limit } = c.req.query();
  
  let where = 'WHERE e.void != "YA"';
  const params: any[] = [];
  
  if (kategori) { where += ' AND e.kategori = ?'; params.push(kategori); }
  if (startDate) { where += ' AND e.tanggal_selesai >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND e.tanggal_mulai <= ?'; params.push(endDate); }
  if (selesai !== undefined) { where += ' AND e.selesai = ?'; params.push(selesai); }
  
  if (user.role !== 'admin') {
    where += ' AND e.dibuat_oleh = ?';
    params.push(user.email);
  }
  
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM calendar_events e
    ${where}
    ORDER BY e.tanggal_mulai ASC
    ${limit ? 'LIMIT ' + limit : ''}
  `).bind(...params).all();
  
  const today = today_();
  const enriched = results.map(r => ({
    ...r,
    kategori_icon: eventCategoryIcon(r.kategori),
    kategori_color: eventCategoryColor(r.kategori),
    formatted_mulai: formatDate(r.tanggal_mulai),
    formatted_selesai: formatDate(r.tanggal_selesai),
    duration_days: daysBetween(r.tanggal_mulai, r.tanggal_selesai) + 1,
    is_multi_day: r.tanggal_mulai !== r.tanggal_selesai,
    is_past: r.tanggal_selesai < today_(),
    is_today: r.tanggal_mulai <= today_() && r.tanggal_selesai >= today_(),
    is_upcoming: r.tanggal_mulai > today_(),
    selesai_label: r.selesai === 'YA' ? 'Selesai' : 'Belum',
    selesai_color: r.selesai === 'YA' ? '#4CAF50' : '#FF9800',
    selesai_icon: r.selesai === 'YA' ? '✅' : '⏳',
    prioritas_icon: priorityIcon(r.prioritas),
    formatted_biaya: formatRupiah(r.biaya_rencana || 0)
  }));
  
  // Group by date
  const byDate: Record<string, any[]> = {};
  enriched.forEach(e => {
    if (!byDate[e.tanggal_mulai]) byDate[e.tanggal_mulai] = [];
    byDate[e.tanggal_mulai].push(e);
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { data: enriched, by_date: byDate } });
});

// POST /api/cal/create
calendarRoutes.post('/create', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  const required = ['judul', 'kategori', 'tanggal_mulai'];
  for (const field of required) {
    if (!body[field]) {
      return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: `${field} wajib diisi` }}, 400);
    }
  }
  
  if (body.tanggal_selesai && body.tanggal_selesai < body.tanggal_mulai) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }}, 400);
  }
  
  if (body.jam_mulai && body.jam_selesai && body.jam_selesai <= body.jam_mulai) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Jam selesai harus setelah jam mulai' }}, 400);
  }
  
  const eventData = {
    event_id: generateId(),
    judul: body.judul, kategori: body.kategori,
    tanggal_mulai: body.tanggal_mulai,
    tanggal_selesai: body.tanggal_selesai || body.tanggal_mulai,
    jam_mulai: body.jam_mulai || '', jam_selesai: body.jam_selesai || '',
    lokasi: body.lokasi || '', deskripsi: body.deskripsi || '',
    biaya_rencana: Number(body.biaya_rencana) || 0,
    all_day: body.all_day || 'YA',
    reminder_hari: Number(body.reminder_hari) || 1,
    reminder_email: body.reminder_email || 'TIDAK',
    selesai: 'TIDAK', rec_id: body.rec_id || '',
    prioritas: body.prioritas || 'normal',
    void: 'TIDAK',
    dibuat_oleh: user.email, dibuat_pada: now(),
    diubah_oleh: user.email, diubah_pada: now(), rev: 1
  };
  
  await c.env.DB.prepare(`
    INSERT INTO calendar_events (
      event_id, judul, kategori, tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai,
      lokasi, deskripsi, biaya_rencana, all_day, reminder_hari, reminder_email,
      selesai, rec_id, prioritas, void, dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, rev
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'TIDAK', ?, ?, ?, 1)
  `).bind(
    eventData.event_id, eventData.judul, eventData.kategori, eventData.tanggal_mulai,
    eventData.tanggal_selesai, eventData.jam_mulai, eventData.jam_selesai,
    eventData.lokasi, eventData.deskripsi, eventData.biaya_rencana, eventData.all_day,
    eventData.reminder_hari, eventData.reminder_email, eventData.selesai, eventData.rec_id,
    eventData.prioritas, user.email, now(), user.email, now()
  ).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'create', entity: 'calendar_events', entityId: eventData.event_id,
    ringkas: `Buat acara: ${body.judul} (${body.kategori})`
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: eventData });
});

// PUT /api/cal/update
calendarRoutes.put('/update', async (c) => {
  const user = c.get('user');
  const { event_id, rev, ...data } = await c.req.json();
  
  if (!event_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'event_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM calendar_events WHERE event_id = ?').bind(event_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Acara tidak ditemukan' }}, 404);
  }
  
  // Validate dates
  const mulai = data.tanggal_mulai || existing.tanggal_mulai;
  const selesai = data.tanggal_selesai || existing.tanggal_selesai;
  if (selesai < mulai) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }}, 400);
  }
  
  if (data.jam_mulai && data.jam_selesai && data.jam_selesai <= data.jam_mulai) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Jam selesai harus setelah jam mulai' }}, 400);
  }
  
  const updates: string[] = [];
  const params: any[] = [];
  
  const allowed = ['judul', 'kategori', 'tanggal_mulai', 'tanggal_selesai', 'jam_mulai', 'jam_selesai', 'lokasi', 'deskripsi', 'biaya_rencana', 'all_day', 'reminder_hari', 'reminder_email', 'selesai', 'prioritas', 'rec_id'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(field === 'biaya_rencana' || field === 'reminder_hari' ? Number(data[field]) : data[field]);
    }
  }
  
  if (updates.length === 0) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Tidak ada data yang diubah' }}, 400);
  }
  
  updates.push('diubah_oleh = ?', 'diubah_pada = ?', 'rev = rev + 1');
  params.push(user.email, now(), event_id, rev);
  
  await c.env.DB.prepare(`UPDATE calendar_events SET ${updates.join(', ')} WHERE event_id = ? AND rev = ?`).bind(...params).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'update', entity: 'calendar_events', entityId: event_id,
    ringkas: `Update acara: ${data.judul || existing.judul}`, sebelum: existing, sesudah: data
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// DELETE /api/cal/delete
calendarRoutes.delete('/delete', async (c) => {
  const user = c.get('user');
  const { event_id, rev } = c.req.query();
  
  if (!event_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'event_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM calendar_events WHERE event_id = ?').bind(event_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Acara tidak ditemukan' }}, 404);
  }
  
  await c.env.DB.prepare('UPDATE calendar_events SET void = "YA", rev = rev + 1 WHERE event_id = ? AND rev = ?').bind(event_id, rev).run();
  
  await writeAudit(c.env.DB, { email: user.email, role: user.role, aksi: 'delete', entity: 'calendar_events', entityId: event_id, ringkas: `Hapus acara: ${existing.judul}` });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// PUT /api/cal/toggle_done
calendarRoutes.put('/toggle_done', async (c) => {
  const user = c.get('user');
  const { event_id, rev, selesai } = await c.req.json();
  
  if (!event_id || !rev || selesai === undefined) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'event_id, rev, selesai wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM calendar_events WHERE event_id = ?').bind(event_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Acara tidak ditemukan' }}, 404);
  }
  
  const newSelesai = selesai ? 'YA' : 'TIDAK';
  await c.env.DB.prepare('UPDATE calendar_events SET selesai = ?, diubah_oleh = ?, diubah_pada = ?, rev = rev + 1 WHERE event_id = ? AND rev = ?').bind(newSelesai, user.email, now(), event_id, rev).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'update', entity: 'calendar_events', entityId: event_id,
    ringkas: `${newSelesai === 'YA' ? 'Selesai' : 'Buka kembali'} acara: ${existing.judul}`, sebelum: existing, sesudah: { ...existing, selesai: newSelesai }
  });
  
  // Suggest transaction if biaya_rencana > 0 and selesai = YA
  let suggestTxn = false;
  if (newSelesai === 'YA' && Number(existing.biaya_rencana) > 0) {
    suggestTxn = true;
  }
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true, _suggest_txn: suggestTxn } });
});

// Helper functions
function eventCategoryIcon(kategori: string): string {
  const icons: Record<string, string> = { keluarga: '👨‍👩‍👧', liburan: '✈️', rencana: '📝', kerja: '💼', spiritual: '🕌', ultah: '🎂' };
  return icons[kategori] || '📅';
}

function eventCategoryColor(kategori: string): string {
  const colors: Record<string, string> = { keluarga: '#2196F3', liburan: '#4CAF50', rencana: '#FF9800', kerja: '#9C27B0', spiritual: '#00BCD4', ultah: '#E91E63' };
  return colors[kategori] || '#757575';
}

function priorityIcon(prioritas: string): string {
  const icons = { tinggi: '🔴', normal: '🟡', rendah: '🟢' };
  return icons[prioritas as keyof typeof icons] || '⚪';
}

function formatRupiah(num: number): string {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function daysBetween(d1: string, d2: string): number {
  return Math.floor((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function today_(): string {
  return new Date().toISOString().split('T')[0];
}