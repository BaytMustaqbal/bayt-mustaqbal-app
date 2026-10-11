// worker/src/routes/review.ts
// Review routes

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getCurrentPeriod, formatRupiah, formatPeriod, formatDate, daysBetween_, daysInMonth_, sumBy_, groupBy_, parsePeriod_, formatPeriod_ } from '../utils/db';
import type { Env } from '../types/env';

export const reviewRoutes = new Hono<{ Bindings: Env }>();

reviewRoutes.use('*', authMiddleware);

// GET /api/review/monthly
reviewRoutes.get('/monthly', async (c) => {
  const user = c.get('user');
  const { periode } = c.req.query();
  const targetPeriode = periode || getCurrentPeriod();
  
  // User filter for non-admin
  const userFilter = user.role !== 'admin' ? `AND t.dibuat_oleh = '${user.email}'` : '';
  
  const txns = await c.env.DB.prepare(`
    SELECT * FROM transactions WHERE periode = ? ${userFilter}
  `).bind(targetPeriode).all();
  
  const categories = await c.env.DB.prepare('SELECT * FROM categories').all();
  const catMap: Record<string, any> = {};
  categories.results.forEach(c => catMap[c.category_id] = c);
  
  const income = txns.results.filter(t => t.tipe === 'income');
  const expense = txns.results.filter(t => t.tipe === 'expense');
  
  const totalIncome = sumBy_(income, 'jumlah');
  const totalExpense = sumBy_(expense, 'jumlah');
  const net = totalIncome - totalExpense;
  
  // By category
  const byCategory: Record<string, any> = {};
  expense.forEach(t => {
    const cat = catMap[t.kategori_id];
    if (!cat) return;
    if (!byCategory[cat.nama]) {
      byCategory[cat.nama] = { kategori_id: t.kategori_id, nama: cat.nama, warna: cat.warna, budget: Number(cat.budget_bulanan) || 0, total: 0, count: 0 };
    }
    byCategory[cat.nama].total += Number(t.jumlah);
    byCategory[cat.nama].count++;
  });
  
  const categoryList = Object.values(byCategory).map(c => {
    const bs = budgetStatus(c.total, c.budget);
    return {
      ...c,
      sisa: c.budget - c.total,
      persen: c.budget > 0 ? Math.round((c.total / c.budget) * 100) : 0,
      status: bs.label,
      color: bs.color,
      icon: bs.icon
    };
  }).sort((a, b) => b.total - a.total);
  
  // By scope
  const byScope: Record<string, any> = {};
  ['pribadi', 'keluarga', 'usaha'].forEach(s => {
    const scopeTxns = expense.filter(t => t.scope === s);
    byScope[s] = { total: sumBy_(scopeTxns, 'jumlah'), count: scopeTxns.length, icon: scopeIcon(s), color: scopeColor(s) };
  });
  
  // By method
  const byMethod: Record<string, any> = {};
  ['tunai', 'transfer', 'debit', 'kredit', 'ewallet'].forEach(m => {
    const mTxns = expense.filter(t => t.metode === m);
    byMethod[m] = { total: sumBy_(mTxns, 'jumlah'), count: mTxns.length, icon: methodIcon(m) };
  });
  
  // Top 5 expense
  const top5 = [...expense].sort((a, b) => Number(b.jumlah) - Number(a.jumlah)).slice(0, 5).map(t => ({
    txn_id: t.txn_id, tanggal: t.tanggal, kategori: catMap[t.kategori_id]?.nama || t.kategori_nama,
    jumlah: t.jumlah, keterangan: t.keterangan, formatted: formatRupiah(t.jumlah)
  }));
  
  // Busiest day
  const byDay: Record<string, number> = {};
  expense.forEach(t => { if (!byDay[t.tanggal]) byDay[t.tanggal] = 0; byDay[t.tanggal] += Number(t.jumlah); });
  const busiestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  
  // Prediction
  const today = today_();
  const dayOfMonth = new Date().getDate();
  const daysInMonth = daysInMonth_(new Date().getFullYear(), new Date().getMonth() + 1);
  const remainingDays = daysInMonth - dayOfMonth + 1;
  const avgDaily = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;
  const predictedTotal = totalExpense + (avgDaily * remainingDays);
  const totalBudget = sumBy_(categories.results.filter(c => c.tipe === 'expense'), 'budget_bulanan');
  const predictedOver = totalBudget > 0 && predictedTotal > totalBudget;
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      periode: targetPeriode,
      periode_label: formatPeriod(targetPeriode),
      total_income: totalIncome, total_expense: totalExpense, net: net,
      formatted: { total_income: formatRupiah(totalIncome), total_expense: formatRupiah(totalExpense), net: formatRupiah(net) },
      by_category: categoryList,
      by_scope: byScope, by_method: byMethod, top5_expense: top5,
      busiest_day: { date: busiestDay[0], total: busiestDay[1], formatted: formatRupiah(busiestDay[1]) },
      prediction: {
        avg_daily: Math.round(avgDaily), remaining_days: remainingDays,
        predicted_total: Math.round(predictedTotal), total_budget: totalBudget,
        will_over_budget: predictedOver,
        daily_budget_left: remainingDays > 0 ? Math.round((totalBudget - totalExpense) / remainingDays) : 0
      }
    }
  });
});

