// worker/src/routes/service.ts
// Service routes

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { generateId, now, writeAudit } from '../utils/db';
import type { Env } from '../types/env';

export const serviceRoutes = new Hono<{ Bindings: Env }>();

serviceRoutes.use('*', authMiddleware);

// GET /api/svc/asset.list
serviceRoutes.get('/asset.list', async (c) => {
  const user = c.get('user');
  const { grup, aktif } = c.req.query();
  
  let where = 'WHERE a.void != "YA"';
  const params: any[] = [];
  
  if (grup) { where += ' AND a.grup = ?'; params.push(grup); }
  if (aktif !== undefined) { where += ' AND a.aktif = ?'; params.push(aktif); }
  
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM service_asset a
    ${where}
    ORDER BY a.nama
  `).bind(...params).all();
  
  const enriched = results.map(a => ({
    ...a,
    grup_icon: serviceGroupIcon(a.grup),
    grup_color: serviceGroupColor(a.grup),
    formatted_interval_hari: a.interval_hari ? `${a.interval_hari} hari` : '-',
    formatted_interval_km: a.interval_km ? `${Number(a.interval_km).toLocaleString('id-ID')} km` : '-'
  }));
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { data: enriched } });
});

// POST /api/svc/asset.create
serviceRoutes.post('/asset.create', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  const required = ['nama', 'grup'];
  for (const field of required) {
    if (!body[field]) {
      return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: `${field} wajib diisi` }}, 400);
    }
  }
  
  const assetData = {
    asset_id: generateId(),
    nama: body.nama, grup: body.grup,
    merek: body.merek || '', tipe: body.tipe || '', tahun: body.tahun || '',
    no_seri: body.no_seri || '', lokasi: body.lokasi || '',
    interval_hari: Number(body.interval_hari) || 0,
    interval_km: Number(body.interval_km) || 0,
    keterangan: body.keterangan || '',
    aktif: 'YA', void: 'TIDAK',
    dibuat_oleh: user.email, dibuat_pada: now(),
    diubah_oleh: user.email, diubah_pada: now(), rev: 1
  };
  
  await c.env.DB.prepare(`
    INSERT INTO service_asset (
      asset_id, nama, grup, merek, tipe, tahun, no_seri, lokasi,
      interval_hari, interval_km, keterangan, aktif, void,
      dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, rev
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'YA', 'TIDAK', ?, ?, ?, ?, 1)
  `).bind(
    assetData.asset_id, assetData.nama, assetData.grup, assetData.merek, assetData.tipe,
    assetData.tahun, assetData.no_seri, assetData.lokasi, assetData.interval_hari,
    assetData.interval_km, assetData.keterangan,
    user.email, now(), user.email, now()
  ).run();
  
  return c.json<Env['ApiResponse']>({ ok: true, data: assetData });
});

// PUT /api/svc/asset.update
serviceRoutes.put('/asset.update', async (c) => {
  const user = c.get('user');
  const { asset_id, rev, ...data } = await c.req.json();
  
  if (!asset_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'asset_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM service_asset WHERE asset_id = ?').bind(asset_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Aset tidak ditemukan' }}, 404);
  }
  
  const updates: string[] = [];
  const params: any[] = [];
  
  const allowed = ['nama', 'grup', 'merek', 'tipe', 'tahun', 'no_seri', 'lokasi', 'interval_hari', 'interval_km', 'keterangan', 'aktif'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(field.includes('interval') ? Number(data[field]) : data[field]);
    }
  }
  
  if (updates.length === 0) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Tidak ada data yang diubah' }}, 400);
  }
  
  updates.push('diubah_oleh = ?', 'diubah_pada = ?', 'rev = rev + 1');
  params.push(user.email, now(), asset_id, rev);
  
  await c.env.DB.prepare(`UPDATE service_asset SET ${updates.join(', ')} WHERE asset_id = ? AND rev = ?`).bind(...params).run();
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// DELETE /api/svc/asset.delete
serviceRoutes.delete('/asset.delete', async (c) => {
  const user = c.get('user');
  const { asset_id, rev } = c.req.query();
  
  if (!asset_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'asset_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM service_asset WHERE asset_id = ?').bind(asset_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Aset tidak ditemukan' }}, 404);
  }
  
  // Check if has logs
  const logs = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM service_log WHERE asset_id = ?').bind(asset_id).first();
  if (logs.cnt > 0) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Aset memiliki riwayat service, tidak bisa dihapus (soft delete saja)' }}, 400);
  }
  
  await c.env.DB.prepare('UPDATE service_asset SET void = "YA", rev = rev + 1 WHERE asset_id = ? AND rev = ?').bind(asset_id, rev).run();
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// GET /api/svc/list
serviceRoutes.get('/list', async (c) => {
  const { asset_id, jenis, startDate, endDate, limit } = c.req.query();
  
  let where = 'WHERE l.void != "YA"';
  const params: any[] = [];
  
  if (asset_id) { where += ' AND l.asset_id = ?'; params.push(asset_id); }
  if (jenis) { where += ' AND l.jenis = ?'; params.push(jenis); }
  if (startDate) { where += ' AND l.tanggal >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND l.tanggal <= ?'; params.push(endDate); }
  
  const { results } = await c.env.DB.prepare(`
    SELECT l.*, a.nama as asset_nama, a.grup as asset_grup
    FROM service_log l
    LEFT JOIN service_asset a ON l.asset_id = a.asset_id
    ${where}
    ORDER BY l.tanggal DESC
    ${limit ? 'LIMIT ' + limit : ''}
  `).bind(...params).all();
  
  const enriched = results.map(r => ({
    ...r,
    asset_nama: r.asset_nama || 'Unknown',
    asset_grup: r.asset_grup || '',
    jenis_icon: serviceTypeIcon(r.jenis),
    jenis_label: r.jenis,
    formatted_tanggal: formatDate(r.tanggal),
    formatted_biaya: formatRupiah(r.biaya),
    selesai_label: r.selesai === 'YA' ? 'Selesai' : 'Pending',
    selesai_color: r.selesai === 'YA' ? '#4CAF50' : '#FF9800',
    selesai_icon: r.selesai === 'YA' ? '✅' : '⏳'
  }));
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { data: enriched } });
});

// POST /api/svc/create
serviceRoutes.post('/create', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  
  const required = ['asset_id', 'jenis', 'tanggal'];
  for (const field of required) {
    if (!body[field]) {
      return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: `${field} wajib diisi` }}, 400);
    }
  }
  
  const asset = await c.env.DB.prepare('SELECT * FROM service_asset WHERE asset_id = ?').bind(body.asset_id).first();
  if (!asset) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Aset tidak ditemukan' }}, 404);
  }
  
  const logData = {
    svc_id: generateId(),
    asset_id: body.asset_id, jenis: body.jenis,
    tanggal: body.tanggal,
    kilometer: Number(body.kilometer) || 0,
    biaya: Number(body.biaya) || 0,
    vendor: body.vendor || '', no_nota: body.no_nota || '',
    parts: body.parts || '', txn_id: body.txn_id || '',
    catatan: body.catatan || '', selesai: body.selesai || 'YA',
    void: 'TIDAK', dibuat_oleh: user.email, dibuat_pada: now(),
    diubah_oleh: user.email, diubah_pada: now(), rev: 1
  };
  
  await c.env.DB.prepare(`
    INSERT INTO service_log (
      svc_id, asset_id, jenis, tanggal, kilometer, biaya, vendor, no_nota, parts,
      txn_id, catatan, selesai, void, dibuat_oleh, dibuat_pada, diubah_oleh, diubah_pada, rev
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'YA', 'TIDAK', ?, ?, ?, ?, 1)
  `).bind(
    logData.svc_id, logData.asset_id, logData.jenis, logData.tanggal, logData.kilometer,
    logData.biaya, logData.vendor, logData.no_nota, logData.parts, logData.txn_id,
    logData.catatan, user.email, now(), user.email, now()
  ).run();
  
  return c.json<Env['ApiResponse']>({ ok: true, data: logData });
});

// PUT /api/svc/update
serviceRoutes.put('/update', async (c) => {
  const user = c.get('user');
  const { svc_id, rev, ...data } = await c.req.json();
  
  if (!svc_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'svc_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM service_log WHERE svc_id = ?').bind(svc_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Log service tidak ditemukan' }}, 404);
  }
  
  const updates: string[] = [];
  const params: any[] = [];
  
  const allowed = ['jenis', 'tanggal', 'kilometer', 'biaya', 'vendor', 'no_nota', 'parts', 'txn_id', 'catatan', 'selesai'];
  for (const field of allowed) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(['kilometer', 'biaya'].includes(field) ? Number(data[field]) : data[field]);
    }
  }
  
  if (updates.length === 0) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Tidak ada data yang diubah' }}, 400);
  }
  
  updates.push('diubah_oleh = ?', 'diubah_pada = ?', 'rev = rev + 1');
  params.push(user.email, now(), svc_id, rev);
  
  await c.env.DB.prepare(`UPDATE service_log SET ${updates.join(', ')} WHERE svc_id = ? AND rev = ?`).bind(...params).run();
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// DELETE /api/svc/delete
serviceRoutes.delete('/delete', async (c) => {
  const user = c.get('user');
  const { svc_id, rev } = c.req.query();
  
  if (!svc_id || !rev) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'svc_id dan rev wajib' }}, 400);
  }
  
  const existing = await c.env.DB.prepare('SELECT * FROM service_log WHERE svc_id = ?').bind(svc_id).first();
  if (!existing) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'NOT_FOUND', message: 'Log service tidak ditemukan' }}, 404);
  }
  
  if (existing.txn_id) {
    return c.json<Env['ApiResponse']>({ ok: false, error: { code: 'VALIDATION', message: 'Log ini terhubung dengan transaksi, hapus transaksi dulu' }}, 400);
  }
  
  await c.env.DB.prepare('UPDATE service_log SET void = "YA", rev = rev + 1 WHERE svc_id = ? AND rev = ?').bind(svc_id, rev).run();
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { success: true } });
});

// GET /api/svc/due
serviceRoutes.get('/due', async (c) => {
  const { daysAhead, kmAhead } = c.req.query();
  const maxDays = parseInt(daysAhead) || 30;
  const maxKm = parseInt(kmAhead) || 500;
  
  const assets = await c.env.DB.prepare('SELECT * FROM service_asset WHERE aktif = "YA"').all();
  const today = today_();
  
  const dueList = assets.results.map(asset => {
    const logs = c.env.DB.prepare(`
      SELECT * FROM service_log WHERE asset_id = ? AND selesai = 'YA'
      ORDER BY tanggal DESC LIMIT 1
    `).bind(asset.asset_id).all();
    
    const lastLog = logs.results[0];
    let daysLeft = 999, kmLeft = 999;
    
    if (lastLog) {
      const intervalHari = Number(asset.interval_hari) || 90;
      const intervalKm = Number(asset.interval_km) || 5000;
      
      daysLeft = daysBetween_(today, addMonths_(lastLog.tanggal, Math.ceil(intervalHari / 30)));
      kmLeft = intervalKm - ((Number(lastLog.kilometer) || 0) % intervalKm);
    } else {
      daysLeft = 0; kmLeft = 0;
    }
    
    const status = serviceDueStatus(daysLeft, kmLeft);
    
    return {
      asset_id: asset.asset_id, nama: asset.nama, grup: asset.grup, grup_icon: serviceGroupIcon(asset.grup),
      last_service: lastLog ? lastLog.tanggal : 'Belum pernah',
      last_km: lastLog ? Number(lastLog.kilometer) : 0,
      days_left: daysLeft, km_left: kmLeft,
      status: status.label, color: status.color, icon: status.icon,
      interval_hari: asset.interval_hari, interval_km: asset.interval_km,
      overdue: daysLeft <= 0 || kmLeft <= 0
    };
  }).filter(d => d.days_left <= maxDays || d.km_left <= maxKm)
  .sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return a.days_left - b.days_left;
  });
  
  return c.json<Env['ApiResponse']>({ ok: true, data: { data: dueList } });
});

// Helper functions
function serviceGroupIcon(grup: string): string {
  const icons = { motor: '🏍️', rumah: '🏠', elektronik: '📺', perabot: '🪑', lainnya: '🔧' };
  return icons[grup] || '🔧';
}

function serviceGroupColor(grup: string): string {
  const colors = { motor: '#f44336', rumah: '#4CAF50', elektronik: '#2196F3', perabot: '#9C27B0', lainnya: '#757575' };
  return colors[grup] || '#757575';
}

function serviceTypeIcon(jenis: string): string {
  const icons = { servis: '🔧', ganti: '🔄', perbaikan: '🛠️', rutin: '📅', claim_asuransi: '📋' };
  return icons[jenis] || '🔧';
}

function serviceDueStatus(daysLeft: number, kmLeft: number): { label: string; color: string; icon: string } {
  if (daysLeft <= 0 || kmLeft <= 0) return { label: 'Overdue', color: '#f44336', icon: '🔴' };
  if (daysLeft <= 7 || kmLeft <= 500) return { label: 'Segera', color: '#FF9800', icon: '🟡' };
  return { label: 'Aman', color: '#4CAF50', icon: '🟢' };
}

function daysBetween_(d1: string, d2: string): number {
  return Math.floor((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
}

function addMonths_(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatRupiah(num: number): string {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}