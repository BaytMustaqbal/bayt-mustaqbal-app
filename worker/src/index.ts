import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types/env';
import { authRoutes } from './routes/auth';
import { txnRoutes } from './routes/txn';
import { billRoutes } from './routes/bill';
import { categoriesRoutes } from './routes/categories';
import { settingsRoutes } from './routes/settings';
import { authMiddleware } from './middleware/auth';

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

app.get('/', (c) => c.json({ ok: true, message: 'Bayt Mustaqbal API' }));

export default app;
