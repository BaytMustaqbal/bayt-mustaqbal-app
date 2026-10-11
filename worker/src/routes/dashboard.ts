// worker/src/routes/dashboard.ts
// Dashboard routes

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { today_, currentPeriod_, formatRupiah, formatDate, daysBetween_, daysInMonth_, sumBy_, formatPeriod_, getSetting, writeAudit } from '../utils/db';
import type { Env } from '../types/env';

export const dashboardRoutes = new Hono<{ Bindings: Env }>();

dashboardRoutes.use('*', authMiddleware);

// GET /api/dash/summary
dashboardRoutes.get('/summary', async (c) => {
  const user = c.get('user');
  const today = today_();
  const currentPeriod = currentPeriod_();
  
  // 1. Saldo per rekening
  const accounts = await c.env.DB.prepare('SELECT * FROM accounts WHERE aktif = "YA" ORDER BY urutan').all();
  const txnsThisMonth = await c.env.DB.prepare('SELECT * FROM transactions WHERE periode = ?').bind(currentPeriod).all();
  
  const accountBalances = accounts.results.map(acc => {
    const accTxns = txnsThisMonth.results.filter(t => t.account_id === acc.account_id);
    const income = sumBy_(accTxns.filter(t => t.tipe === 'income'), 'jumlah');
    const expense = sumBy_(accTxns.filter(t => t.tipe === 'expense'), 'jumlah');
    const saldo = (Number(acc.saldo_awal) || 0) + income - expense;
    
    return {
      account_id: acc.account_id, nama: acc.nama, tipe: acc.tipe,
      saldo_awal: Number(acc.saldo_awal) || 0, saldo, income, expense,
      icon: accountIcon(acc.tipe), status: saldo >= 0 ? 'success' : 'danger'
    };
  });
  
  const totalSaldo = sumBy_(accountBalances, 'saldo');
  const totalIncome = sumBy_(accountBalances, 'income');
  const totalExpense = sumBy_(accountBalances, 'expense');
  
  // 2. Budget vs Realisasi per kategori
  const categories = await c.env.DB.prepare('SELECT * FROM categories WHERE tipe = "expense" AND aktif = "YA" AND budget_bulanan > 0').all();
  const budgetData = categories.results.map(cat => {
    const catTxns = txnsThisMonth.results.filter(t => t.kategori_id === cat.category_id);
    const realisasi = sumBy_(catTxns, 'jumlah');
    const budget = Number(cat.budget_bulanan) || 0;
    const sisa = budget - realisasi;
    const pct = budget > 0 ? Math.round((realisasi / budget) * 100) : 0;
    const bs = budgetStatus(realisasi, budget);
    
    return {
      category_id: cat.category_id, nama: cat.nama, budget, realisasi, sisa, persen: pct,
      status: bs.label, color: bs.color, icon: bs.icon, warna_kategori: cat.warna
    };
  });
  
  // 3. Tagihan terdekat & terlambat
  const bills = await c.env.DB.prepare('SELECT * FROM bills WHERE status = "belum"').all();
  const lateBills = bills.results.filter(b => b.jatuh_tempo < today_)
    .sort((a, b) => a.jatuh_tempo.localeCompare(b.jatuh_tempo))
    .slice(0, 5);
    
  const upcomingBills = bills.results.filter(b => b.jatuh_tempo >= today_)
    .sort((a, b) => a.jatuh_tempo.localeCompare(b.jatuh_tempo))
    .slice(0, 5);
  
  // 4. Agenda 7 hari
  const events = await c.env.DB.prepare(`
    SELECT * FROM calendar_events 
    WHERE tanggal_mulai >= ? AND tanggal_mulai <= date(?, '+1 month')
    ORDER BY tanggal_mulai
  `).bind(today_, today_).all();
  
  // 5. Absensi hari ini
  const todayAtt = await c.env.DB.prepare('SELECT * FROM attendance WHERE tanggal = ? AND nama = ?').bind(today_, user.nama).first();
  
  // 6. Sisa jatah cuti
  const quota = await c.env.DB.prepare('SELECT * FROM attendance_quota WHERE tahun = ? AND nama = ?').bind(new Date().getFullYear(), user.nama).first() || { jatah_cuti: 12, jatah_izin: 0 };
  
  const usedCuti = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM attendance WHERE nama = ? AND status = "cuti" AND periode LIKE ?').bind(user.nama, `${currentPeriod}%`).first();
  const usedIzin = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM attendance WHERE nama = ? AND status = "izin" AND periode LIKE ?').bind(user.nama, `${currentPeriod}%`).first();
  
  const cutiStatus = attendanceQuotaStatus(usedCuti?.cnt || 0, Number(quota.jatah_cuti) || 12);
  
  // 7. Service due
  const assets = await c.env.DB.prepare('SELECT * FROM service_asset WHERE aktif = "YA"').all();
  const serviceDue = await Promise.all(assets.results.map(async (asset) => {
    const logs = await c.env.DB.prepare('SELECT * FROM service_log WHERE asset_id = ? AND selesai = "YA" ORDER BY tanggal DESC LIMIT 1').bind(asset.asset_id).all();
    const lastLog = logs.results[0];
    
    let daysLeft = 999, kmLeft = 999;
    if (lastLog) {
      const intervalHari = Number(asset.interval_hari) || 90;
      const nextDate = addMonths_(lastLog.tanggal, Math.ceil((Number(asset.interval_hari) || 90) / 30));
      daysLeft = daysBetween_(today_, nextDate);
      kmLeft = (Number(asset.interval_km) || 0) - ((Number(lastLog.kilometer) || 0) % (Number(asset.interval_km) || 5000));
    } else { daysLeft = 0; kmLeft = 0; }
    
    return {
      asset_id: asset.asset_id, nama: asset.nama, grup: asset.grup,
      last_service: lastLog ? lastLog.tanggal : 'Belum pernah',
      days_left: daysLeft, km_left: kmLeft,
      status: serviceDueStatus(daysLeft, kmLeft).label,
      color: serviceDueStatus(daysLeft, kmLeft).color,
      icon: serviceGroupIcon(asset.grup)
    };
  }));
  
  const filteredServiceDue = serviceDue
    .filter(s => s.days_left <= 30 || s.km_left <= 500)
    .sort((a, b) => { if (a.days_left <= 0 && b.days_left > 0) return -1; if (a.days_left > 0 && b.days_left <= 0) return 1; return a.days_left - b.days_left; })
    .slice(0, 5);
  
  // Budget harian sisa
  const daysInMonth = daysInMonth_(new Date().getFullYear(), new Date().getMonth() + 1);
  const dayOfMonth = new Date().getDate();
  const remainingDays = daysInMonth - dayOfMonth + 1;
  const totalBudget = sumBy_(categories.results, 'budget_bulanan');
  const remainingBudget = totalBudget - totalExpense;
  const dailyBudget = remainingDays > 0 ? Math.round(remainingBudget / remainingDays) : 0;
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      periode: currentPeriod, periode_label: formatPeriod_(currentPeriod), today: today_, today_label: formatDate(today_),
      accounts: accountBalances, total_saldo: totalSaldo, total_income: totalIncome, total_expense: totalExpense,
      budget_categories: budgetData, total_budget: sumBy_(categories.results, 'budget_bulanan'), remaining_budget: totalBudget - totalExpense,
      daily_budget: dailyBudget, remaining_days: remainingDays,
      late_bills: lateBills.map(b => ({ bill_id: b.bill_id, nama: b.nama, jumlah: b.jumlah, jatuh_tempo: b.jatuh_tempo, days_late: daysBetween_(b.jatuh_tempo, today_), icon: billTypeIcon(b.tipe) })),
      upcoming_bills: upcomingBills.map(b => ({ bill_id: b.bill_id, nama: b.nama, jumlah: b.jumlah, jatuh_tempo: b.jatuh_tempo, days_left: daysBetween_(today_, b.jatuh_tempo), icon: billTypeIcon(b.tipe) })),
      events: events.results.slice(0, 7).map(e => ({ event_id: e.event_id, judul: e.judul, kategori: e.kategori, tanggal_mulai: e.tanggal_mulai, tanggal_selesai: e.tanggal_selesai, icon: eventCategoryIcon(e.kategori) })),
      attendance_today: todayAtt ? { status: todayAtt.status, label: attendanceStatusLabel(todayAtt.status), color: attendanceStatusColor(todayAtt.status), icon: attendanceStatusIcon(todayAtt.status) } : { status: 'belum', label: 'Belum diisi', color: '#9E9E9E', icon: '❓' },
      cuti_quota: { used: usedCuti?.cnt || 0, total: Number(quota.jatah_cuti) || 12, sisa: (Number(quota.jatah_cuti) || 12) - (usedCuti?.cnt || 0), status: cutiStatus },
      izin_quota: { used: usedIzin?.cnt || 0, total: Number(quota.jatah_izin) || 0, sisa: Math.max(0, (Number(quota.jatah_izin) || 0) - (usedIzin?.cnt || 0)) },
      service_due: filteredServiceDue,
      user_nama: user.nama, user_role: user.role
    }
  });
});