// GET /api/review/compare
reviewRoutes.get('/compare', async (c) => {
  const { periode } = c.req.query();
  const current = periode || getCurrentPeriod();
  const { year, month } = parsePeriod_(current);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevPeriode = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
  
  const currData = await c.env.DB.prepare('SELECT * FROM transactions WHERE periode = ?').bind(current).all();
  const prevData = await c.env.DB.prepare('SELECT * FROM transactions WHERE periode = ?').bind(prevPeriode).all();
  
  const currIncome = sumBy_(currData.results.filter(t => t.tipe === 'income'), 'jumlah');
  const currExpense = sumBy_(currData.results.filter(t => t.tipe === 'expense'), 'jumlah');
  const prevIncome = sumBy_(prevData.results.filter(t => t.tipe === 'income'), 'jumlah');
  const prevExpense = sumBy_(prevData.results.filter(t => t.tipe === 'expense'), 'jumlah');
  
  const categories = await c.env.DB.prepare('SELECT * FROM categories').all();
  const catMap: Record<string, any> = {}; categories.results.forEach(c => catMap[c.category_id] = c);
  
  const allCats = new Set([...currData.results.map(t => t.kategori_id), ...prevData.results.map(t => t.kategori_id)]);
  
  const categoryCompare = Array.from(allCats).map(id => {
    const cat = catMap[id];
    if (!cat) return null;
    const currTotal = sumBy_(currData.results.filter(t => t.kategori_id === id && t.tipe === 'expense'), 'jumlah');
    const prevTotal = sumBy_(prevData.results.filter(t => t.kategori_id === id && t.tipe === 'expense'), 'jumlah');
    const diff = currTotal - prevTotal;
    const pct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 0;
    return { nama: cat.nama, current: currTotal, previous: prevTotal, diff, pct, trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
  }).filter(Boolean).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      current_periode: current, previous_periode: prevPeriode,
      income: { current: currIncome, previous: prevIncome, diff: currIncome - prevIncome },
      expense: { current: currExpense, previous: prevExpense, diff: currExpense - prevExpense },
      net: { current: currIncome - currExpense, previous: prevIncome - prevExpense, diff: (currIncome - currExpense) - (prevIncome - prevExpense) },
      by_category: categoryCompare
    }
  });
});

