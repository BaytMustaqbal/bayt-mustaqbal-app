import { Hono } from 'hono';
import { Env } from '../types/env';

export const dashRoutes = new Hono<{ Bindings: Env }>();

// GET /api/dash — dashboard summary (read-only, aggregated)
dashRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  // Total accounts balance
  const accountsResult = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ? AND void IS NULL'
  ).bind(userId).first() as any;

  // Recent transactions (last 5)
  const recentTxnResult = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE user_id = ? AND void IS NULL ORDER BY date DESC, created_at DESC LIMIT 5'
  ).bind(userId).all() as any;

  // Upcoming bills (due within 7 days, unpaid)
  const upcomingBillsResult = await c.env.DB.prepare(
    `SELECT * FROM bills WHERE user_id = ? AND void IS NULL AND status = 'unpaid' AND due_date >= date('now') AND due_date <= date('now', '+7 days') ORDER BY due_date ASC`
  ).bind(userId).all() as any;

  // Upcoming calendar events (next 7 days)
  const upcomingEventsResult = await c.env.DB.prepare(
    `SELECT * FROM calendar_events WHERE user_id = ? AND void IS NULL AND date >= date('now') AND date <= date('now', '+7 days') ORDER BY date ASC`
  ).bind(userId).all() as any;

  // Budget allocation summary (from transactions this month)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  const budgetResult = await c.env.DB.prepare(
    `SELECT type, COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE user_id = ? AND void IS NULL AND date >= ? AND date <= ?
     GROUP BY type`
  ).bind(userId, monthStart, monthEnd).all() as any;

  const budgetData = budgetResult?.results || [];
  const income = budgetData.find((r: any) => r.type === 'in')?.total || 0;
  const expense = budgetData.find((r: any) => r.type === 'out')?.total || 0;

  return c.json({
    ok: true,
    data: {
      total_balance: accountsResult?.total || 0,
      recent_transactions: recentTxnResult?.results || [],
      upcoming_bills: upcomingBillsResult?.results || [],
      upcoming_events: upcomingEventsResult?.results || [],
      monthly_summary: {
        income,
        expense,
        net: income - expense,
        month: monthStart.slice(0, 7), // YYYY-MM
      },
    },
    error: null,
  });
});

// GET /api/dash/:id — detail by module name (accounts, bills, events)
dashRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const module = c.req.param('id');

  let results: any = [];

  switch (module) {
    case 'accounts':
      const accRes = await c.env.DB.prepare(
        'SELECT * FROM accounts WHERE user_id = ? AND void IS NULL ORDER BY name ASC'
      ).bind(userId).all() as any;
      results = accRes?.results || [];
      break;

    case 'bills':
      const billRes = await c.env.DB.prepare(
        'SELECT * FROM bills WHERE user_id = ? AND void IS NULL AND status = "unpaid" ORDER BY due_date ASC'
      ).bind(userId).all() as any;
      results = billRes?.results || [];
      break;

    case 'events':
      const evtRes = await c.env.DB.prepare(
        'SELECT * FROM calendar_events WHERE user_id = ? AND void IS NULL AND date >= date("now") ORDER BY date ASC LIMIT 10'
      ).bind(userId).all() as any;
      results = evtRes?.results || [];
      break;

    default:
      return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: `Module tidak dikenal: ${module}. Pilihan: accounts, bills, events` } }, 400);
  }

  return c.json({ ok: true, data: { module, results }, error: null });
});
