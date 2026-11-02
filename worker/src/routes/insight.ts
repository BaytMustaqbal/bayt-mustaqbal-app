import { Hono } from 'hono';
import { Env } from '../types/env';
import { computeInsight } from '../utils/insight';

export const insightRoutes = new Hono<{ Bindings: Env }>();

// GET /api/dash/insight — analitik & insight keluarga
insightRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const groupId = c.get('groupId');
  const insight = await computeInsight(c.env, groupId, userId);
  return c.json({ ok: true, data: insight, error: null });
});
