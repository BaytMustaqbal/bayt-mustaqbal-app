// worker/src/routes/notes.ts
// Notes routes

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { generateId, now, writeAudit } from '../utils/db';
import type { Env } from '../types/env';

export const notesRoutes = new Hono<{ Bindings: Env }>();

notesRoutes.use('*', authMiddleware);

// GET /api/note/list
notesRoutes.get('/list', async (c) => {
  const user = c.get('user');
  const { kategori, pin, search, limit } = c.req.query();
  
  let where = 'WHERE n.void != "YA"';
  const params: any[] = [];
  
  if (kategori) { where += ' AND n.kategori = ?'; params.push(kategori); }
  if (pin !== undefined) { where += ' AND n.pin = ?'; params.push(pin); }
  if (search) {
    where += ' AND (n.judul LIKE ? OR n.isi LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM notes n
    ${where}
    ORDER BY n.pin DESC, n.dibuat_pada DESC
    ${limit ? 'LIMIT ' + limit : ''}
  `).bind(...params).all();
  
  const enriched = results.map(r => ({
    ...r,
    kategori_icon: noteCategoryIcon(r.kategori),
    kategori_color: noteCategoryColor(r.kategori),
    pin_label: r.pin === 'YA' ? '📌 Pinned' : '',
    pin_color: r.pin === 'YA' ? '#f44336' : '',
    pin_icon: r.pin === 'YA' ? '📌' : '',
    formatted_dibuat: formatDateTime(r.dibuat_pada),
    isi_preview: truncate(r.isi, 100)
  }));
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { data: enriched } });
});

// POST /api/note/create
notesRoutes.post('/create', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  if (!body.judul) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Judul wajib diisi' }}, 400);
  }
  
  const noteData = {
    note_id: generateId(),
    judul: body.judul,
    isi: body.isi || '',
    kategori: body.kategori || 'lainnya',
    pin: body.pin || 'TIDAK',
    void: 'TIDAK',
    dibuat_oleh: user.email,
    dibuat_pada: now(),
    diubah_oleh: user.email,
    diubah_pada: now(),
    rev: 1
  };
  
  await c.env.DB.prepare(`
    INSERT INTO notes (note_id, judul, isi, kategori, pin, void, dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, rev)
    VALUES (?, ?, ?, ?, ?, 'TIDAK', ?, ?, ?, ?, 1)
  `).bind(noteData.note_id, noteData.judul, noteData.isi, noteData.kategori, noteData.pin,
    user.email, now(), user.email, now()).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'create', entity: 'notes', entityId: noteData.note_id,
    ringkas: `Buat catatan: ${body.judul}`
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: noteData });
});

// PUT /api/note/update
notesRoutes.put('/update', async (c) => {
  const user = c.get('user');
  const { note_id, rev, ...data } = await c.req.json();
  
  if (!note_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'note_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM notes WHERE note_id = ?').bind(note_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Catatan tidak ditemukan' }}, 404);
  }
  
  const updates: string[] = [];
  const params: any[] = [];
  
  const allowed = ['judul', 'isi', 'kategori', 'pin'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  }
  
  if (updates.length === 0) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Tidak ada data yang diubah' }}, 400);
  }
  
  updates.push('diubah_oleh = ?', 'diubah_pada = ?', 'rev = rev + 1');
  params.push(user.email, now(), note_id, rev);
  
  await c.env.DB.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE note_id = ? AND rev = ?`).bind(...params).run();
  
  await writeAudit(c.env.DB, {
    email: user.email, role: user.role, aksi: 'update', entity: 'notes', entityId: note_id,
    ringkas: `Update catatan: ${data.judul || existing.judul}`, sebelum: existing, sesudah: data
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// DELETE /api/note/delete
notesRoutes.delete('/delete', async (c) => {
  const user = c.get('user');
  const { note_id, rev } = c.req.query();
  
  if (!note_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'note_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM notes WHERE note_id = ?').bind(note_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Catatan tidak ditemukan' }}, 404);
  }
  
  await c.env.DB.prepare('UPDATE notes SET void = "YA", rev = rev + 1 WHERE note_id = ? AND rev = ?').bind(note_id, rev).run();
  
  await writeAudit(c.env.DB, { email: user.email, role: user.role, aksi: 'delete', entity: 'notes', entityId: note_id, ringkas: `Hapus catatan: ${existing.judul}` });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// Helper functions
function noteCategoryIcon(kategori: string): string {
  const icons = { ide: '💡', resep: '📖', referensi: '🔗', lainnya: '📝' };
  return icons[kategori] || '📝';
}

function noteCategoryColor(kategori: string): string {
  const colors = { ide: '#4CAF50', resep: '#FF9800', referensi: '#2196F3', lainnya: '#9C27B0' };
  return colors[kategori] || '#757575';
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('id-ID', { 
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit' 
  });
}

function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.substring(0, max - 3) + '...' : str;
}