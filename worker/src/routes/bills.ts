// worker/src/routes/bills.ts
// Bills routes

import { Hono } from 'hono';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { getCurrentPeriod, today, now, generateId, writeAudit, sendFonnteWA } from '../utils/db';
import type { Env } from '../types/env';

export const billRoutes = new Hono<{ Bindings: Env }>();

billRoutes.use('*', authMiddleware);

// GET /api/bill/list
billRoutes.get('/list', async (c) => {
  const user = c.get('user');
  const { status, tipe, periode, startDate, endDate } = c.req.query();
  
  let where = 'WHERE b.void != "YA"';
  const params: any[] = [];
  
  if (status) { where += ' AND b.status = ?'; params.push(status); }
  if (tipe) { where += ' AND b.tipe = ?'; params.push(tipe); }
  if (periode) { where += ' AND b.periode = ?'; params.push(periode); }
  if (startDate) { where += ' AND b.jatuh_tempo >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND b.jatuh_tempo <= ?'; params.push(endDate); }
  
  // User filter - admin sees all, user sees bills they created or bills from their recurring
  if (user.role !== 'admin') {
    where += ' AND (b.dibuat_oleh = ? OR b.rec_id IN (SELECT rec_id FROM recurring WHERE dibuat_oleh = ?))';
    params.push(user.email, user.email);
  }
  
  const { results } = await c.env.DB.prepare(`
    SELECT b.*, c.nama as kategori_nama, c.warna as kategori_warna
    FROM bills b
    LEFT JOIN categories c ON b.kategori_id = c.category_id
    ${where}
    ORDER BY b.jatuh_tempo ASC
  `).bind(...params).all();
  
  const todayStr = today();
  const enriched = results.map(b => {
    const isLate = b.status === 'belum' && b.jatuh_tempo < todayStr;
    const daysLeft = daysBetween(todayStr, b.jatuh_tempo);
    
    return {
      ...b,
      tipe_icon: billTypeIcon(b.tipe),
      tipe_label: b.tipe === 'cicilan' ? `Cicilan ${b.cicilan_ke}/${b.total_cicilan}` : 
                  b.tipe === 'iuran_sampah' ? 'Iuran Sampah' : b.tipe,
      formatted_jumlah: formatRupiah(b.jumlah),
      formatted_jatuh_tempo: formatDate(b.jatuh_tempo),
      days_left: daysLeft,
      is_late: isLate,
      status_label: billStatusLabel(b.status),
      status_color: billStatusColor(b.status),
      status_icon: billStatusIcon(b.status),
      estimasi_label: b.estimasi === 'YA' ? 'Estimasi' : 'Pasti',
      estimasi_color: b.estimasi === 'YA' ? '#FF9800' : '#4CAF50',
      prioritias_icon: priorityIcon(b.prioritas),
      remind_at_formatted: b.remind_at ? formatDateTime(b.remind_at) : ''
    };
  });
  
  // Group by status
  const grouped = {
    terlambat: enriched.filter(b => b.is_late),
    minggu_ini: enriched.filter(b => !b.is_late && b.days_left <= 7),
    bulan_ini: enriched.filter(b => !b.is_late && b.days_left > 7 && b.days_left <= 30),
    nanti: enriched.filter(b => !b.is_late && b.days_left > 30),
    lunas: enriched.filter(b => b.status === 'lunas')
  };
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      all: enriched,
      grouped,
      summary: {
        total: enriched.length,
        terlambat: grouped.terlambat.length,
        minggu_ini: grouped.minggu_ini.length,
        bulan_ini: grouped.bulan_ini.length,
        lunas: grouped.lunas.length,
        total_belum_bayar: enriched.filter(b => b.status === 'belum').reduce((s, b) => s + b.jumlah, 0),
        total_lunas: enriched.filter(b => b.status === 'lunas').reduce((s, b) => s + b.jumlah, 0)
      }
    }
  });
});

