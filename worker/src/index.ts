import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types/env';
import { authRoutes } from './routes/auth';
import { txnRoutes } from './routes/txn';
import { billRoutes } from './routes/bill';
import { categoriesRoutes } from './routes/categories';
import { settingsRoutes } from './routes/settings';
import { recRoutes } from './routes/rec';
import { attRoutes } from './routes/att';
import { calRoutes } from './routes/cal';
import { svcRoutes } from './routes/svc';
import { noteRoutes } from './routes/note';
import { reviewRoutes } from './routes/review';
import { dashRoutes } from './routes/dash';
import { auditRoutes } from './routes/audit';
import { gcalRoutes } from './routes/gcal';
import { authMiddleware } from './middleware/auth';
import { handleCron } from './cron';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: 'https://app.baytmustaqbal.my.id',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Auth middleware for all /api/* MUST be registered BEFORE routes
// (Hono v4: middleware registered after app.route() does not apply to those routes)
app.use('/api/*', authMiddleware);

// Mount auth routes AFTER middleware is registered
app.route('/api/auth', authRoutes);

// Mount CRUD module routes (protected by authMiddleware)
app.route('/api/txn', txnRoutes);
app.route('/api/bill', billRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/rec', recRoutes);
app.route('/api/att', attRoutes);
app.route('/api/cal', calRoutes);
app.route('/api/svc', svcRoutes);
app.route('/api/note', noteRoutes);
app.route('/api/review', reviewRoutes);
app.route('/api/dash', dashRoutes);
app.route('/api/audit', auditRoutes);
app.route('/api/gcal', gcalRoutes);

app.get('/', (c) => c.json({ ok: true, message: 'Bayt Mustaqbal API' }));

export default {
  fetch: app.fetch,
  scheduled: handleCron,
};
