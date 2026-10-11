// worker/src/index.ts
// Main entry point for Cloudflare Worker

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { txnRoutes } from './routes/transactions';
import { billRoutes } from './routes/bills';
import { recurringRoutes } from './routes/recurring';
import { categoryRoutes } from './routes/categories';
import { attendanceRoutes } from './routes/attendance';
import { calendarRoutes } from './routes/calendar';
import { serviceRoutes } from './routes/service';
import { notesRoutes } from './routes/notes';
import { reviewRoutes } from './routes/review';
import { dashboardRoutes } from './routes/dashboard';
import { settingsRoutes } from './routes/settings';
import { notifRoutes } from './routes/notif';
import type { Env } from './types/env';

export const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', cors({
  origin: ['https://app.baytmustaqbal.my.id', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400
}));

// Health check
app.get('/health', (c) => c.json({ ok: true, service: 'bayt-mustaqbal-api', time: new Date().toISOString() }));

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/txn', txnRoutes);
app.route('/api/bill', billRoutes);
app.route('/api/rec', recurringRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/att', attendanceRoutes);
app.route('/api/cal', calendarRoutes);
app.route('/api/svc', serviceRoutes);
app.route('/api/note', notesRoutes);
app.route('/api/review', reviewRoutes);
app.route('/api/dash', dashboardRoutes);
app.route('/api/cfg', settingsRoutes);
app.route('/api/notif', notifRoutes);

// 404 handler
app.notFound((c) => c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' }}, 404));

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ ok: false, error: { code: 'SERVER', message: 'Terjadi kesalahan server' }}, 500);
});

// ============================================================
//  Scheduled Handlers (Cron Triggers)
// ============================================================
export default {
  fetch: app.fetch,
  scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    console.log(`Cron triggered: ${event.cron} at ${new Date().toISOString()}`);
    
    // Import cron handlers dynamically to avoid circular deps
    const { handleDailyDigest, handleBillReminders, handleMonthlyGenerate } = await import('./cron');
    
    try {
      if (event.cron === '0 7 * * *') {
        await handleDailyDigest(env);
      } else if (event.cron === '0 * * * *') {
        await handleBillReminders(env);
      } else if (event.cron === '30 0 1 * *') {
        await handleMonthlyGenerate(env);
      }
    } catch (err) {
      console.error(`Cron ${event.cron} error:`, err);
    }
  }
} satisfies ExportedHandler<Env>;