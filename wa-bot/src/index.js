import { normalizePhone, samePhone, digits } from './phone.js';
import {
  menuText, formatSummary, formatSaldo, formatAgenda, formatBills,
  formatGoals, formatCategoryDetail, formatReminders,
  formatTotalMetric, formatWallets, formatTopCategories, formatLastTxns,
  periodLabel, undoHint,
  confirmExpense, confirmIncome, confirmBill, confirmAgenda, confirmReminder, fmtRp,
} from './format.js';
import {
  wibNow, reminderIso, formatRemindAtLabel, findUserByPhone,
  findUserById, findUserByLid, saveIdentity,
  insertExpense, monthExpenseTotal, insertIncome, monthIncomeTotal, listOwnedAccounts,
  existingCategoryId,
  insertBill, insertAgenda, listRecurringTemplates, matchRecurringTemplate,
  querySummary, querySaldo, queryAgenda,
  queryBills, queryGoals, queryCategoryDetail, insertReminder, listReminders,
  periodRange, queryTxTotal, queryWalletBalances, queryTopCategories,
  queryLastTransactions, undoAction,
} from './db.js';
import {
  parseExpense, parseIncome, matchAccountHint, isYes, isNo, isMenu, wantsReminderList,
  parseReminderLocal, parseDateId, parseTimeId, parseAmountToken,
} from './parse.js';
import { detectIntent, chatReply } from './ai.js';
import { readAiPrefs, resolveFor, parseStyleCommand, setMemberStyle } from './botPrefs.js';
import { groupQueryFrom, canGroupReply, GROUP_READ_INTENTS } from './groupRules.js';
import { downloadMetaImage, scanReceiptImage } from './scan.js';
import {
  getPending, setPending, clearPending,
  setLastAction, getLastAction, clearLastAction, UNDO_TTL_MINUTES,
} from './state.js';

const JSON_OK = () => new Response('ok', { status: 200 });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/meta') {
      return handleMeta(request, env, ctx);
    }

    if (url.pathname === '/api/expenses' && request.method === 'GET') {
      return handleGetExpenses(request, env);
    }
    if (url.pathname === '/api/expenses' && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname.startsWith('/fonnte/') && request.method === 'POST') {
      return handleFonnte(request, env, ctx);
    }

    return new Response('Not found', { status: 404 });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'X-App-Token, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// Nomor WA -> user_id dari secret WA_ALLOWED (JSON). Cadangan bila pencocokan
// nomor di tabel users gagal; bukan lagi syarat izin tulis.
function resolveOwner(env, sender) {
  if (!env.WA_ALLOWED) return null;
  let map;
  try { map = JSON.parse(env.WA_ALLOWED); } catch { return null; }
  const d = digits(sender);
  if (map[d]) return map[d];
  const alt = d.startsWith('62') ? '0' + d.slice(2) : '62' + d.replace(/^0/, '');
  return map[alt] || map[normalizePhone(sender)] || null;
}

// Kanal balasan per nomor. Fonnte dan Meta bisa hidup bersamaan:
// nomor yang terakhir menulis lewat Meta dibalas lewat Meta, sisanya lewat Fonnte.
const CHANNEL_PREFIX = 'channel:';

async function noteChannel(env, phone, channel) {
  if (!env.WA_DEDUPE || !phone) return;
  try {
    await env.WA_DEDUPE.put(CHANNEL_PREFIX + normalizePhone(phone), channel, { expirationTtl: 2592000 });
  } catch (_) {}
}

async function channelFor(env, target) {
  if (env.WA_DEDUPE && target) {
    try {
      const c = await env.WA_DEDUPE.get(CHANNEL_PREFIX + normalizePhone(target));
      if (c) return c;
    } catch (_) {}
  }
  return String(env.WA_PROVIDER || 'fonnte').toLowerCase();
}

async function replyText(env, target, text) {
  const channel = await channelFor(env, target);
  if (channel === 'meta') return replyViaMeta(env.WA_ACCESS_TOKEN, env.WA_PHONE_ID, target, text);
  return replyViaFonnte(env, target, text);
}

async function replyViaFonnte(env, target, text) {
  const token = env.FONNTE_TOKEN;
  if (!token) return { ok: false, text: async () => 'no token' };
  return fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, message: text, countryCode: '62' }),
  });
}

function wibContext() {
  const shifted = new Date(Date.now() + 7 * 3600 * 1000);
  const iso = shifted.toISOString();
  return { today: iso.slice(0, 10), month: iso.slice(0, 7), time: iso.slice(11, 16) };
}

async function ensureDbUser(env, sender, ownerId) {
  const found = await findUserByPhone(env, sender);
  if (found) return found;
  // fallback: jika WA_ALLOWED menunjuk user_id, ambil recordnya
  if (ownerId && env.APP_DB) {
    try {
      return await env.APP_DB.prepare(
        `SELECT id, nama, nickname, group_id, group_role, phone FROM users WHERE id = ? AND void IS NULL`
      ).bind(ownerId).first();
    } catch { return null; }
  }
  return null;
}

// Perintah undo: batalkan aksi tulis terakhir (10 menit).
function isUndoCommand(text) {
  const s = String(text || '').trim().toLowerCase();
  if (/^(undo|urungkan)$/.test(s)) return true;
  return /^batalkan(\s+(yang\s+)?(tadi|terakhir|aksi\s+terakhir|transaksi\s+terakhir|catatan\s+terakhir))?$/.test(s);
}

// Peran yang boleh menulis lewat bot. Anggota lain hanya boleh baca.
const WRITE_DENIED = 'Maaf, nomor ini hanya bisa bertanya data. Pencatatan lewat bot hanya untuk kepala keluarga, suami, dan istri.';

// Nomor pengirim sudah diverifikasi WhatsApp (signature Meta / webhook Fonnte)
// dan harus cocok dengan nomor di profil user (ensureDbUser). Peran menentukan
// hak tulis. WA_ALLOWED hanya cadangan pencarian user, bukan gerbang kedua.
const canBotWrite = canGroupReply;

// Label kategori struk (id sama dengan kategori app).
const STRUK_KATEGORI = {
  belanja: 'Belanja', cicilan: 'Cicilan', hiburan: 'Hiburan', hobi: 'Hobi',
  ibadah: 'Ibadah', kesehatan: 'Kesehatan', kuliner: 'Kuliner',
  pendidikan: 'Pendidikan', rumah: 'Rumah', tabungan: 'Tabungan',
  transportasi: 'Transportasi', utilitas: 'Utilitas', lainnya: 'Lainnya',
};

