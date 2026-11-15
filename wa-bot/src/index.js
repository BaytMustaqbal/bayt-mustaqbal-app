import { normalizePhone, samePhone, digits } from './phone.js';
import {
  menuText, formatSummary, formatSaldo, formatAgenda, formatBills,
  formatGoals, formatCategoryDetail, formatReminders, confirmExpense, confirmReminder, fmtRp,
} from './format.js';
import {
  wibNow, reminderIso, formatRemindAtLabel, findUserByPhone,
  insertExpense, monthExpenseTotal, querySummary, querySaldo, queryAgenda,
  queryBills, queryGoals, queryCategoryDetail, insertReminder, listReminders,
} from './db.js';
import { parseExpense, isYes, isNo, isMenu, wantsReminderList, parseReminderLocal } from './parse.js';
import { detectIntent, chatReply } from './ai.js';
import { getPending, setPending, clearPending } from './state.js';

const JSON_OK = () => new Response('ok', { status: 200 });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/meta') {
      return handleMeta(request, env);
    }

    if (url.pathname === '/api/expenses' && request.method === 'GET') {
      return handleGetExpenses(request, env);
    }
    if (url.pathname === '/api/expenses' && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname.startsWith('/fonnte/') && request.method === 'POST') {
      return handleFonnte(request, env, url);
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

// Nomor WA -> user_id dari secret WA_ALLOWED (JSON). Tetap dipakai sebagai izin tulis.
function resolveOwner(env, sender) {
  if (!env.WA_ALLOWED) return null;
  let map;
  try { map = JSON.parse(env.WA_ALLOWED); } catch { return null; }
  const d = digits(sender);
  if (map[d]) return map[d];
  const alt = d.startsWith('62') ? '0' + d.slice(2) : '62' + d.replace(/^0/, '');
  return map[alt] || map[normalizePhone(sender)] || null;
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
        `SELECT id, nama, nickname, group_id, phone FROM users WHERE id = ? AND void IS NULL`
      ).bind(ownerId).first();
    } catch { return null; }
  }
  return null;
}

