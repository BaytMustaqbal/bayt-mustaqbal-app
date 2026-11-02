import { Hono } from 'hono';
import { Env } from '../types/env';
import { groupScope, forbiddenWrite } from '../utils/group';

/**
 * Data & cadangan keluarga. Export mengumpulkan seluruh data milik grup
 * (atau user bila belum ada grup) jadi satu JSON; import memulihkannya.
 *
 * Dibatasi untuk kepala keluarga (groupRole = kepala_keluarga) karena
 * menyangkut seluruh data keluarga.
 */

export const backupRoutes = new Hono<{ Bindings: Env }>();

function hasScope(groupRole: string | null): boolean {
  return groupRole === 'kepala_keluarga';
}

const TABLES = ['transactions', 'calendar_events', 'notes', 'family_moments', 'settings'];

// GET /api/backup/export
backupRoutes.get('/export', async (c) => {
  if (!hasScope(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);

  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const hasGroupCol = t === 'transactions' || t === 'calendar_events' || t === 'notes' || t === 'family_moments' || t === 'settings';
    const sql = hasGroupCol
      ? `SELECT * FROM ${t} WHERE ${scope.sql} AND void IS NULL`
      : `SELECT * FROM ${t} WHERE user_id = ? AND void IS NULL`;
    const params = hasGroupCol ? [scope.val] : [userId];
    try {
      const rows = await c.env.DB.prepare(sql).bind(...params).all();
      data[t] = rows.results || [];
    } catch (e) {
      data[t] = [];
    }
  }

  return c.json({
    ok: true,
    data: {
      exported_at: new Date().toISOString(),
      app: 'bayt-mustaqbal',
      scope_id: groupId || userId,
      data,
    },
    error: null,
  });
});

// POST /api/backup/import — timpa seluruh data grup dari cadangan.
backupRoutes.post('/import', async (c) => {
  if (!hasScope(c.get('groupRole'))) {
    return c.json(forbiddenWrite(), 403);
  }
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const scope = groupScope(groupId, userId);

  const body = await c.req.json().catch(() => null) as {
    data?: Record<string, unknown[]>;
  } | null;
  if (!body?.data) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Format backup tidak valid' } }, 400);
  }

  // Hapus data lama milik scope ini (soft-delete).
  const now = new Date().toISOString();
  for (const t of TABLES) {
    try {
      const hasGroupCol = t === 'transactions' || t === 'calendar_events' || t === 'notes' || t === 'family_moments' || t === 'settings';
      const sql = hasGroupCol
        ? `UPDATE ${t} SET void = ? WHERE ${scope.sql} AND void IS NULL`
        : `UPDATE ${t} SET void = ? WHERE user_id = ? AND void IS NULL`;
      const params = hasGroupCol ? [now, scope.val] : [now, userId];
      await c.env.DB.prepare(sql).bind(...params).run();
    } catch (e) {
      /* tabel mungkin belum ada — abaikan */
    }
  }

  // Sisipkan ulang data backup (pertahankan kolom yang ada).
  let restored = 0;
  for (const t of TABLES) {
    const rows = body.data[t] || [];
    for (const row of rows as Record<string, unknown>[]) {
      const keys = Object.keys(row).filter((k) => row[k] !== undefined);
      const cols = keys.join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((k) => {
        const v = row[k];
        if (typeof v === 'boolean') return v ? 1 : 0;
        return v;
      });
      try {
        await c.env.DB.prepare(`INSERT OR IGNORE INTO ${t} (${cols}) VALUES (${placeholders})`).bind(...values).run();
        restored++;
      } catch (e) {
        /* baris gagal sisip (kolom beda) — lewati */
      }
    }
  }

  return c.json({ ok: true, data: { restored, tables: TABLES }, error: null });
});
