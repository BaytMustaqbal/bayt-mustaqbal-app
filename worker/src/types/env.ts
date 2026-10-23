import { Hono } from 'hono';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  FONNTE_TOKEN: string;
  FONNTE_TARGET: string;
  FONNTE_DEVICE: string;
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
