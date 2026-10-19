import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  FONNTE_TOKEN: string;
  FONNTE_TARGET: string;
  FONNTE_DEVICE: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: 'https://app.baytmustaqbal.my.id',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/', (c) => c.json({ ok: true, message: 'Bayt Mustaqbal API' }));

export default app;