function labelKategoriStruk(id) {
  return STRUK_KATEGORI[id] || 'Lainnya';
}

/** Ringkasan bernomor untuk pending struk. */
function ringkasanStruk(p, prefs) {
  const rincian = Array.isArray(p.items) ? p.items : [];
  const maxTampil = Number.isInteger(prefs?.summaryItems) ? prefs.summaryItems : 5;
  let itemLine = '';
  if (rincian.length) {
    const tampil = rincian.slice(0, maxTampil).map((it) => `${it.name} ${fmtRp(it.price)}`).join(', ');
    const sisa = rincian.length - Math.min(maxTampil, rincian.length);
    itemLine = `\nRincian: ${tampil}${sisa > 0 ? `, +${sisa} item lain` : ''}`;
  }
  return [
    '🧾 Struk terbaca. Periksa dulu:',
    `1. Toko: ${p.merchant || '-'}`,
    `2. Total: ${fmtRp(p.total)}`,
    `3. Tanggal: ${p.date || 'tidak terbaca'}`,
    `4. Kategori: ${labelKategoriStruk(p.category)}`,
  ].join('\n') + itemLine + '\n\nBalas nomor + nilai untuk koreksi (mis. 2 18500), *ya* untuk simpan, *batal* untuk buang. Berlaku 10 menit.';
}

/** "2 18500" / "1 Indomaret" / "3 2026-11-17" / "4 kuliner". */
function koreksiStruk(text, pending) {
  const m = String(text || '').trim().match(/^([1-4])\s*[.:=\-]?\s*(.+)$/);
  if (!m) return null;
  const field = Number(m[1]);
  const value = m[2].trim();
  const next = { ...pending };

  if (field === 1) {
    if (value.length < 2) return { error: 'Nama toko terlalu pendek.' };
    next.merchant = value.slice(0, 120);
  } else if (field === 2) {
    const amount = parseAmountToken(value.replace(/\s+/g, ''));
    if (!amount || amount <= 0) return { error: 'Nominal tidak dikenali. Contoh: 2 18500' };
    next.total = amount;
  } else if (field === 3) {
    const tanggal = parseDateId(value, wibNow().today);
    if (!tanggal) return { error: 'Tanggal tidak dikenali. Contoh: 3 2026-11-17' };
    next.date = tanggal;
  } else {
    const k = value.toLowerCase();
    const found = Object.keys(STRUK_KATEGORI).find((id) => k === id || k.startsWith(id));
    if (!found) {
      return { error: `Kategori tidak dikenal. Pilihan: ${Object.keys(STRUK_KATEGORI).join(', ')}.` };
    }
    next.category = found;
  }
  return { next };
}

/** Foto struk masuk lewat Meta: unduh, baca dengan AI, kirim ringkasan untuk dikoreksi. */
async function handleReceiptImage(env, sender, msg) {
  const ownerId = resolveOwner(env, sender);
  const user = await ensureDbUser(env, sender, ownerId);
  if (!user || !user.id) {
    await replyText(env, sender, 'Nomor Anda belum terdaftar di Bayt Mustaqbal, jadi struk tidak bisa dicatat.');
    return;
  }
  if (!canBotWrite(user)) {
    await replyText(env, sender, WRITE_DENIED);
    return;
  }
  const mediaId = msg?.image?.id;
  if (!mediaId) {
    await replyText(env, sender, 'Foto tidak terbaca. Coba kirim ulang.');
    return;
  }
  // Baca struk AI bisa dimatikan dari Pengaturan (app + WA sekaligus)
  const aiPrefs = await readAiPrefs(env);
  if (aiPrefs.receiptScanEnabled === false) {
    await replyText(env, sender, 'Baca struk lewat AI sedang dimatikan di Pengaturan (Bot WhatsApp). Ketik manual, contoh: "catat pengeluaran 50rb makan siang".');
    return;
  }

  await replyText(env, sender, 'Foto diterima. Sedang membaca struk...');
  const media = await downloadMetaImage(env, mediaId);
  if (media.error) {
    const pesan = {
      TOO_LARGE: 'Foto terlalu besar (maksimal 4 MB). Coba foto ulang dengan ukuran lebih kecil.',
      NOT_IMAGE: 'File bukan gambar. Kirim foto struk (JPEG/PNG).',
      NO_TOKEN: 'Fitur baca struk belum siap: token Meta belum diset.',
    }[media.error] || 'Gagal mengunduh foto dari WhatsApp. Coba kirim ulang.';
    await replyText(env, sender, pesan);
    return;
  }

  const hasil = await scanReceiptImage(env, media.base64, media.mime);
  if (!hasil.ok) {
    const pesan = {
      NO_TOKEN: 'Fitur baca struk belum siap: token backend belum diset.',
      UNREADABLE: 'Struk belum terbaca jelas. Coba foto lebih terang dan tegak, atau catat manual: "catat pengeluaran 50k makan siang".',
      TOO_LARGE: 'Foto terlalu besar (maksimal ±4 MB). Coba foto ulang.',
      NETWORK: 'Server baca struk tidak merespons. Coba lagi sebentar atau catat manual.',
      AI_FAILED: 'Layanan baca struk sedang sibuk. Coba lagi sebentar atau catat manual.',
    }[hasil.code] || 'Gagal membaca struk. Coba lagi atau catat manual.';
    await replyText(env, sender, pesan);
    return;
  }

  const d = hasil.data || {};
  const pending = {
    type: 'receipt',
    merchant: String(d.merchant || '').trim().slice(0, 120),
    total: Number(d.total) || 0,
    date: d.date || null,
    category: STRUK_KATEGORI[d.category] ? d.category : 'lainnya',
    items: Array.isArray(d.items) ? d.items.slice(0, 20) : [],
  };
  if (!pending.merchant || !(pending.total > 0)) {
    await replyText(env, sender, 'Struk belum terbaca jelas. Coba foto lebih terang atau catat manual.');
    return;
  }

  const lama = await getPending(env, sender);
  await setPending(env, sender, pending);
  const awalan = lama && lama.type === 'receipt' ? 'Ringkasan sebelumnya diganti.\n\n' : '';
  await replyText(env, sender, awalan + ringkasanStruk(pending, aiPrefs));
}

