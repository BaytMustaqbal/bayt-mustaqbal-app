import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types/env';
import { authRoutes } from './routes/auth';
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

app.get('/', (c) => c.json({ ok: true, message: 'Bayt Mustaqbal API' }));

export default app;
