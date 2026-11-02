import { Env } from '../types/env';
import { groupScope } from './group';
import { readFonnteTarget } from './notif';

/**
 * Aturan otomatis keluarga ("jika-maka"). Disimpan di settings key "rules"
 * sebagai array JSON per grup. Dievaluasi cron harian; dedup per aturan per
 * bulan lewat notification_log.
 */

export interface Rule {
  id: string;
  name: string;
  type: 'category_threshold' | 'large_txn' | 'total_threshold' | 'bill_due';
  category?: string;
  threshold?: number;
  pct?: number; // untuk total_threshold: % pendapatan
  days?: number; // untuk bill_due: dalam N hari
  enabled?: boolean;
}

const monthPrefix = () => new Date().toISOString().slice(0, 7);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export async function readRules(env: Env, groupId: string | null, userId: string): Promise<Rule[]> {
  const row = (await env.DB.prepare(
    `SELECT value FROM settings WHERE key = 'rules' AND void IS NULL
     AND (group_id = ? OR (group_id IS NULL AND user_id = ?))
     ORDER BY updated_at DESC LIMIT 1`
  ).bind(groupId, userId).first()) as { value: string } | null;
  if (!row?.value) return [];
  try {
    const arr = JSON.parse(row.value);
    if (!Array.isArray(arr)) return [];
    return arr.filter((r: Rule) => r && r.type);
  } catch {
    return [];
  }
}

async function alreadyFired(env: Env, key: string): Promise<boolean> {
  const row = await env.DB.prepare('SELECT id FROM notification_log WHERE message = ? AND void IS NULL LIMIT 1').bind(key).first();
  return !!row;
}

async function markFired(env: Env, userId: string, key: string): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO notification_log (id, user_id, type, message, read, rev, created_at)
     VALUES (?, ?, 'info', ?, 0, 1, ?)`
  ).bind(id, userId, key, now).run();
}

export async function evaluateRules(env: Env, groupId: string | null, userId: string): Promise<void> {
  const rules = await readRules(env, groupId, userId);
  if (rules.length === 0) return;

  const scope = groupScope(groupId, userId);
  const m = monthPrefix();
  const mStart = `${m}-01`;
  const mEnd = `${m}-31`;
  const today = new Date().toISOString().slice(0, 10);
  const target = await readFonnteTarget(env);

  const outRows = await env.DB.prepare(
    `SELECT * FROM transactions WHERE ${scope.sql} AND type = 'out' AND void IS NULL AND date >= ? AND date <= ?`
  ).bind(scope.val, mStart, mEnd).all();
  const txns = outRows.results as any[];
  const totalExpense = txns.reduce((s, t) => s + num(t.amount), 0);

  const catSum: Record<string, number> = {};
  txns.forEach((t) => { catSum[t.category_id || 'lainnya'] = (catSum[t.category_id || 'lainnya'] || 0) + num(t.amount); });

  const bills = await env.DB.prepare(
    `SELECT id, name, due_date FROM bills WHERE user_id = ? AND void IS NULL AND status = 'unpaid' AND due_date >= ? AND due_date <= ?`
  ).bind(userId, today, mEnd).all();

  for (const rule of rules) {
    if (rule.enabled === false) continue;
    let triggered = false;
    let detail = '';

    if (rule.type === 'category_threshold') {
      const cat = rule.category || 'lainnya';
      if (num(catSum[cat]) >= num(rule.threshold)) {
        triggered = true;
        detail = `Kategori ${cat} mencapai Rp ${num(catSum[cat]).toLocaleString('id-ID')}`;
      }
    } else if (rule.type === 'large_txn') {
      const big = txns.find((t) => num(t.amount) >= num(rule.threshold));
      if (big) {
        triggered = true;
        detail = `Transaksi besar: Rp ${num(big.amount).toLocaleString('id-ID')} (${big.description || big.category_id})`;
      }
    } else if (rule.type === 'total_threshold') {
      const budgetRow = (await env.DB.prepare(
        `SELECT value FROM settings WHERE key = 'budget' AND void IS NULL
         AND (group_id = ? OR (group_id IS NULL AND user_id = ?))
         ORDER BY updated_at DESC LIMIT 1`
      ).bind(groupId, userId).first()) as { value: string } | null;
      let income = 0;
      if (budgetRow?.value) { try { income = num(JSON.parse(budgetRow.value).income); } catch { income = 0; } }
      const pct = num(rule.pct) || 90;
      if (income > 0 && totalExpense >= (income * pct) / 100) {
        triggered = true;
        detail = `Pengeluaran ${Math.round((totalExpense / income) * 100)}% dari pendapatan`;
      }
    } else if (rule.type === 'bill_due') {
      const days = num(rule.days) || 7;
      const due = new Date(today);
      due.setDate(due.getDate() + days);
      const dueStr = due.toISOString().slice(0, 10);
      const near = (bills.results as any[]).find((b) => b.due_date <= dueStr);
      if (near) {
        triggered = true;
        detail = `Tagihan "${near.name}" jatuh tempo ${near.due_date}`;
      }
    }

    if (!triggered) continue;
    const key = `rule_alert:${rule.id}:${m}`;
    if (await alreadyFired(env, key)) continue;

    const message = `⚙️ *Aturan: ${rule.name}*\n${detail}\n(periode ${m})`;
    // notifikasi in-app sudah tercatat sebagai dedup; WA dikirim terpisah
    await markFired(env, userId, key);
    if (target) {
      const { sendWA } = await import('./fonnte');
      await sendWA(env, message, target);
    }
  }
}