async function executePending(env, pending, user) {
  if (pending.type === 'expense') {
    const saved = await insertExpense(env, {
      userId: user.id,
      groupId: user.group_id || null,
      amount: pending.amount,
      note: pending.note || null,
    });
    const ym = new Date().toISOString().slice(0, 7);
    const total = await monthExpenseTotal(env, { userId: user.id, groupId: user.group_id, ym });
    let hint = '';
    if (user.group_id) {
      try {
        const templates = await listRecurringTemplates(env, user.group_id);
        const hit = matchRecurringTemplate(templates, pending.note || '');
        if (hit) {
          hint = hit.intervalDays
            ? `\n\n🔄 Cocok transaksi berulang "${hit.nama}". Tekan "Sudah beli" di app (tab Berulang) supaya jadwal pengingat dihitung ulang. Perkiraan habis sekarang: ${hit.nextDue || '-'}.`
            : `\n\n🔄 Cocok transaksi berulang "${hit.nama}". Tekan "Sudah beli" di app (tab Berulang). Interval belum bisa dihitung, butuh minimal 2 pembelian.`;
        }
      } catch { /* hint opsional, jangan gagalkan pencatatan */ }
    }
    return {
      message: `Tercatat: ${fmtRp(pending.amount)}${pending.note ? ` (${pending.note})` : ''}.\nTotal pengeluaran ${user.group_id ? 'keluarga' : 'Anda'} bulan ini: ${fmtRp(total)}.${hint}${undoHint()}`,
      undo: { kind: 'transaction', id: saved.id, type: 'out', amount: pending.amount, accountId: null },
    };
  }
  if (pending.type === 'receipt') {
    const kategori = await existingCategoryId(env, pending.category);
    const saved = await insertExpense(env, {
      userId: user.id,
      groupId: user.group_id || null,
      amount: pending.total,
      note: pending.merchant || null,
      date: pending.date || undefined,
      categoryId: kategori,
      items: pending.items,
    });
    const ym = saved.today.slice(0, 7);
    const total = await monthExpenseTotal(env, { userId: user.id, groupId: user.group_id, ym });
    return {
      message: `Tercatat: ${pending.merchant} ${fmtRp(pending.total)} (${kategori ? labelKategoriStruk(kategori) : 'tanpa kategori'}) tanggal ${saved.today}.\nTotal pengeluaran ${user.group_id ? 'keluarga' : 'Anda'} bulan ${ym}: ${fmtRp(total)}.${undoHint()}`,
      undo: { kind: 'transaction', id: saved.id, type: 'out', amount: pending.total, accountId: null },
    };
  }
  if (pending.type === 'income') {
    const res = await insertIncome(env, {
      userId: user.id,
      groupId: user.group_id || null,
      amount: pending.amount,
      note: pending.note || null,
      accountId: pending.accountId || null,
    });
    const ym = new Date().toISOString().slice(0, 7);
    const total = await monthIncomeTotal(env, { userId: user.id, groupId: user.group_id, ym });
    const ke = res.accountName ? ` ke dompet ${res.accountName}` : '';
    return {
      message: `Tercatat: pemasukan ${fmtRp(pending.amount)}${pending.note ? ` (${pending.note})` : ''}${ke}.\nTotal pemasukan ${user.group_id ? 'keluarga' : 'Anda'} bulan ini: ${fmtRp(total)}.${undoHint()}`,
      undo: { kind: 'transaction', id: res.id, type: 'in', amount: pending.amount, accountId: pending.accountId || null },
    };
  }
  if (pending.type === 'reminder') {
    const id = await insertReminder(env, {
      userId: user.id,
      groupId: user.group_id || null,
      message: pending.message,
      remindAt: pending.remindAt,
    });
    return {
      message: `⏰ Pengingat disimpan: "${pending.message}".\nNanti saya ingatkan lewat WA.${undoHint()}`,
      undo: { kind: 'reminder', id },
    };
  }
  if (pending.type === 'bill') {
    const saved = await insertBill(env, {
      userId: user.id,
      name: pending.name,
      amount: pending.amount,
      dueDate: pending.dueDate,
      kategori: pending.kategori || null,
    });
    return {
      message: `🧾 Tagihan disimpan: ${pending.name} ${fmtRp(pending.amount)}, jatuh tempo ${pending.dueDate}.\nSaya ingatkan lewat WA saat jatuh tempo.${undoHint()}`,
      undo: { kind: 'bill', id: saved.id },
    };
  }
  if (pending.type === 'agenda') {
    const saved = await insertAgenda(env, {
      userId: user.id,
      groupId: user.group_id || null,
      title: pending.title,
      date: pending.date,
      time: pending.time || null,
      category: pending.category || 'keluarga',
      description: pending.description || null,
    });
    return {
      message: `📅 Agenda disimpan: ${pending.title} pada ${pending.date}${pending.time ? ` jam ${pending.time}` : ''}.\nSudah muncul di kalender aplikasi.${undoHint()}`,
      undo: { kind: 'agenda', id: saved.id },
    };
  }
  return { message: 'Aksi tidak dikenal.', undo: null };
}

