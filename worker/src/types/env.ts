import { Hono } from 'hono';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  FONNTE_TOKEN: string;
  FONNTE_TARGET: string;
  FONNTE_DEVICE: string;
  // OAuth Google Calendar (di-set via `wrangler secret put` / .dev.vars)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

// Module augmentation — REQUIRED for c.get('userId') to work
declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    role: string;
    // Grup keluarga (isolasi data antar-keluarga) + peran anggota (hak tulis)
    groupId: string | null;
    groupRole: string | null;
  }
}
