import { Env } from '../types/env';
import { groupScope } from './group';

/**
 * Analitik & insight keluarga. Semua query berbasis scope grup (groupScope),
 * konsisten dengan route data lain.
 */

// Pemetaan kategori pengeluaran -> keranjang (sama dengan frontend categories.js)
const CATEGORY_BUCKET: Record<string, string> = {
  belanja: 'needs',
  utilitas: 'needs',
  pendidikan: 'needs',
  transportasi: 'needs',
  kesehatan: 'needs',
  ibadah: 'needs',
  rumah: 'needs',
  hiburan: 'wants',
  tabungan: 'savings',
};
const DEFAULT_BUCKET = 'needs';
const bucketOf = (cat: string | null) => CATEGORY_BUCKET[cat || ''] || DEFAULT_BUCKET;

const monthPrefix = (offset = 0) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export interface InsightResult {
  month: string;
  totalExpense: number;
  prevTotalExpense: number;
  changePct: number | null;
  topCategories: { category: string; label: string; amount: number }[];
  anomalies: { id: string; category: string; description: string; amount: number; date: string }[];
  buckets: { id: string; alokasi: number; realisasi: number; pct: number }[];
}

/** Baca income + rasio dari settings budget. */
async function readBudget(env: Env, groupId: string | null, userId: string) {
  const row = (await env.DB.prepare(
    `SELECT value FROM settings WHERE key = 'budget' AND void IS NULL
     AND (group_id = ? OR (group_id IS NULL AND user_id = ?))
     ORDER BY updated_at DESC LIMIT 1`
  ).bind(groupId, userId).first()) as { value: string } | null;
  if (!row?.value) return { income: 0, ratios: { needs: 50, wants: 30, savings: 20 } };
  try {
    const p = JSON.parse(row.value);
    return {
      income: num(p.income),
      ratios: { needs: 50, wants: 30, savings: 20, ...(p.ratios || {}) },
    };
  } catch {
    return { income: 0, ratios: { needs: 50, wants: 30, savings: 20 } };
  }
}

export async function computeInsight(env: Env, groupId: string | null, userId: string): Promise<InsightResult> {
  const scope = groupScope(groupId, userId);
  const m = monthPrefix(0);
  const pm = monthPrefix(1);
  const mStart = `${m}-01`;
  const mEnd = `${m}-31`;
  const pmStart = `${pm}-01`;
  const pmEnd = `${pm}-31`;

  const outSql = `SELECT * FROM transactions WHERE ${scope.sql} AND type = 'out' AND void IS NULL AND date >= ? AND date <= ?`;
  const rows = await env.DB.prepare(outSql).bind(scope.val, mStart, mEnd).all();
  const txns = rows.results as any[];

  const totalExpense = txns.reduce((s, t) => s + num(t.amount), 0);

  const prev = await env.DB.prepare(outSql).bind(scope.val, pmStart, pmEnd).all();
  const prevTotalExpense = (prev.results as any[]).reduce((s, t) => s + num(t.amount), 0);

  const changePct = prevTotalExpense > 0
    ? Math.round(((totalExpense - prevTotalExpense) / prevTotalExpense) * 100)
    : null;

  // Kategori dominan
  const catSum: Record<string, number> = {};
  txns.forEach((t) => { catSum[t.category_id || 'lainnya'] = (catSum[t.category_id || 'lainnya'] || 0) + num(t.amount); });
  const cats = await env.DB.prepare('SELECT id, name FROM categories').all();
  const catNames: Record<string, string> = {};
  (cats.results as any[]).forEach((c) => { catNames[c.id] = c.name; });
  const topCategories = Object.entries(catSum)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, amount]) => ({ category, label: catNames[category] || category, amount }));

  // Anomali: transaksi > 3x rata-rata transaksi bulan ini
  const count = txns.length;
  const avg = count ? totalExpense / count : 0;
  const anomalies = txns
    .filter((t) => avg > 0 && num(t.amount) > avg * 3)
    .sort((a, b) => num(b.amount) - num(a.amount))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      category: t.category_id || 'lainnya',
      description: t.description || '',
      amount: num(t.amount),
      date: t.date,
    }));

  // Bucket realisasi vs alokasi
  const { income, ratios } = await readBudget(env, groupId, userId);
  const alloc: Record<string, number> = {
    needs: Math.round((income * num(ratios.needs)) / 100),
    wants: Math.round((income * num(ratios.wants)) / 100),
    savings: Math.round((income * num(ratios.savings)) / 100),
  };
  const rel: Record<string, number> = { needs: 0, wants: 0, savings: 0 };
  txns.forEach((t) => { rel[bucketOf(t.category_id)] += num(t.amount); });
  const buckets = (['needs', 'wants', 'savings'] as const).map((id) => ({
    id,
    alokasi: alloc[id],
    realisasi: rel[id],
    pct: alloc[id] > 0 ? Math.round((rel[id] / alloc[id]) * 100) : (rel[id] > 0 ? 999 : 0),
  }));

  return { month: m, totalExpense, prevTotalExpense, changePct, topCategories, anomalies, buckets };
}