async function answerReadIntent(env, user, intent, obj) {
  const { today, month } = wibNow();
  const groupId = user?.group_id;
  if (intent === 'menu') return menuText();
  if (intent === 'cek_pengingat') {
    if (!user) return 'Nomor Anda belum terdaftar di Bayt Mustaqbal.';
    return formatReminders(await listReminders(env, user.id));
  }
  if (!groupId) {
    return 'Akun belum tergabung ke grup keluarga, jadi data keluarga belum bisa ditampilkan.';
  }
  if (intent === 'tanya_data') {
    const METRICS = new Set(['pengeluaran_total', 'pemasukan_total', 'saldo_dompet', 'tagihan_belum', 'top_kategori', 'transaksi_terakhir']);
    const metric = typeof obj?.metric === 'string' ? obj.metric : 'pengeluaran_total';
    if (!METRICS.has(metric)) {
      return 'Pertanyaan itu belum bisa saya jawab dari data. Coba tanya total pengeluaran/pemasukan, saldo dompet, tagihan belum lunas, kategori terbesar, atau transaksi terakhir.';
    }
    const period = ['bulan_ini', 'bulan_lalu', '7_hari', '30_hari', 'tahun_ini'].includes(obj?.period)
      ? obj.period
      : 'bulan_ini';
    if (metric === 'saldo_dompet') {
      return formatWallets(await queryWalletBalances(env, groupId));
    }
    if (metric === 'tagihan_belum') {
      return formatBills(await queryBills(env, groupId));
    }
    if (metric === 'transaksi_terakhir') {
      return formatLastTxns(await queryLastTransactions(env, groupId, 5));
    }
    const { from, to } = periodRange(period, today);
    if (metric === 'top_kategori') {
      return formatTopCategories(await queryTopCategories(env, groupId, from, to, 5), period);
    }
    const category = typeof obj?.category === 'string' && obj.category.trim() ? obj.category.trim() : null;
    const wallet = typeof obj?.wallet === 'string' && obj.wallet.trim() ? obj.wallet.trim() : null;
    const type = metric === 'pemasukan_total' ? 'in' : 'out';
    const { total, count } = await queryTxTotal(env, { groupId, type, from, to, category, wallet });
    const extra = [category ? `kategori ${category}` : '', wallet ? `dompet ${wallet}` : ''].filter(Boolean).join(', ');
    const title = `${type === 'in' ? 'Pemasukan' : 'Pengeluaran'}${extra ? ` ${extra}` : ''} ${periodLabel(period)}`;
    return formatTotalMetric({ title, period, total, count });
  }
  if (intent === 'saldo_bulan_ini') {
    const s = await querySaldo(env, groupId, month);
    return formatSaldo(s.inMonth, s.outMonth);
  }
  if (intent === 'agenda_hari_ini') {
    return formatAgenda(await queryAgenda(env, groupId, today), today);
  }
  if (intent === 'cek_tagihan') {
    return formatBills(await queryBills(env, groupId));
  }
  if (intent === 'target_tabungan') {
    return formatGoals(await queryGoals(env, groupId));
  }
  if (intent === 'rincian_kategori') {
    return formatCategoryDetail(await queryCategoryDetail(env, groupId, month));
  }
  if (intent === 'rangkuman') {
    let from; let title;
    if (obj?.period === '7_hari') {
      const d = new Date(Date.now() + 7 * 3600 * 1000 - 6 * 86400 * 1000);
      from = d.toISOString().slice(0, 10);
      title = 'Rangkuman Pengeluaran 7 Hari Terakhir';
    } else {
      from = month + '-01';
      title = 'Rangkuman Pengeluaran Bulan Ini';
    }
    const { rows } = await querySummary(env, groupId, from, today, title);
    return formatSummary(rows, title);
  }
  return null;
}

/** Batas balasan per pengirim per menit; lebih dari itu hentikan (cegah loop). */
const MAX_BURST_PER_MINUTE = 6;
const BURST_WINDOW_MS = 60000;

/** State murni penjaga ledakan; bisa diuji tanpa KV.
    Kembalikan { allowed, next } di mana next state untuk disimpan. */
export function nextBurstState(prev, bucket, max) {
  const cur = prev && prev.bucket === bucket ? prev : { bucket, count: 0 };
  const count = cur.count + 1;
  return { allowed: count <= max, next: { bucket, count }, rejected: count > max };
}

async function isBurstAllowed(env, sender, bucket) {
  if (!env.WA_DEDUPE) return true;
  const key = `fonnte:burst:${sender}`;
  try {
    const raw = await env.WA_DEDUPE.get(key);
    const prev = raw ? JSON.parse(raw) : null;
    const { allowed, next } = nextBurstState(prev, bucket, MAX_BURST_PER_MINUTE);
    if (allowed) {
      await env.WA_DEDUPE.put(key, JSON.stringify(next), { expirationTtl: Math.ceil((BURST_WINDOW_MS * 2) / 1000) });
    }
    return allowed;
  } catch (_) {
    return true;
  }
}

async function processFonnte(env, payload) {
  const senderRaw = String(payload.sender || payload.member || '').trim();
  const text = payload.message || payload.text || null;
  if (!senderRaw || !text) return;

  const bucket = Math.floor(Date.now() / BURST_WINDOW_MS);

  // ---- Grup (Neuro): baca-saja, trigger "neuro ..." ----
  if (senderRaw.includes('@g.us') || senderRaw.includes('@broadcast')) {
    const groupId = senderRaw;
    const member = String(payload.member || '').trim().replace(/@.*/, '');
    const profileName = String(payload.name || '').trim();
    if (!member) return; // tanpa nomor pengirim, abaikan
    const query = groupQueryFrom(text);
    if (query === null) return; // bukan perintah untuk bot
    const minute = new Date().toISOString().slice(0, 16);
    const dedupeKey = `fonnte:group:${groupId}:${member}:${minute}:${text}`;
    if (env.WA_DEDUPE) {
      const seen = await env.WA_DEDUPE.get(dedupeKey);
      if (seen) return;
      await env.WA_DEDUPE.put(dedupeKey, '1', { expirationTtl: 86400 });
    }
    try {
      await env.WA_LOGS.prepare(
        `INSERT INTO wa_messages (message_id, from_number, phone_number_id, message_text, timestamp, processed)
         VALUES (?, ?, ?, ?, ?, false)
         ON CONFLICT(message_id) DO NOTHING`
      ).bind(dedupeKey, member, 'fonnte', `[group:${groupId}] ${text}`, minute).run();
    } catch (_) {}
    if (!(await isBurstAllowed(env, member, bucket))) return;
    await handleGroupQuery(env, { groupId, member, name: profileName, query });
    return;
  }
  const sender = senderRaw;

  // Dedupe + log
  const minute = new Date().toISOString().slice(0, 16);
  const dedupeKey = `fonnte:${sender}:${minute}:${text}`;
  if (env.WA_DEDUPE) {
    const seen = await env.WA_DEDUPE.get(dedupeKey);
    if (seen) return;
    await env.WA_DEDUPE.put(dedupeKey, '1', { expirationTtl: 86400 });
  }
  try {
    await env.WA_LOGS.prepare(
      `INSERT INTO wa_messages (message_id, from_number, phone_number_id, message_text, timestamp, processed)
       VALUES (?, ?, ?, ?, ?, false)
       ON CONFLICT(message_id) DO NOTHING`
    ).bind(dedupeKey, sender, 'fonnte', text, minute).run();
  } catch (_) {}

  if (!(await isBurstAllowed(env, sender, bucket))) return;
  await handleIncomingText(env, sender, text);
}