async function executePending(env, pending, user) {
  if (pending.type === 'expense') {
    await insertExpense(env, {
      userId: user.id,
      groupId: user.group_id || null,
      amount: pending.amount,
      note: pending.note || null,
    });
    const ym = new Date().toISOString().slice(0, 7);
    const total = await monthExpenseTotal(env, { userId: user.id, groupId: user.group_id, ym });
    return `Tercatat: ${fmtRp(pending.amount)}${pending.note ? ` (${pending.note})` : ''}.\nTotal pengeluaran ${user.group_id ? 'keluarga' : 'Anda'} bulan ini: ${fmtRp(total)}.`;
  }
  if (pending.type === 'reminder') {
    await insertReminder(env, {
      userId: user.id,
      groupId: user.group_id || null,
      message: pending.message,
      remindAt: pending.remindAt,
    });
    return `⏰ Pengingat disimpan: "${pending.message}".\nNanti saya ingatkan lewat WA.`;
  }
  return 'Aksi tidak dikenal.';
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

async function handleFonnte(request, env, url) {
  const pathSecret = url.pathname.slice('/fonnte/'.length);
  if (!env.FONNTE_WEBHOOK_PATH || pathSecret !== env.FONNTE_WEBHOOK_PATH) {
    return new Response('Forbidden', { status: 403 });
  }

  let payload;
  try { payload = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const sender = payload.sender || payload.member || '';
  const text = payload.message || payload.text || null;
  if (!sender || !text) return JSON_OK();

  // Dedupe + log
  const minute = new Date().toISOString().slice(0, 16);
  const dedupeKey = `fonnte:${sender}:${minute}:${text}`;
  if (env.WA_DEDUPE) {
    const seen = await env.WA_DEDUPE.get(dedupeKey);
    if (seen) return JSON_OK();
    await env.WA_DEDUPE.put(dedupeKey, '1', { expirationTtl: 86400 });
  }
  try {
    await env.WA_LOGS.prepare(
      `INSERT INTO wa_messages (message_id, from_number, phone_number_id, message_text, timestamp, processed)
       VALUES (?, ?, ?, ?, ?, false)
       ON CONFLICT(message_id) DO NOTHING`
    ).bind(dedupeKey, sender, 'fonnte', text, minute).run();
  } catch (_) {}

  const ownerId = resolveOwner(env, sender); // izin tulis (whitelist)
  const user = await ensureDbUser(env, sender, ownerId);
  const personaName = user ? (user.nickname || (user.nama || '').split(' ')[0] || '').trim() || null : null;
  const t = String(text).trim();

  // 1) Konfirmasi aksi tertunda
  const pending = await getPending(env, sender);
  if (pending) {
    if (isYes(t)) {
      if (!user || !user.id) {
        await clearPending(env, sender);
        await replyViaFonnte(env, sender, 'Nomor Anda belum terdaftar di Bayt Mustaqbal, jadi aksi tidak bisa disimpan.');
        return JSON_OK();
      }
      if ((pending.type === 'expense' || pending.type === 'reminder') && ownerId && ownerId !== user.id) {
        // whitelist menunjuk id lain: tolak demi aman
        await clearPending(env, sender);
        await replyViaFonnte(env, sender, 'Nomor ini tidak diizinkan menyimpan data untuk akun tersebut.');
        return JSON_OK();
      }
      try {
        const msg = await executePending(env, pending, user);
        await clearPending(env, sender);
        await replyViaFonnte(env, sender, msg);
      } catch (e) {
        await replyViaFonnte(env, sender, 'Gagal menyimpan. Coba lagi sebentar.');
      }
      return JSON_OK();
    }
    if (isNo(t)) {
      await clearPending(env, sender);
      await replyViaFonnte(env, sender, 'Baik, dibatalkan.');
      return JSON_OK();
    }
    // pesan lain saat ada pending: ingatkan konfirmasi
    await replyViaFonnte(env, sender, 'Masih ada aksi yang menunggu konfirmasi. Balas *ya* untuk simpan atau *batal* untuk batalkan.');
    return JSON_OK();
  }

  // 2) Menu / sapaan
  if (isMenu(t)) {
    await replyViaFonnte(env, sender, menuText());
    return JSON_OK();
  }

  // 3) Cek pengingat (baca, tanpa konfirmasi)
  if (wantsReminderList(t)) {
    if (!user) {
      await replyViaFonnte(env, sender, 'Nomor Anda belum terdaftar di Bayt Mustaqbal.');
      return JSON_OK();
    }
    await replyViaFonnte(env, sender, formatReminders(await listReminders(env, user.id)));
    return JSON_OK();
  }

  // 4) Fast-path catat pengeluaran (rule-based, minta konfirmasi)
  const exp = parseExpense(t);
  if (exp) {
    if (!ownerId) {
      await replyViaFonnte(env, sender, 'Nomor tidak terdaftar untuk mencatat. Hubungi admin.');
      return JSON_OK();
    }
    if (!user) {
      await replyViaFonnte(env, sender, 'Akun Anda belum ditemukan di data keluarga. Hubungi admin.');
      return JSON_OK();
    }
    if (!exp.amount) {
      await replyViaFonnte(env, sender, 'Format nominal belum jelas. Contoh: catat pengeluaran 50k makan siang');
      return JSON_OK();
    }
    const action = { type: 'expense', amount: exp.amount, note: exp.note || null };
    await setPending(env, sender, action);
    await replyViaFonnte(env, sender, confirmExpense(action));
    return JSON_OK();
  }

  // 5) AI intent
  const ai = await detectIntent(env, t, wibContext(), personaName);

  // 5a) set pengingat (AI) — minta konfirmasi
  if (ai?.intent === 'set_pengingat') {
    if (!ownerId) {
      await replyViaFonnte(env, sender, 'Nomor tidak terdaftar untuk membuat pengingat. Hubungi admin.');
      return JSON_OK();
    }
    if (!user) {
      await replyViaFonnte(env, sender, 'Akun Anda belum ditemukan di data keluarga. Hubungi admin.');
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
      await replyViaFonnte(env, sender, 'Isi pengingatnya apa? Contoh: "ingatkan aku besok jam 9 bayar listrik".');
      return JSON_OK();
    }
    const action = { type: 'reminder', message: spec.message, remindAt: reminderIso(spec), remindAtLabel: formatRemindAtLabel(spec) };
    await setPending(env, sender, action);
    await replyViaFonnte(env, sender, confirmReminder(action));
    return JSON_OK();
  }

  // 5b) catat pengeluaran (AI fallback) — minta konfirmasi
  if (ai?.intent === 'catat_pengeluaran') {
    if (!ownerId) {
      await replyViaFonnte(env, sender, 'Nomor tidak terdaftar untuk mencatat. Hubungi admin.');
      return JSON_OK();
    }
    if (!user) {
      await replyViaFonnte(env, sender, 'Akun Anda belum ditemukan di data keluarga. Hubungi admin.');
      return JSON_OK();
    }
    const amount = Number(ai.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      await replyViaFonnte(env, sender, 'Saya belum menangkap nominalnya. Contoh: "catat pengeluaran 50 ribu makan siang".');
      return JSON_OK();
    }
    const note = typeof ai.note === 'string' && ai.note.trim() ? ai.note.trim().slice(0, 200) : null;
    const action = { type: 'expense', amount: Math.round(amount), note };
    await setPending(env, sender, action);
    await replyViaFonnte(env, sender, confirmExpense(action));
    return JSON_OK();
  }

  // 5c) intent baca
  const readIntents = new Set(['cek_pengingat','cek_tagihan','agenda_hari_ini','saldo_bulan_ini','rangkuman','rincian_kategori','target_tabungan','menu']);
  if (ai && readIntents.has(ai.intent)) {
    const msg = await answerReadIntent(env, user, ai.intent, ai);
    if (msg) { await replyViaFonnte(env, sender, msg); return JSON_OK(); }
  }

  // 5d) AI chat / fallback (selalu lewat chatReply agar konteks nama pengirim terbawa)
  if (ai?.intent === 'chat') {
    const fallback = await chatReply(env, t, personaName);
    await replyViaFonnte(env, sender, fallback || menuText());
    return JSON_OK();
  }

  const fallback = await chatReply(env, t, personaName);
  await replyViaFonnte(env, sender, fallback || menuText());
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

// ============================= META (tetap, tidak diubah) =============================

async function handleMeta(request, env) {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (
      url.searchParams.get('hub.mode') === 'subscribe' &&
      url.searchParams.get('hub.verify_token') === env.WA_WEBHOOK_SECRET
    ) {
      return new Response(url.searchParams.get('hub.challenge'), { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signatureHeader = request.headers.get('X-Hub-Signature-256');
  const body = await request.text();
  const secret = env.WA_WEBHOOK_SECRET || '';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (!signatureHeader || signatureHeader !== `sha256=${hex}`) {
    return new Response('Signature verification failed', { status: 401 });
  }

  let payload;
  try { payload = JSON.parse(body); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const entry = payload.entry?.[0];
  if (!entry) return JSON_OK();

  for (const change of entry.changes ?? []) {
    const value = change.value || {};
    const messageId = value.id;
    const from = value.from;
    const message = value.message?.text || null;
    const timestamp = value.timestamp;
    const waPhoneNumberId = value.metadata?.phone_number_id;

    if (env.WA_DEDUPE) {
      const k2 = `msg:${messageId}`;
      const existing = await env.WA_DEDUPE.get(k2);
      if (existing) continue;
      await env.WA_DEDUPE.put(k2, '1', { expirationTtl: 86400 });
    }

    try {
      await env.WA_LOGS.prepare(
        `INSERT INTO wa_messages (message_id, from_number, phone_number_id, message_text, timestamp, processed)
         VALUES (?, ?, ?, ?, ?, false)
         ON CONFLICT(message_id) DO NOTHING`
      ).bind(messageId, from, waPhoneNumberId, message, timestamp).run();
    } catch (_) {}

    if (message) {
      await replyViaMeta(env.WA_ACCESS_TOKEN, env.WA_PHONE_ID, from, 'Anda bilang: ' + message);
    }
  }
  return JSON_OK();
}

async function replyViaMeta(accessToken, phoneId, to, text) {
  return fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  });
}