// POST /api/bill/create
billRoutes.post('/create', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  const required = ['nama', 'tipe', 'jumlah', 'jatuh_tempo'];
  for (const field of required) {
    if (!body[field]) {
      return c.json<Env['ApiResponse']>({
        ok: false,
        error: { code: 'VALIDATION', message: `${field} wajib diisi` }
      }, 400);
    }
  }
  
  if (body.tipe === 'cicilan') {
    if (!body.cicilan_ke || !body.total_cicilan) {
      return c.json<Env['ApiResponse']>({
        ok: false,
        error: { code: 'VALIDATION', message: 'Cicilan wajib isi cicilan_ke dan total_cicilan' }
      }, 400);
    }
  }
  
  const billId = generateId();
  const timestamp = now();
  
  // Determine remind_at for iuran sampah & tagihan butuh jam pasti
  let remindAt = body.remind_at;
  if (!remindAt && (body.tipe === 'iuran_sampah' || body.kategori_variabel === 'YA')) {
    remindAt = `${body.jatuh_tempo} 08:00`;
  }
  
  await c.env.DB.prepare(`
    INSERT INTO bills (
      bill_id, nama, tipe, jumlah, jatuh_tempo, periode, cicilan_ke, total_cicilan, sisa_cicilan,
      rec_id, status, estimasi, lunas_pada, txn_id, prioritas, kategori_id, catatan,
      remind_at, remind_channel, remind_sent, void, dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, rev
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'belum', ?, '', '', ?, ?, ?, ?, ?, 'TIDAK', ?, ?, ?, ?, 1)
  `).bind(
    billId, body.nama, body.tipe, Number(body.jumlah), body.jatuh_tempo,
    body.jatuh_tempo.slice(0, 7),
    body.cicilan_ke ? Number(body.cicilan_ke) : 0,
    body.total_cicilan ? Number(body.total_cicilan) : 0,
    body.total_cicilan ? (Number(body.total_cicilan) - (Number(body.cicilan_ke) || 0) + 1) : 0,
    body.rec_id || '',
    body.estimasi || 'TIDAK',
    body.prioritas || 'normal',
    body.kategori_id || '',
    body.catatan || '',
    remindAt || '',
    body.remind_channel || 'WA',
    'TIDAK',
    user.email, now(), user.email, now()
  ).run();
  
  await writeAudit(c.env.DB, {
    email: user.email,
    role: user.role,
    aksi: 'create',
    entity: 'bills',
    entityId: billId,
    ringkas: `Buat tagihan: ${body.nama} Rp ${Number(body.jumlah).toLocaleString('id-ID')} tempo ${body.jatuh_tempo}`
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { bill_id: billId } });
});

// POST /api/bill/pay
billRoutes.post('/pay', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  const required = ['bill_id', 'jumlah', 'account_id', 'metode'];
  for (const field of required) {
    if (!body[field]) {
      return c.json<Env['ApiResponse']>({
        ok: false,
        error: { code: 'VALIDATION', message: `${field} wajib diisi` }
      }, 400);
    }
  }
  
  const bill = await c.env.DB.prepare('SELECT * FROM bills WHERE bill_id = ?').bind(body.bill_id).first();
  if (!bill) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Tagihan tidak ditemukan' }}, 404);
  }
  if (bill.status === 'lunas') {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Tagihan sudah lunas' }}, 400);
  }
  
  const paidAmount = Number(body.jumlah);
  if (paidAmount < 1000) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Jumlah bayar minimal 1.000' }}, 400);
  }
  
  // Use transaction (D1 doesn't support explicit transactions, but we use sequential with verification)
  const txnId = generateId();
  const payDate = body.tanggal || today();
  const timestamp = now();
  
  // 1. Create transaction
  const cat = await c.env.DB.prepare('SELECT nama FROM categories WHERE category_id = ?').bind(body.kategori_id || bill.kategori_id).first();
  
  await c.env.DB.prepare(`
    INSERT INTO transactions (
      txn_id, tanggal, periode, tipe, kategori_id, kategori_nama, jumlah, account_id,
      scope, metode, keterangan, tags, recurring_id, bill_id, void,
      dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, rev
    ) VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, 'keluarga', ?, ?, 'tagihan,bayar', '', ?, 'TIDAK', ?, ?, ?, ?, 1)
  `).bind(
    txnId, payDate, payDate.slice(0, 7),
    body.kategori_id || bill.kategori_id, cat?.nama || bill.kategori_nama || 'Tagihan',
    paidAmount, body.account_id, body.metode,
    body.keterangan || `Bayar: ${bill.nama}`,
    bill.bill_id,
    user.email, now(), user.email, now()
  ).run();
  
  // 2. Update bill
  await c.env.DB.prepare(`
    UPDATE bills SET status = 'lunas', lunas_pada = ?, txn_id = ?, remind_sent = 'YA',
      diubah_oleh = ?, diubah_pada = ?, rev = rev + 1
    WHERE bill_id = ? AND rev = (SELECT rev FROM bills WHERE bill_id = ?)
  `).bind(payDate, txnId, user.email, now(), body.bill_id, body.bill_id).run();
  
  // 3. If cicilan and last payment, stop future generates
  if (bill.tipe === 'cicilan' && Number(bill.cicilan_ke) >= Number(bill.total_cicilan)) {
    // Already paid off, no more generates
  }
  
  await writeAudit(c.env.DB, {
    email: user.email,
    role: user.role,
    aksi: 'create',
    entity: 'transactions',
    entityId: txnId,
    ringkas: `Bayar tagihan: ${bill.nama} Rp ${paidAmount.toLocaleString('id-ID')}`
  });
  
  await writeAudit(c.env.DB, {
    email: user.email,
    role: user.role,
    aksi: 'update',
    entity: 'bills',
    entityId: bill.bill_id,
    ringkas: `Tagihan lunas via Rp ${paidAmount.toLocaleString('id-ID')}`,
    sebelum: bill,
    sesudah: { ...bill, status: 'lunas', lunas_pada: payDate, txn_id: txnId }
  });
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: {
      transaction_id: txnId,
      bill_id: bill.bill_id,
      message: `Tagihan "${bill.nama}" sudah lunas`
    }
  });
});