async function handleFonnte(request, env, ctx) {
  const slash = request.url.indexOf('/fonnte/');
  if (slash === -1) {
    return new Response('Forbidden', { status: 403 });
  }
  const pathSecret = request.url.slice(slash + '/fonnte/'.length).split('?')[0];
  if (!env.FONNTE_WEBHOOK_PATH || pathSecret !== env.FONNTE_WEBHOOK_PATH) {
    return new Response('Forbidden', { status: 403 });
  }

  let payload;
  try { payload = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  // Balas 200 cepat lalu proses di background, supaya platform tidak retry
  // saat AI lambat (retry menyebabkan pemrosesan ulang berulang).
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(processFonnte(env, payload));
    return JSON_OK();
  }
  await processFonnte(env, payload);
  return JSON_OK();
}

/** Gaya bahasa milik sendiri; berlaku untuk semua peran (self-service).
    Balas ke target (chat 1:1 atau grup). */
async function handleStyleCommand(env, user, t, target) {
  const styleCmd = parseStyleCommand(t);
  if (!styleCmd) return false;
  if (!user) {
    await replyText(env, target, 'Nomor Anda belum terdaftar di Bayt Mustaqbal. Hubungi admin.');
    return true;
  }
  if (styleCmd.value === null) {
    const current = resolveFor(await readAiPrefs(env), user.id).style;
    await replyText(env, target, `Gaya bahasa kamu saat ini: ${current}. Pilihan: santai, hangat, formal, profesional. Ketik "gaya <pilihan>" untuk mengubah, atau "gaya default" untuk kembali ke default keluarga.`);
    return true;
  }
  const result = await setMemberStyle(env, user, styleCmd.value);
  if (!result.ok) {
    await replyText(env, target, 'Gagal mengubah gaya bahasa. Coba lagi sebentar.');
    return true;
  }
  await replyText(env, target, result.reset
    ? 'Gaya bahasa kamu kembali ke default keluarga.'
    : `Gaya bahasa diubah ke ${result.style.charAt(0).toUpperCase() + result.style.slice(1)}.`);
  return true;
}

/** Alur baca-saja untuk pesan di grup Neuro (trigger "neuro ..."). */
async function handleGroupQuery(env, { groupId, member, name, query }) {
  let user = null;
  const mapped = await findUserByLid(env, member);
  if (mapped?.user_id) user = await findUserById(env, mapped.user_id);
  if (!user || !user.id) {
    user = await ensureDbUser(env, member, resolveOwner(env, member));
    if (user && user.id) await saveIdentity(env, member, user.id, name || null);
  }
  // Nomor/LID tak dikenal: abaikan total, tanpa balasan.
  if (!user || !user.id) return;
  // Hanya kepala keluarga, suami, istri yang dibalas di grup.
  if (!canBotWrite(user)) return;
  const text = String(query || '').trim();
  const personaName = user ? (user.nickname || (user.nama || '').split(' ')[0] || '').trim() || null : null;
  const aiPrefs = resolveFor(await readAiPrefs(env), user?.id);

  if (!text) {
    await replyText(env, groupId, 'Halo! Saya Neuro. Di grup ini saya hanya bisa baca data. Contoh: "neuro saldo bulan ini", "neuro tagihan belum lunas", "neuro agenda hari ini", "neuro rangkuman 7 hari". Untuk mencatat, chat saya pribadi atau buka app.');
    return;
  }
  // Gaya bahasa milik sendiri (self-service, mengizinkan semua peran)
  if (await handleStyleCommand(env, user, text, groupId)) return;
  if (isMenu(text)) {
    await replyText(env, groupId, menuText());
    return;
  }
  const ai = await detectIntent(env, text, wibContext(), personaName, aiPrefs);
  if (ai && GROUP_READ_INTENTS.has(ai.intent)) {
    const msg = await answerReadIntent(env, user, ai.intent, ai);
    if (msg) {
      await replyText(env, groupId, msg);
      return;
    }
  }
  await replyText(env, groupId, 'Di grup ini saya hanya bisa baca data (saldo, tagihan, agenda, ringkasan, tanya angka). Untuk mencatat atau pengingat, chat saya pribadi atau buka app.');
}

