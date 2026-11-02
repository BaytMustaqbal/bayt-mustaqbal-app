import { Env } from './types/env';
import { sendWA } from './utils/fonnte'; // fonnte WA utility (Task 7)
import { processOutbox, syncToGcal } from './utils/gcal';
import { readNotifPrefs, isInQuietWindow, readFonnteTarget } from './utils/notif';
import { computeInsight } from './utils/insight';

// Daily digest: summarize today's transactions
async function sendDailyDigest(env: Env): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const startOfDay = `${today}T00:00:00.000Z`;
  const endOfDay = `${today}T23:59:59.999Z`;

  const incomeRes = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id IN (SELECT id FROM users WHERE void IS NULL) AND type = 'in' AND void IS NULL AND created_at >= ? AND created_at <= ?`
  ).bind(startOfDay, endOfDay).first() as any;

  const expenseRes = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id IN (SELECT id FROM users WHERE void IS NULL) AND type = 'out' AND void IS NULL AND created_at >= ? AND created_at <= ?`
  ).bind(startOfDay, endOfDay).first() as any;

  const totalIncome = incomeRes?.total || 0;
  const totalExpense = expenseRes?.total || 0;
  const net = totalIncome - totalExpense;

  const message = `📊 Ringkasan Harian - ${today}
💰 Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}
💸 Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}
📈 Saldo bersih: Rp ${net.toLocaleString('id-ID')}`;

  const target = await readFonnteTarget(env);
  await sendWA(env, message, target);
  console.log('Daily digest sent');
}

// Bill reminder: check overdue bills
async function sendBillReminder(env: Env): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const overdueBills = await env.DB.prepare(
    `SELECT name, amount, due_date FROM bills WHERE user_id IN (SELECT id FROM users WHERE void IS NULL) AND void IS NULL AND status = 'unpaid' AND due_date <= ?`
  ).bind(today).all() as any;

  const bills = overdueBills?.results || [];

  if (bills.length === 0) {
    console.log('No overdue bills');
    return;
  }

  const target = await readFonnteTarget(env);

  for (const bill of bills) {
    const message = `🔔 Reminder Tagihan
${bill.name}
Jumlah: Rp ${bill.amount.toLocaleString('id-ID')}
Jatuh tempo: ${bill.due_date}`;
    await sendWA(env, message, target);
  }

  console.log(`Bill reminders sent: ${bills.length}`);
}

