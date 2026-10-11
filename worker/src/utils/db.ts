// worker/src/utils/db.ts
// Database helpers for D1

import type { Env } from '../types/env';

// ============================================================
//  Query Builders
// ============================================================
export function buildWhere(filters: Record<string, any>): { sql: string; params: any[] } {
  const clauses: string[] = [];
  const params: any[] = [];
  
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        clauses.push(`${key} IN (${value.map(() => '?').join(',')})`);
        params.push(...value);
      }
    } else {
      clauses.push(`${key} = ?`);
      params.push(value);
    }
  }
  
  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params
  };
}

export function buildOrderBy(sortBy?: string, sortDir: 'asc' | 'desc' = 'desc'): string {
  if (!sortBy) return '';
  const dir = sortDir === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${sortBy} ${dir}`;
}

export function buildPagination(page = 1, pageSize = 50): { sql: string; params: any[] } {
  const offset = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, pageSize));
  return { sql: 'LIMIT ? OFFSET ?', params: [pageSize, offset] };
}

// ============================================================
//  Common Queries
// ============================================================
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT v FROM settings WHERE k = ?').bind(key).first();
  return row?.v ?? null;
}

export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db.prepare(`
    INSERT INTO settings (k, v) VALUES (?, ?)
    ON CONFLICT(k) DO UPDATE SET v = excluded.v
  `).bind(key, value).run();
}

export async function getUserByEmail(db: D1Database, email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ? AND aktif = "YA"').bind(email.toLowerCase()).first();
}

export async function getCategory(db: D1Database, categoryId: string) {
  return db.prepare('SELECT * FROM categories WHERE category_id = ? AND aktif = "YA"').bind(categoryId).first();
}

export async function getAccount(db: D1Database, accountId: string) {
  return db.prepare('SELECT * FROM accounts WHERE account_id = ? AND aktif = "YA"').bind(accountId).first();
}

export async function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function now(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================
//  Audit Log Helper
// ============================================================
export interface AuditData {
  email: string;
  role: string;
  aksi: string;
  entity: string;
  entityId: string;
  ringkas: string;
  sebelum?: any;
  sesudah?: any;
}

export async function writeAudit(db: D1Database, data: AuditData): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO audit_log (log_id, waktu, email, role, aksi, entity, entity_id, ringkas, sebelum, sesudah)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      new Date().toISOString(),
      data.email,
      data.role,
      data.aksi,
      data.entity,
      data.entityId,
      data.ringkas,
      data.sebelum ? JSON.stringify(data.sebelum) : null,
      data.sesudah ? JSON.stringify(data.sesudah) : null
    ).run();
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

export async function writeNotifLog(db: D1Database, data: {
  tipe: string;
  periode: string;
  penerima: string;
  status: 'terkirim' | 'gagal';
  pesan: string;
  error?: string;
}): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO notification_log (notif_id, waktu, tipe, periode, penerima, status, pesan, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      new Date().toISOString(),
      data.tipe,
      data.periode,
      data.penerima,
      data.status,
      data.pesan,
      data.error ?? null
    ).run();
  } catch (e) {
    console.error('Notif log error:', e);
  }
}

// ============================================================
//  Fonnte Helper
// ============================================================
export async function sendFonnteWA(env: Env, message: string, target?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = await getSetting(env.DB, 'fonnte_token') || env.FONNTE_TOKEN;
  const device = await getSetting(env.DB, 'fonnte_device') || env.FONNTE_DEVICE || 'default';
  const to = target || (await getSetting(env.DB, 'fonnte_target')) || env.FONNTE_TARGET;
  
  if (!token || !to) {
    return { success: false, error: 'Fonnte token atau target belum diset' };
  }
  
  try {
    const payload = { target: to, message, device };
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (!result.status) {
      return { success: false, error: result.reason || 'Fonnte gagal' };
    }
    
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}