/** Alur percakapan bersama untuk semua kanal (Fonnte maupun Meta). */
async function handleIncomingText(env, sender, text) {
  if (String(sender || '').includes('@')) return JSON_OK(); // grup/broadcast bukan target bot
  const ownerId = resolveOwner(env, sender); // cadangan: petakan nomor ke user_id
  const user = await ensureDbUser(env, sender, ownerId);
  // Override per anggota (persona/gaya/kalimat) menang atas default keluarga
  const aiPrefs = resolveFor(await readAiPrefs(env), user?.id);
  const personaName = user ? (user.nickname || (user.nama || '').split(' ')[0] || '').trim() || null : null;
  const t = String(text || '').trim();

  // 1) Konfirmasi aksi tertunda
  const pending = await getPending(env, sender);
  if (pending) {
    // Pending struk: koreksi bernomor dulu, sebelum ya/batal dan intent lain.
    if (pending.type === 'receipt') {
      const koreksi = koreksiStruk(t, pending);
      if (koreksi?.error) {
        await replyText(env, sender, koreksi.error);
        return JSON_OK();
      }
      if (koreksi?.next) {
        await setPending(env, sender, koreksi.next);
        await replyText(env, sender, ringkasanStruk(koreksi.next, aiPrefs));
        return JSON_OK();
      }
    }
    if (isYes(t)) {
      if (!user || !user.id) {
        await clearPending(env, sender);
        await replyText(env, sender, 'Nomor Anda belum terdaftar di Bayt Mustaqbal, jadi aksi tidak bisa disimpan.');
        return JSON_OK();
      }
      if (!canBotWrite(user)) {
        await clearPending(env, sender);
        await replyText(env, sender, WRITE_DENIED);
        return JSON_OK();
      }
      try {
        const { message, undo } = await executePending(env, pending, user);
        await clearPending(env, sender);
        if (undo) await setLastAction(env, sender, undo);
        await replyText(env, sender, message);
      } catch (e) {
        await replyText(env, sender, 'Gagal menyimpan. Coba lagi sebentar.');
      }
      return JSON_OK();
    }
    if (isNo(t)) {
      await clearPending(env, sender);
      await replyText(env, sender, 'Baik, dibatalkan.');
      return JSON_OK();
    }
    // pesan lain saat ada pending: ingatkan konfirmasi
    await replyText(env, sender, pending.type === 'receipt'
      ? 'Ringkasan struk masih menunggu. Balas nomor + nilai (mis. *2 18500*), *ya* untuk simpan, atau *batal* untuk buang.'
      : 'Masih ada aksi yang menunggu konfirmasi. Balas *ya* untuk simpan atau *batal* untuk batalkan.');
    return JSON_OK();
  }

  // 1b) Undo aksi tulis terakhir (berlaku 10 menit)
  if (isUndoCommand(t)) {
    const last = await getLastAction(env, sender);
    if (!last) {
      await replyText(env, sender, 'Tidak ada aksi yang bisa dibatalkan. Undo hanya berlaku 10 menit setelah pencatatan.');
      return JSON_OK();
    }
    if (!canBotWrite(user)) {
      await replyText(env, sender, WRITE_DENIED);
      return JSON_OK();
    }
    let ok = false;
    try {
      ok = await undoAction(env, last, user.id);
    } catch (_) { ok = false; }
    if (ok) await clearLastAction(env, sender);
    await replyText(env, sender, ok
      ? 'Aksi terakhir sudah dibatalkan.'
      : 'Gagal membatalkan: aksi sudah tidak ada atau di luar batas waktu.');
    return JSON_OK();
  }

  // 2) Menu / sapaan
  if (isMenu(t)) {
    await replyText(env, sender, menuText());
    return JSON_OK();
  }

  // 2b) Gaya bahasa milik sendiri (tanpa AI; semua peran boleh)
  const styleHandled = await handleStyleCommand(env, user, t, sender);
  if (styleHandled) return JSON_OK();

  // 3) Cek pengingat (baca, tanpa konfirmasi)
  if (wantsReminderList(t)) {
    if (!user) {
      await replyText(env, sender, 'Nomor Anda belum terdaftar di Bayt Mustaqbal.');
      return JSON_OK();
    }
    await replyText(env, sender, formatReminders(await listReminders(env, user.id)));
    return JSON_OK();
  }

  // 4) Fast-path catat pengeluaran (rule-based, minta konfirmasi)
  const exp = parseExpense(t);
  if (exp) {
    if (!user) {
      await replyText(env, sender, 'Akun Anda belum ditemukan di data keluarga. Hubungi admin.');
      return JSON_OK();
    }
    if (!canBotWrite(user)) {
      await replyText(env, sender, WRITE_DENIED);
      return JSON_OK();
    }
    if (!exp.amount) {
      await replyText(env, sender, 'Format nominal belum jelas. Contoh: catat pengeluaran 50k makan siang');
      return JSON_OK();
    }
    const action = { type: 'expense', amount: exp.amount, note: exp.note || null };
    await setPending(env, sender, action);
    await replyText(env, sender, confirmExpense(action));
    return JSON_OK();
  }

  // 4b) Fast-path catat pemasukan (rule-based, minta konfirmasi)
  const inc = parseIncome(t);
  if (inc) {
    if (!user) {
      await replyText(env, sender, 'Akun Anda belum ditemukan di data keluarga. Hubungi admin.');
      return JSON_OK();
    }
    if (!canBotWrite(user)) {
      await replyText(env, sender, WRITE_DENIED);
      return JSON_OK();
    }
    if (!inc.amount) {
      await replyText(env, sender, 'Format nominal belum jelas. Contoh: catat pemasukan 5jt gaji ke dompet BCA');
      return JSON_OK();
    }
    let accountId = null; let accountName = null;
    if (inc.accountHint) {
      const accounts = await listOwnedAccounts(env, user.id);
      const match = matchAccountHint(accounts, inc.accountHint);
      if (!match) {
        const names = accounts.map((a) => a.nama).filter(Boolean).join(', ');
        await replyText(env, sender, `Dompet "${inc.accountHint}" tidak ditemukan milik Anda.${names ? ` Dompet Anda: ${names}.` : ''} Sebutkan nama dompet yang benar, atau kirim tanpa dompet.`);
        return JSON_OK();
      }
      accountId = match.id; accountName = match.nama;
    }
    const action = { type: 'income', amount: inc.amount, note: inc.note || null, accountId, accountName };
    await setPending(env, sender, action);
    await replyText(env, sender, confirmIncome(action));
    return JSON_OK();
  }

  // 5) AI intent
  const ai = await detectIntent(env, t, wibContext(), personaName, aiPrefs);

  // 5a) set pengingat (AI) — minta konfirmasi
  if (ai?.intent === 'set_pengingat') {
    if (!user) {
      await replyText(env, sender, 'Akun Anda belum ditemukan di data keluarga. Hubungi admin.');
      return JSON_OK();
    }
    if (!canBotWrite(user)) {
      await replyText(env, sender, WRITE_DENIED);
      return JSON_OK();
    }
    const spec = {
      dayOffset: ai.dayOffset === 1 ? 1 : 0,
      hour: Number.isInteger(ai.hour) ? Math.min(23, Math.max(0, ai.hour)) : 9,
      minute: Number.isInteger(ai.minute) ? Math.min(59, Math.max(0, ai.minute)) : 0,
      message: typeof ai.message === 'string' && ai.message.trim() ? ai.message.trim().slice(0, 200) : null,
    };
    if (!spec.message) {
      const local = parseReminderLocal(t);
      if (local) { spec.dayOffset = local.dayOffset; spec.hour = local.hour; spec.minute = local.minute; spec.message = local.message; }
    }
    if (!spec.message) {
      await replyText(env, sender, 'Isi pengingatnya apa? Contoh: "ingatkan aku besok jam 9 bayar listrik".');
      return JSON_OK();
    }
    const action = { type: 'reminder', message: spec.message, remindAt: reminderIso(spec), remindAtLabel: formatRemindAtLabel(spec) };
    await setPending(env, sender, action);
    await replyText(env, sender, confirmReminder(action));
    return JSON_OK();
  }

  // 5b) catat pengeluaran (AI fallback) — minta konfirmasi
  if (ai?.intent === 'catat_pengeluaran') {
    if (!user) {
      await replyText(env, sender, 'Akun Anda belum ditemukan di data keluarga. Hubungi admin.');
      return JSON_OK();
    }
    if (!canBotWrite(user)) {
      await replyText(env, sender, WRITE_DENIED);
      return JSON_OK();
    }
    const amount = Number(ai.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      await replyText(env, sender, 'Saya belum menangkap nominalnya. Contoh: "catat pengeluaran 50 ribu makan siang".');
      return JSON_OK();
    }
    const note = typeof ai.note === 'string' && ai.note.trim() ? ai.note.trim().slice(0, 200) : null;
    const action = { type: 'expense', amount: Math.round(amount), note };
    await setPending(env, sender, action);
    await replyText(env, sender, confirmExpense(action));
    return JSON_OK();
  }

  // 5b2) catat pemasukan (AI) — minta konfirmasi
  if (ai?.intent === 'catat_pemasukan') {
    if (!user) {
      await replyText(env, sender, 'Akun Anda belum ditemukan di data keluarga. Hubungi admin.');
      return JSON_OK();
    }
    if (!canBotWrite(user)) {
      await replyText(env, sender, WRITE_DENIED);
      return JSON_OK();
    }
    const amount = Number(ai.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      await replyText(env, sender, 'Saya belum menangkap nominal pemasukan. Contoh: "catat pemasukan 5 juta gaji ke dompet BCA".');
      return JSON_OK();
    }
    const note = typeof ai.note === 'string' && ai.note.trim() ? ai.note.trim().slice(0, 200) : null;
    const accountHint = typeof ai.account === 'string' && ai.account.trim() ? ai.account.trim().slice(0, 100) : null;
    let accountId = null; let accountName = null;
    if (accountHint) {
      const accounts = await listOwnedAccounts(env, user.id);
      const match = matchAccountHint(accounts, accountHint);
      if (!match) {
        const names = accounts.map((a) => a.nama).filter(Boolean).join(', ');
        await replyText(env, sender, `Dompet "${accountHint}" tidak ditemukan milik Anda.${names ? ` Dompet Anda: ${names}.` : ''} Sebutkan nama dompet yang benar, atau kirim tanpa dompet.`);
        return JSON_OK();
      }
      accountId = match.id; accountName = match.nama;
    }
    const action = { type: 'income', amount: Math.round(amount), note, accountId, accountName };
    await setPending(env, sender, action);
    await replyText(env, sender, confirmIncome(action));
    return JSON_OK();
  }

  // 5c) tambah tagihan (AI) — minta konfirmasi
  if (ai?.intent === 'tambah_tagihan') {
    if (!user) {
      await replyText(env, sender, 'Akun Anda belum ditemukan di data keluarga. Hubungi admin.');
      return JSON_OK();
    }
    if (!canBotWrite(user)) {
      await replyText(env, sender, WRITE_DENIED);
      return JSON_OK();
    }
    const name = typeof ai.name === 'string' && ai.name.trim() ? ai.name.trim().slice(0, 120) : null;
    if (!name) {
      await replyText(env, sender, 'Nama tagihannya apa? Contoh: "tambah tagihan listrik 350k tgl 25".');
      return JSON_OK();
    }
    const amount = Number(ai.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      await replyText(env, sender, `Nominal tagihan "${name}" berapa? Contoh: "tambah tagihan listrik 350k tgl 25".`);
      return JSON_OK();
    }
    const todayIso = wibContext().today;
    const dueDate = parseDateId(typeof ai.dueDate === 'string' ? ai.dueDate : '', todayIso) || parseDateId(t, todayIso);
    if (!dueDate) {
      await replyText(env, sender, `Tanggal jatuh tempo "${name}" kapan? Sebutkan jelas, misalnya "tgl 25", "25 nov", atau "besok".`);
      return JSON_OK();
    }
    const kategori = typeof ai.kategori === 'string' && ai.kategori.trim() ? ai.kategori.trim().slice(0, 40) : null;
    const action = { type: 'bill', name, amount: Math.round(amount), dueDate, kategori };
    await setPending(env, sender, action);
    await replyText(env, sender, confirmBill(action));
    return JSON_OK();
  }

  // 5d) tambah agenda (AI) — minta konfirmasi
  if (ai?.intent === 'tambah_agenda') {
    if (!user) {
      await replyText(env, sender, 'Akun Anda belum ditemukan di data keluarga. Hubungi admin.');
      return JSON_OK();
    }
    if (!canBotWrite(user)) {
      await replyText(env, sender, WRITE_DENIED);
      return JSON_OK();
    }
    const title = typeof ai.title === 'string' && ai.title.trim() ? ai.title.trim().slice(0, 140) : null;
    if (!title) {
      await replyText(env, sender, 'Judul agendanya apa? Contoh: "tambah agenda rapat keluarga 25 nov jam 19.30".');
      return JSON_OK();
    }
    const todayIso = wibContext().today;
    const date = parseDateId(typeof ai.date === 'string' ? ai.date : '', todayIso) || parseDateId(t, todayIso);
    if (!date) {
      await replyText(env, sender, `Tanggal agenda "${title}" kapan? Sebutkan jelas, misalnya "25 nov" atau "besok".`);
      return JSON_OK();
    }
    const time = parseTimeId(typeof ai.time === 'string' ? ai.time : '') || parseTimeId(t);
    const action = { type: 'agenda', title, date, time, category: 'keluarga' };
    await setPending(env, sender, action);
    await replyText(env, sender, confirmAgenda(action));
    return JSON_OK();
  }

  // 5e) intent baca
  const readIntents = new Set(['cek_pengingat','cek_tagihan','agenda_hari_ini','saldo_bulan_ini','rangkuman','rincian_kategori','target_tabungan','tanya_data','menu']);
  if (ai && readIntents.has(ai.intent)) {
    const msg = await answerReadIntent(env, user, ai.intent, ai);
    if (msg) { await replyText(env, sender, msg); return JSON_OK(); }
  }

  // 5f) AI chat / fallback (selalu lewat chatReply agar konteks nama pengirim terbawa)
  if (ai?.intent === 'chat') {
    const fallback = await chatReply(env, t, personaName, aiPrefs);
    await replyText(env, sender, fallback || menuText());
    return JSON_OK();
  }

  const fallback = await chatReply(env, t, personaName, aiPrefs);
  await replyText(env, sender, fallback || menuText());
  return JSON_OK();
}

