import { Hono } from 'hono';
import { Env } from '../types/env';
import { groupScope } from '../utils/group';

export const auditRoutes = new Hono<{ Bindings: Env }>();

// GET /api/audit — list audit logs (read-only, append-only, scope grup)
auditRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const action = c.req.query('action');
  const tableName = c.req.query('table');
  const scope = groupScope(groupId, userId);

  let query = `SELECT * FROM audit_log WHERE ${scope.sql}`;
  const params: any[] = [scope.val];

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }
  if (tableName) {
    query += ' AND table_name = ?';
    params.push(tableName);
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const results = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ ok: true, data: results.results || [], error: null });
});

// GET /api/audit/:id — detail by id
auditRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const id = c.req.param('id');
  const scope = groupScope(groupId, userId);

  const result = await c.env.DB.prepare(
    `SELECT * FROM audit_log WHERE id = ? AND ${scope.sql}`
  ).bind(id, scope.val).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Audit log tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});