// GET /api/review/by_category
reviewRoutes.get('/by_category', async (c) => {
  const { periode, kategori_id } = c.req.query();
  const targetPeriode = periode || getCurrentPeriod();
  
  if (!kategori_id) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'kategori_id wajib' }}, 400);
  }
  
  const cat = await c.env.DB.prepare('SELECT * FROM categories WHERE category_id = ?').bind(kategori_id).first();
  if (!cat) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' }}, 404);
  }
  
  const txns = await c.env.DB.prepare(`
    SELECT * FROM transactions WHERE periode = ? AND kategori_id = ? AND tipe = 'expense'
    ORDER BY tanggal DESC
  `).bind(targetPeriode, kategori_id).all();
  
  const total = sumBy_(txns.results, 'jumlah');
  const budget = Number(cat.budget_bulanan) || 0;
  const bs = budgetStatus(total, budget);
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      kategori: cat, periode: targetPeriode,
      total, budget, sisa: budget - total,
      persen: budget > 0 ? Math.round((total / budget) * 100) : 0,
      status: bs.label, color: bs.color,
      transactions: txns.results.map(t => ({
        txn_id: t.txn_id, tanggal: t.tanggal, formatted_tanggal: formatDate(t.tanggal),
        jumlah: t.jumlah, formatted_jumlah: formatRupiah(t.jumlah),
        keterangan: t.keterangan, metode: t.metode, scope: t.scope
      }))
    }
  });
});

// GET /api/review/trend
reviewRoutes.get('/trend', async (c) => {
  const { months } = c.req.query();
  const count = parseInt(months) || 12;
  
  const { year, month } = parsePeriod_(getCurrentPeriod());
  const labels: string[] = [];
  const incomeData: number[] = [];
  const expenseData: number[] = [];
  const netData: number[] = [];
  
  for (let i = count - 1; i >= 0; i--) {
    const m = month - i;
    const y = year + Math.floor((m - 1) / 12);
    const mm = ((m - 1) % 12) + 1;
    const periode = `${y}-${String(mm).padStart(2, '0')}`;
    
    labels.push(monthName_(mm) + ' ' + y);
    
    const txns = await c.env.DB.prepare('SELECT * FROM transactions WHERE periode = ?').bind(periode).all();
    const inc = sumBy_(txns.results.filter(t => t.tipe === 'income'), 'jumlah');
    const exp = sumBy_(txns.results.filter(t => t.tipe === 'expense'), 'jumlah');
    
    incomeData.push(inc); expenseData.push(exp); netData.push(inc - exp);
  }
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      labels,
      datasets: [
        { label: 'Pemasukan', data: incomeData, color: '#4CAF50' },
        { label: 'Pengeluaran', data: expenseData, color: '#f44336' },
        { label: 'Selisih', data: netData, color: '#2196F3' }
      ]
    }
  });
});

// Helper functions (duplicated from utils/db.ts for standalone)
function sumBy_(arr: any[], key: string): number {
  return arr.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
}

function parsePeriod_(period: string): { year: number; month: number } {
  const [y, m] = period.split('-').map(Number);
  return { year: y, month: m };
}

function formatPeriod_(period: string): string {
  const { year, month } = parsePeriod_(period);
  return monthName_(month) + ' ' + year;
}

function formatRupiah(num: number): string {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function monthName_(month: number): string {
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return months[month - 1] || '';
}

function scopeIcon(scope: string): string {
  const icons = { pribadi: '👤', keluarga: '👨‍👩‍👧', usaha: '🏪' };
  return icons[scope] || '📁';
}

function scopeColor(scope: string): string {
  const colors = { pribadi: '#9C27B0', keluarga: '#2196F3', usaha: '#FF9800' };
  return colors[scope] || '#757575';
}

function methodIcon(metode: string): string {
  const icons = { tunai: '💵', transfer: '🏦', debit: '💳', kredit: '💳', ewallet: '📱' };
  return icons[metode] || '💰';
}

function budgetStatus(realisasi: number, budget: number): { label: string; color: string; icon: string } {
  if (budget === 0) return { label: 'Tanpa Budget', color: '#757575', icon: '⚪' };
  const pct = (realisasi / budget) * 100;
  if (pct >= 100) return { label: 'Over Budget', color: '#f44336', icon: '🔴' };
  if (pct >= 80) return { label: 'Hampir Habis', color: '#FF9800', icon: '🟡' };
  return { label: 'Aman', color: '#4CAF50', icon: '🟢' };
}

function getCurrentPeriod(): string {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function today_(): string {
  return new Date().toISOString().split('T')[0];
}

function daysInMonth_(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}