// ============================= /api/expenses =============================

async function handleGetExpenses(request, env) {
  const token = request.headers.get('X-App-Token');
  if (!env.APP_TOKEN || token !== env.APP_TOKEN) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders() });
  }
  const reqUrl = new URL(request.url);
  const limit = Math.min(parseInt(reqUrl.searchParams.get('limit') || '50', 10) || 50, 200);
  const ym = reqUrl.searchParams.get('ym');
  const uid = reqUrl.searchParams.get('uid');
  if (!env.APP_DB) {
    return new Response(JSON.stringify({ error: 'db not bound' }), { status: 500, headers: corsHeaders() });
  }

  let rows;
  if (ym && uid) {
    rows = await env.APP_DB.prepare(
      `SELECT id, amount, description, date, created_at FROM transactions WHERE void IS NULL AND type = 'out' AND user_id = ? AND date LIKE ? ORDER BY date DESC, created_at DESC LIMIT ?`
    ).bind(uid, `${ym}-%`, limit).all();
  } else if (ym) {
    rows = await env.APP_DB.prepare(
      `SELECT id, amount, description, date, created_at FROM transactions WHERE void IS NULL AND type = 'out' AND date LIKE ? ORDER BY date DESC, created_at DESC LIMIT ?`
    ).bind(`${ym}-%`, limit).all();
  } else if (uid) {
    rows = await env.APP_DB.prepare(
      `SELECT id, amount, description, date, created_at FROM transactions WHERE void IS NULL AND type = 'out' AND user_id = ? ORDER BY date DESC, created_at DESC LIMIT ?`
    ).bind(uid, limit).all();
  } else {
    rows = await env.APP_DB.prepare(
      `SELECT id, amount, description, date, created_at FROM transactions WHERE void IS NULL AND type = 'out' ORDER BY date DESC, created_at DESC LIMIT ?`
    ).bind(limit).all();
  }

  const ymNow = new Date().toISOString().slice(0, 7);
  let totalStmt;
  if (uid) {
    totalStmt = env.APP_DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE void IS NULL AND type = 'out' AND user_id = ? AND date LIKE ?`
    ).bind(uid, `${ymNow}-%`);
  } else {
    totalStmt = env.APP_DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE void IS NULL AND type = 'out' AND date LIKE ?`
    ).bind(`${ymNow}-%`);
  }
  const totalRow = await totalStmt.first();

  return new Response(
    JSON.stringify({ expenses: rows.results ?? [], total_this_month: totalRow?.total ?? 0 }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
  );
}

