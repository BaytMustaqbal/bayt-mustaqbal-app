import { Hono } from 'hono';
import { Env } from '../types/env';

export const reviewRoutes = new Hono<{ Bindings: Env }>();

// GET /api/review — aggregated financial review (income, expense, net)
// Optional query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD
reviewRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const start = c.req.query('start');
  const end = c.req.query('end');

  let dateFilter = '';
  const params: any[] = [userId];

  if (start && end) {
    dateFilter = ' AND date BETWEEN ? AND ?';
    params.push(start, end);
  } else if (start) {
    dateFilter = ' AND date >= ?';
    params.push(start);
  } else if (end) {
    dateFilter = ' AND date <= ?';
    params.push(end);
  }

  // Total income (type = 'in')
  const incomeResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'in' AND void IS NULL${dateFilter}`
  ).bind(...params).first() as any;

  // Total expense (type = 'out')
  const expenseResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'out' AND void IS NULL${dateFilter}`
  ).bind(...params).first() as any;

  const totalIncome = incomeResult?.total || 0;
  const totalExpense = expenseResult?.total || 0;
  const netBalance = totalIncome - totalExpense;

  // Income by category
  const byCategoryResult = await c.env.DB.prepare(
    `SELECT c.name as category, t.type, SUM(t.amount) as total
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = ? AND t.void IS NULL${dateFilter}
     GROUP BY t.type, c.name
     ORDER BY t.type, total DESC`
  ).bind(...params).all() as any;

  const byCategory = byCategoryResult?.results || [];

  // Recent transactions (last 10)
  const recentResult = await c.env.DB.prepare(
    `SELECT * FROM transactions WHERE user_id = ? AND void IS NULL${dateFilter} ORDER BY date DESC, created_at DESC LIMIT 10`
  ).bind(...params).all() as any;

  const recent = recentResult?.results || [];

  return c.json({
    ok: true,
    data: {
      period: { start: start || null, end: end || null },
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_balance: netBalance,
      },
      by_category: byCategory,
      recent_transactions: recent,
    },
    error: null,
  });
});

// GET /api/review/:id — detail a specific transaction
reviewRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ? AND void IS NULL'
  ).bind(id, userId).first() as any;

  if (!result) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Transaction tidak ditemukan' } }, 404);
  }

  return c.json({ ok: true, data: result, error: null });
});
