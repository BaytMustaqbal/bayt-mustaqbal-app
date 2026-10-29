import { Env } from './types/env';
import { sendWA } from './utils/fonnte'; // fonnte WA utility (Task 7)
import { processOutbox, syncToGcal } from './utils/gcal';

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

  await sendWA(env, message);
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

  for (const bill of bills) {
    const message = `🔔 Reminder Tagihan
${bill.name}
Jumlah: Rp ${bill.amount.toLocaleString('id-ID')}
Jatuh tempo: ${bill.due_date}`;
    await sendWA(env, message);
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

export async function handleCron(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const hour = wib.getUTCHours();
  const date = wib.getUTCDate();

  console.log(`Cron triggered: ${event.cron}, WIB hour=${hour}, date=${date}`);

  // 07:00 WIB — daily digest
  if (hour === 7 && event.cron === '0 0 * * *') {
    await sendDailyDigest(env);
  }

  // Every hour — bill reminder + retry antrean sinkron Google Calendar
  if (event.cron === '0 * * * *') {
    await sendBillReminder(env);
    await processOutbox(env);
  }

  // Day 1, 00:30 WIB — generate monthly bills from recurring
  if (date === 1 && hour === 0 && event.cron === '30 17 * * *') {
    await generateMonthlyBills(env);
  }
}