// ============================= META (WhatsApp Cloud API) =============================

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Status pengiriman (sent/delivered/read/failed) dicatat di wa_messages
// dengan prefix message_id agar tidak bertabrakan dengan pesan masuk.
async function logStatus(env, status, phoneNumberId) {
  const id = status?.id;
  const state = status?.status || 'unknown';
  if (!id) return;
  if (env.WA_DEDUPE) {
    const k = `meta-status:${id}:${state}`;
    if (await env.WA_DEDUPE.get(k)) return;
    await env.WA_DEDUPE.put(k, '1', { expirationTtl: 86400 });
  }
  const note = status.errors ? ' ' + JSON.stringify(status.errors).slice(0, 300) : '';
  try {
    await env.WA_LOGS.prepare(
      `INSERT INTO wa_messages (message_id, from_number, phone_number_id, message_text, timestamp, processed)
       VALUES (?, ?, ?, ?, ?, true)
       ON CONFLICT(message_id) DO NOTHING`
    ).bind(
      `status:${id}:${state}`,
      status.recipient_id || '',
      phoneNumberId,
      `status:${state}${note}`,
      status.timestamp || new Date().toISOString()
    ).run();
  } catch (_) {}
}

async function handleMeta(request, env, ctx) {
  // Verifikasi webhook: Meta mengirim GET dengan hub.challenge.
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const verifyToken = env.WA_VERIFY_TOKEN || env.WA_WEBHOOK_SECRET || '';
    if (
      url.searchParams.get('hub.mode') === 'subscribe' &&
      verifyToken &&
      safeEqual(url.searchParams.get('hub.verify_token') || '', verifyToken)
    ) {
      return new Response(url.searchParams.get('hub.challenge') || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    return new Response('Forbidden', { status: 403 });
  }
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await request.text();
  const appSecret = env.WA_APP_SECRET;
  if (!appSecret) return new Response('WA_APP_SECRET belum diset', { status: 500 });

  // Validasi X-Hub-Signature-256 (HMAC SHA-256 body dengan App Secret Meta).
  const signatureHeader = request.headers.get('X-Hub-Signature-256') || '';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (!safeEqual(signatureHeader, `sha256=${hex}`)) {
    return new Response('Signature verification failed', { status: 401 });
  }

  let payload;
  try { payload = JSON.parse(body); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const job = (async () => {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const phoneNumberId = value.metadata?.phone_number_id || env.WA_PHONE_ID || null;

        for (const st of value.statuses || []) {
          await logStatus(env, st, phoneNumberId);
        }

        for (const msg of value.messages || []) {
          const messageId = msg.id;
          const from = msg.from;
          if (!messageId || !from) continue;

          // Dedupe per kanal, Meta bisa mengirim ulang webhook yang sama.
          if (env.WA_DEDUPE) {
            const k = `meta:${messageId}`;
            if (await env.WA_DEDUPE.get(k)) continue;
            await env.WA_DEDUPE.put(k, '1', { expirationTtl: 86400 });
          }

          const text = msg.type === 'text' ? (msg.text?.body || null) : null;
          const timestamp = msg.timestamp || new Date().toISOString();
          try {
            await env.WA_LOGS.prepare(
              `INSERT INTO wa_messages (message_id, from_number, phone_number_id, message_text, timestamp, processed)
               VALUES (?, ?, ?, ?, ?, false)
               ON CONFLICT(message_id) DO NOTHING`
            ).bind(messageId, from, phoneNumberId, text || `[${msg.type || 'unknown'}]`, timestamp).run();
          } catch (_) {}

          await noteChannel(env, from, 'meta');

          if (msg.type === 'image') {
            await handleReceiptImage(env, from, msg);
            continue;
          }

          if (!text) {
            await replyText(env, from, 'Saya membaca pesan teks dan foto struk. Contoh: "catat pengeluaran 50k makan siang" atau kirim foto struk.');
            continue;
          }
          await handleIncomingText(env, from, text);
        }
      }
    }
  })();

  // Balas 200 cepat supaya Meta tidak mengulang webhook; proses jalan di background.
  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(job);
    return JSON_OK();
  }
  await job;
  return JSON_OK();
}

async function replyViaMeta(accessToken, phoneId, to, text) {
  if (!accessToken || !phoneId) {
    return { ok: false, text: async () => 'meta belum dikonfigurasi (WA_ACCESS_TOKEN / WA_PHONE_ID)' };
  }
  const body = String(text || '').slice(0, 4096);
  return fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
}