// Generate monthly bills from recurring entries
async function generateMonthlyBills(env: Env): Promise<void> {
  const today = new Date();
  const now = new Date().toISOString();

  // Get all recurring entries that are due (start_date <= today, end_date IS NULL or end_date >= today)
  const recurring = await env.DB.prepare(
    `SELECT * FROM recurring WHERE user_id IN (SELECT id FROM users WHERE void IS NULL) AND void IS NULL AND start_date <= ? AND (end_date IS NULL OR end_date >= ?)`
  ).bind(today.toISOString().slice(0, 10), today.toISOString().slice(0, 10)).all() as any;

  const entries = recurring?.results || [];

  let generated = 0;
  for (const entry of entries) {
    // Check if a bill for this recurring entry already exists this month
    const existing = await env.DB.prepare(
      `SELECT id FROM bills WHERE user_id = ? AND recurring_id = ? AND due_date >= ? AND void IS NULL`
    ).bind(entry.user_id, entry.id, `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`).first() as any;

    if (!existing) {
      const id = crypto.randomUUID();
      const dueDate = today.toISOString().slice(0, 10);

      await env.DB.prepare(
        'INSERT INTO bills (id, user_id, name, amount, due_date, status, paid_at, recurring_id, rev, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, entry.user_id, entry.name, entry.amount, dueDate, 'unpaid', null, entry.id, 1, now, now).run();

      generated++;
      // Tagihan hasil generate juga ikut sinkron ke Google Calendar.
      await syncToGcal(env, { writerUserId: entry.user_id, groupId: null, entityType: 'bill', entityId: id, action: 'upsert' });
    }
  }

  console.log(`Monthly bills generated: ${generated}`);
}

const BUCKET_LABEL: Record<string, string> = { needs: 'Kebutuhan', wants: 'Keinginan', savings: 'Tabungan' };

/** Daftar grup unik + contoh user per grup. */
async function listGroupScopes(env: Env) {
  const rows = await env.DB.prepare(
    `SELECT group_id, MIN(id) AS sample_user FROM users WHERE void IS NULL AND group_id IS NOT NULL GROUP BY group_id`
  ).all();
  return (rows.results || []) as { group_id: string; sample_user: string }[];
}

/** Peringatan ambang anggaran (harian). Kirim WA + catat notifikasi bila ≥80%. */
async function sendBudgetAlerts(env: Env): Promise<void> {
  const scopes = await listGroupScopes(env);
  const month = new Date().toISOString().slice(0, 7);
  const target = await readFonnteTarget(env);

  for (const scope of scopes) {
    const insight = await computeInsight(env, scope.group_id, scope.sample_user);
    const alerts: string[] = [];

    for (const b of insight.buckets) {
      if (b.alokasi <= 0) continue;
      if (b.realisasi >= b.alokasi) {
        alerts.push(`⚠️ ${BUCKET_LABEL[b.id]} melebihi anggaran: ${b.pct}%`);
      } else if (b.pct >= 80) {
        alerts.push(`⚡ ${BUCKET_LABEL[b.id]} sudah ${b.pct}% dari anggaran`);
      }
    }

    // Dedup per grup + bulan + jenis.
    const key = `budget_alert:${scope.group_id}:${month}`;
    const notif = await env.DB.prepare(
      `SELECT id FROM notification_log WHERE message = ? AND void IS NULL LIMIT 1`
    ).bind(key).first();
    if (alerts.length === 0 || notif) continue;

    const message = `📊 *Pengingat Anggaran* ${month}\n${alerts.join('\n')}`;
    await sendWA(env, message, target);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO notification_log (id, user_id, type, message, read, rev, created_at) VALUES (?, ?, 'info', ?, 0, 1, ?)`
    ).bind(id, scope.sample_user, key, now).run();
  }
}

/** Rekap mingguan (Senin pagi). */
async function sendWeeklyRecap(env: Env): Promise<void> {
  const scopes = await listGroupScopes(env);
  const target = await readFonnteTarget(env);
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const scope of scopes) {
    const insight = await computeInsight(env, scope.group_id, scope.sample_user);
    const message = `📅 *Rekap Mingguan* (${start} s/d ${end})\n` +
      `Pengeluaran: Rp ${insight.totalExpense.toLocaleString('id-ID')}\n` +
      `Minggu lalu: Rp ${insight.prevTotalExpense.toLocaleString('id-ID')}` +
      (insight.changePct != null ? ` (${insight.changePct >= 0 ? '+' : ''}${insight.changePct}%)` : '');
    await sendWA(env, message, target);
  }
}

export async function handleCron(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const hour = wib.getUTCHours();
  const date = wib.getUTCDate();

  console.log(`Cron triggered: ${event.cron}, WIB hour=${hour}, date=${date}`);

  // Every hour — notifikasi (hormati preferensi) + retry antrean sinkron Google
  if (event.cron === '0 * * * *') {
    const prefs = await readNotifPrefs(env);

    if (!isInQuietWindow(prefs, hour)) {
      const reminderDue =
        prefs.tagihanEnabled && (prefs.reminderHour == null || prefs.reminderHour === hour);
      if (reminderDue) await sendBillReminder(env);

      if (prefs.digestEnabled && prefs.digestHour === hour) await sendDailyDigest(env);
    }

    await processOutbox(env);
  }

  // Day 1, 00:30 WIB — generate monthly bills from recurring
  if (date === 1 && hour === 0 && event.cron === '30 17 * * *') {
    await generateMonthlyBills(env);
  }

  // Harian 07:00 WIB — rekap mingguan tiap Senin
  if (event.cron === '0 0 * * *' && wib.getUTCDay() === 1) {
    await sendWeeklyRecap(env);
  }

  // 19:00 WIB — peringatan ambang anggaran
  if (event.cron === '0 12 * * *') {
    await sendBudgetAlerts(env);
  }
}
