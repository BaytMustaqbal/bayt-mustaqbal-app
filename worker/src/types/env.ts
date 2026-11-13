import { Hono } from 'hono';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  FONNTE_TOKEN: string;
  FONNTE_TARGET: string;
  FONNTE_DEVICE: string;
  // Secret bersama untuk verifikasi identitas dari album foto (Pages Functions).
  ALBUM_API_TOKEN?: string;
  // Token verifikasi webhook WA (Fonnte). Diletakkan di URL callback di dashboard
  // Fonnte, lalu dicocokkan di sini supaya hanya Fonnte yang bisa memanggil.
  FONNTE_WEBHOOK_TOKEN?: string;
  // OAuth Google Calendar (di-set via `wrangler secret put` / .dev.vars)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  // Web Push (VAPID)
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
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