// POST /api/bill/generate
billRoutes.post('/generate', async (c) => {
  const user = c.get('user');
  const { periode, force } = await c.req.json();
  const targetPeriode = periode || getCurrentPeriod();
  
  // Check existing
  const existing = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM bills WHERE periode = ?').bind(targetPeriode).first();
  if (existing.cnt > 0 && !force) {
    return c.json<Env['ApiResponse']>({
      ok: true,
      data: { message: `Tagihan untuk ${targetPeriode} sudah ada (${existing.cnt} item)`, generated: 0, skipped: existing.cnt }
    });
  }
  
  const recurrings = await c.env.DB.prepare(`
    SELECT * FROM recurring WHERE aktif = 'YA' AND auto_post = 'YA'
  `).all();
  
  let generated = 0, skipped = 0;
  
  for (const rec of recurrings.results) {
    if (!isRecurringDue(rec, targetPeriode)) { skipped++; continue; }
    
    const existingBill = await c.env.DB.prepare(
      'SELECT 1 FROM bills WHERE rec_id = ? AND periode = ?'
    ).bind(rec.rec_id, targetPeriode).first();
    
    if (existingBill) { skipped++; continue; }
    
    const jatuhTempo = calculateDueDate(rec, targetPeriode);
    if (!jatuhTempo) { skipped++; continue; }
    
    // Determine remind_at
    let remindAt = '';
    if (rec.tipe === 'expense' && (rec.kategori_variabel === 'YA' || rec.nama.toLowerCase().includes('sampah'))) {
      remindAt = `${jatuhTempo} 08:00`;
    }
    
    await c.env.DB.prepare(`
      INSERT INTO bills (
        bill_id, nama, tipe, jumlah, jatuh_tempo, periode, rec_id, status, estimasi,
        prioritas, kategori_id, catatan, remind_at, remind_channel, remind_sent,
        void, dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, rev
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'belum', ?, 'normal', ?, ?, ?, 'WA', 'TIDAK', 'TIDAK', ?, ?, ?, ?, 1)
    `).bind(
      generateId(), rec.nama, rec.tipe === 'income' ? 'rutin' : rec.tipe,
      Number(rec.jumlah) || 0, jatuhTempo, targetPeriode, rec.rec_id,
      rec.kategori_variabel === 'YA' ? 'YA' : 'TIDAK',
      rec.kategori_id,
      `Auto-generate dari recurring: ${rec.nama}`,
      remindAt,
      user.email, now(), user.email, now()
    ).run();
    
    generated++;
  }
  
  await writeAudit(c.env.DB, {
    email: user.email,
    role: user.role,
    aksi: 'generate',
    entity: 'bills',
    entityId: '',
    ringkas: `Generate tagihan ${targetPeriode}`,
    sesudah: { generated, skipped }
  });
  
  return c.json<Env['ApiResponse']>({
    ok: true,
    data: { message: `Generate selesai: ${generated} tagihan dibuat, ${skipped} dilewati`, generated, skipped }
  });
});

// Helper functions
function billTypeIcon(tipe: string): string {
  const icons: Record<string, string> = { rutin: '🔄', cicilan: '📋', sekali: '📌', kartu_kredit: '💳', iuran_sampah: '🗑️' };
  return icons[tipe] || '📄';
}

function billStatusLabel(status: string): string {
  return status === 'lunas' ? 'Lunas' : 'Belum Lunas';
}

function billStatusColor(status: string): string {
  return status === 'lunas' ? '#4CAF50' : '#FF9800';
}

function billStatusIcon(status: string): string {
  return status === 'lunas' ? '✅' : '⏳';
}

function priorityIcon(p: string): string {
  const icons = { tinggi: '🔴', normal: '🟡', rendah: '🟢' };
  return icons[p as keyof typeof icons] || '⚪';
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

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  return formatDate(dateStr) + ' ' + new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1); const d2 = new Date(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function isRecurringDue(rec: any, periode: string): boolean {
  const { year, month } = parsePeriod(periode);
  const startDate = new Date(rec.tanggal_mulai);
  const endDate = rec.tanggal_akhir ? new Date(rec.tanggal_akhir) : null;
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);
  
  if (startDate > periodEnd) return false;
  if (endDate && endDate < periodStart) return false;
  return true;
}

function calculateDueDate(rec: any, periode: string): string | null {
  const { year, month } = parsePeriod(periode);
  
  switch (rec.frekuensi) {
    case 'bulanan':
    case 'tahunan':
      const day = Math.min(rec.hari_tanggal || 1, new Date(year, month, 0).getDate());
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case 'mingguan':
    case 'harian':
      return `${year}-${String(month).padStart(2, '0')}-01`;
    default:
      return `${year}-${String(month).padStart(2, '0')}-01`;
  }
}

function parsePeriod(period: string): { year: number; month: number } {
  const [y, m] = period.split('-').map(Number);
  return { year: y, month: m };
}