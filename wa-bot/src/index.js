// neuro-wa-bot: WA chatbot worker.
// Dukung dua jalur:
//   /meta/<path-secret>  -> WhatsApp Cloud API resmi (Meta)  [belum dipakai, siap nanti]
//   /fonnte/<path-secret> -> Fonnte (WhatsApp Web bridge)    [jalur aktif sekarang]
//
// Secrets (dashboard Cloudflare atau `wrangler secret put`):
//   FONNTE_TOKEN            token device Fonnte, dipakai untuk membalas via api.fonnte.com
//   FONNTE_WEBHOOK_PATH     string rahasia di path callback URL Fonnte
//   WA_WEBHOOK_SECRET       secret verifikasi Meta (nanti)
//   WA_ACCESS_TOKEN         token Meta (nanti)
//   WA_PHONE_ID             phone number id Meta (nanti)

const JSON_OK = () => new Response("ok", { status: 200 });

// Prompt gaya bicara bot. personaName = panggilan pengirim (dari DB), null kalau
// nomor tidak terdaftar. Prompt dibangun per pesan karena identitas pengirim beda.
const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

function buildSystemPrompt(personaName) {
  const identity = personaName
    ? `Yang sedang chat dengan kamu: ${personaName}. Sapa ${personaName} seperlunya saja, tidak setiap balasan.`
    : "Yang sedang chat belum terdaftar; jangan menganggap kenal, jawab netral dan sopan.";
  return (
    "Kamu adalah Neuro, asisten WhatsApp pribadi keluarga Bayt Mustaqbal. " +
    identity + " " +
    'Selalu pakai kata "Saya" untuk dirimu sendiri. Dilarang memakai "aku" atau "gue". ' +
    "Jawab dalam bahasa Indonesia, santai dan singkat, seperti chat orang. " +
    "Tidak perlu salam panjang atau format markdown. Maksimal 3 kalimat."
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ---- Verifikasi webhook Meta (GET challenge + POST pesan) ----
    if (url.pathname === "/meta") {
      return handleMeta(request, env);
    }

    // ---- API untuk app Bayt Mustaqbal (baca data) ----
    if (url.pathname === "/api/expenses" && request.method === "GET") {
      return handleGetExpenses(request, env);
    }
    if (url.pathname === "/api/expenses" && request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ---- Webhook Fonnte ----
    if (url.pathname.startsWith("/fonnte/") && request.method === "POST") {
      return handleFonnte(request, env, url);
    }

    return new Response("Not found", { status: 404 });
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "X-App-Token, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// Nomor WA -> user_id dari secret WA_ALLOWED (JSON: {"62812xxxx":"<user_id>"}).
// Sender Fonnte dinormalisasi jadi digit saja supaya +62/62/08 konsisten.
function resolveOwner(env, sender) {
  if (!env.WA_ALLOWED) return null;
  let map;
  try {
    map = JSON.parse(env.WA_ALLOWED);
  } catch (e) {
    return null;
  }
  const digits = String(sender).replace(/\D/g, "");
  if (map[digits]) return map[digits];
  // Coba format lain: 62xxx -> 0xxx, dst
  const alt = digits.startsWith("62") ? "0" + digits.slice(2) : "62" + digits.replace(/^0/, "");
  return map[alt] || null;
}

// GET /api/expenses?limit=50&ym=2026-11
// Auth: header X-App-Token harus sama dengan secret APP_TOKEN.
async function handleGetExpenses(request, env) {
  const token = request.headers.get("X-App-Token");
  if (!env.APP_TOKEN || token !== env.APP_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: corsHeaders(),
    });
  }
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);
  const ym = url.searchParams.get("ym");

  if (!env.APP_DB) {
    return new Response(JSON.stringify({ error: "db not bound" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }

  // Data dari tabel transactions app (type 'out', soft delete void IS NULL).
  // uid opsional: filter per user; tanpa uid = semua anggota keluarga.
  const uid = url.searchParams.get("uid");
  let rows;
  if (ym && uid) {
    rows = await env.APP_DB.prepare(
      `SELECT id, amount, description, date, created_at
       FROM transactions WHERE void IS NULL AND type = 'out' AND user_id = ? AND date LIKE ?
       ORDER BY date DESC, created_at DESC LIMIT ?`
    ).bind(uid, `${ym}-%`, limit).all();
  } else if (ym) {
    rows = await env.APP_DB.prepare(
      `SELECT id, amount, description, date, created_at
       FROM transactions WHERE void IS NULL AND type = 'out' AND date LIKE ?
       ORDER BY date DESC, created_at DESC LIMIT ?`
    ).bind(`${ym}-%`, limit).all();
  } else if (uid) {
    rows = await env.APP_DB.prepare(
      `SELECT id, amount, description, date, created_at
       FROM transactions WHERE void IS NULL AND type = 'out' AND user_id = ?
       ORDER BY date DESC, created_at DESC LIMIT ?`
    ).bind(uid, limit).all();
  } else {
    rows = await env.APP_DB.prepare(
      `SELECT id, amount, description, date, created_at
       FROM transactions WHERE void IS NULL AND type = 'out'
       ORDER BY date DESC, created_at DESC LIMIT ?`
    ).bind(limit).all();
  }

  // Total bulan berjalan
  const ymNow = new Date().toISOString().slice(0, 7);
  let totalStmt;
  if (uid) {
    totalStmt = env.APP_DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions WHERE void IS NULL AND type = 'out' AND user_id = ? AND date LIKE ?`
    ).bind(uid, `${ymNow}-%`);
  } else {
    totalStmt = env.APP_DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions WHERE void IS NULL AND type = 'out' AND date LIKE ?`
    ).bind(`${ymNow}-%`);
  }
  const totalRow = await totalStmt.first();

  return new Response(
    JSON.stringify({
      expenses: rows.results ?? [],
      total_this_month: totalRow?.total ?? 0,
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders() } }
  );
}

// Parse "catat pengeluaran 50k makan siang" -> { amount: 50000, note: "makan siang" }
// Nominal dipakai: 500000 | 50k | 2jt | 1.5jt | Rp50.000
function parseExpenseRequest(text) {
  const lower = text.toLowerCase().trim();
  const match = lower.match(/^(catat|tambah)\s+(pengeluaran|belanja)\s*(.*)$/);
  if (!match) return null;
  const rest = match[3].trim();
  const tokens = rest.split(/\s+/);

  let amount = null;
  let noteTokens = [];
  for (const t of tokens) {
    if (amount !== null) {
      noteTokens.push(t);
      continue;
    }
    let v = t.replace(/^rp\.?/i, "").replace(/\./g, "").replace(/,/g, "");
    let m = v.match(/^(\d+)(k|rb)?$/i);
    if (m) {
      amount = parseInt(m[1], 10) * (m[2] ? 1000 : 1);
      continue;
    }
    m = v.match(/^(\d+(?:[.,]\d+)?)jt$/i);
    if (m) {
      amount = Math.round(parseFloat(m[1].replace(",", ".")) * 1000000);
      continue;
    }
    noteTokens.push(t);
  }

  if (!amount || amount <= 0) return { amount: null, note: rest };
  return { amount, note: noteTokens.join(" ").trim() || null };
}

// ============================= FONNTE =============================

async function handleFonnte(request, env, url) {
  const pathSecret = url.pathname.slice("/fonnte/".length);
  if (!env.FONNTE_WEBHOOK_PATH || pathSecret !== env.FONNTE_WEBHOOK_PATH) {
    return new Response("Forbidden", { status: 403 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Payload Fonnte: { sender, message, name, filename?, ... }
  const sender = payload.sender;
  const text = payload.message || null;
  const displayName = payload.name || null;
  if (!sender) return JSON_OK();

  // Dedupe: Fonnte tidak punya message id. Kunci dari pengirim + teks + menit.
  const minute = new Date().toISOString().slice(0, 16);
  const dedupeKey = `fonnte:${sender}:${minute}:${text ?? ""}`;
  if (env.WA_DEDUPE) {
    const seen = await env.WA_DEDUPE.get(dedupeKey);
    if (seen) return JSON_OK();
    await env.WA_DEDUPE.put(dedupeKey, "1", { expirationTtl: 86400 });
  }

  // Log ke D1 (kolom void untuk soft delete)
  try {
    await env.WA_LOGS.prepare(
      `INSERT INTO wa_messages (message_id, from_number, phone_number_id, message_text, timestamp, processed)
       VALUES (?, ?, ?, ?, ?, false)
       ON CONFLICT(message_id) DO NOTHING`
    )
      .bind(dedupeKey, sender, "fonnte", text, minute)
      .run();
  } catch (e) {
    // Jangan gagalkan webhook karena DB
  }

  // ---- Identitas pengirim: nomor WA -> user_id + panggilan dari DB ----
  const ownerId = resolveOwner(env, sender);
  let personaName = null;
  if (ownerId && env.APP_DB) {
    try {
      const owner = await env.APP_DB.prepare(
        `SELECT nickname, nama FROM users WHERE id = ?`
      ).bind(ownerId).first();
      if (owner) {
        personaName = (owner.nickname || (owner.nama || "").split(" ")[0] || "").trim() || null;
      }
    } catch (e) {
      personaName = null;
    }
  }

  // ---- Intent: catat pengeluaran (rules, bukan LLM, agar nominal pasti) ----
  const expenseReq = text ? parseExpenseRequest(text) : null;
  if (expenseReq) {
    // Whitelist: hanya nomor terdaftar yang boleh menulis ke DB app.
    if (!ownerId) {
      await replyViaFonnte(env.FONNTE_TOKEN, sender, "Nomor tidak terdaftar untuk mencatat. Hubungi admin.");
      return JSON_OK();
    }
    if (!env.APP_DB) {
      await replyViaFonnte(env.FONNTE_TOKEN, sender, "Database app belum tersambung. Coba lagi nanti.");
      return JSON_OK();
    }
    if (!expenseReq.amount) {
      await replyViaFonnte(
        env.FONNTE_TOKEN,
        sender,
        "Format salah. Contoh: catat pengeluaran 50k makan siang"
      );
      return JSON_OK();
    }
    const today = new Date().toISOString().slice(0, 10);
    const ymNow = today.slice(0, 7);
    const nowIso = new Date().toISOString();
    let inserted = false;
    try {
      const res = await env.APP_DB.prepare(
        `INSERT INTO transactions (id, user_id, category_id, account_id, amount, type, date, description, rev, created_at, updated_at, void)
         VALUES (?, ?, NULL, NULL, ?, 'out', ?, ?, 1, ?, ?, NULL)`
      )
        .bind(
          crypto.randomUUID(),
          ownerId,
          expenseReq.amount,
          today,
          expenseReq.note,
          nowIso,
          nowIso
        )
        .run();
      inserted = res.success;
    } catch (e) {
      inserted = false;
    }
    if (!inserted) {
      await replyViaFonnte(env.FONNTE_TOKEN, sender, "Gagal menyimpan catatan. Coba lagi nanti.");
      return JSON_OK();
    }
    let total = 0;
    try {
      const t = await env.APP_DB.prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE void IS NULL AND type = 'out' AND user_id = ? AND date LIKE ?`
      ).bind(ownerId, `${ymNow}-%`).first();
      total = t?.total ?? 0;
    } catch (e) {}
    const notePart = expenseReq.note ? ` (${expenseReq.note})` : "";
    const prefix = personaName ? `Tercatat, ${personaName}: ` : "Tercatat: ";
    await replyViaFonnte(
      env.FONNTE_TOKEN,
      sender,
      `${prefix}Rp${expenseReq.amount.toLocaleString("id-ID")}${notePart}. Total pengeluaran bulan ini: Rp${total.toLocaleString("id-ID")}`
    );
    return JSON_OK();
  }

  // Balas via Workers AI, fallback ke placeholder kalau AI gagal
  if (text) {
    let replyText;
    try {
      replyText = await generateReply(env, text, personaName);
    } catch (e) {
      replyText = null;
    }
    if (!replyText) replyText = "Anda bilang: " + text;

    const res = await replyViaFonnte(env.FONNTE_TOKEN, sender, replyText);
    if (!res.ok) {
      try {
        await env.WA_LOGS.prepare(
          `INSERT INTO wa_errors (message_id, error_message) VALUES (?, ?)
           ON CONFLICT(message_id) DO NOTHING`
        )
          .bind(dedupeKey, await res.text())
          .run();
      } catch (e) {}
    }
  }

  return JSON_OK();
}

// Panggil Workers AI untuk menghasilkan balasan chat
async function generateReply(env, userMessage, personaName) {
  if (!env.AI) return null;
  const result = await env.AI.run(AI_MODEL, {
    messages: [
      { role: "system", content: buildSystemPrompt(personaName) },
      { role: "user", content: userMessage },
    ],
    max_tokens: 200,
  });
  const text = result?.response;
  return text && text.trim().length > 0 ? text.trim() : null;
}

async function replyViaFonnte(token, target, text) {
  return fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target, message: text }),
  });
}

// ============================= META =============================

async function handleMeta(request, env) {
  if (request.method === "GET") {
    // Verifikasi webhook saat setup di Meta Dashboard
    const url = new URL(request.url);
    if (
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === env.WA_WEBHOOK_SECRET
    ) {
      return new Response(url.searchParams.get("hub.challenge"), { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verifikasi signature X-Hub-Signature-256
  const signatureHeader = request.headers.get("X-Hub-Signature-256");
  const body = await request.text();
  const secret = env.WA_WEBHOOK_SECRET || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (!signatureHeader || signatureHeader !== `sha256=${hex}`) {
    return new Response("Signature verification failed", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const entry = payload.entry?.[0];
  if (!entry) return JSON_OK();

  for (const change of entry.changes ?? []) {
    const value = change.value;
    const messageId = value.id;
    const from = value.from;
    const message = value.message?.text || null;
    const timestamp = value.timestamp;
    const waPhoneNumberId = value.metadata?.phone_number_id;

    if (env.WA_DEDUPE) {
      const key2 = `msg:${messageId}`;
      const existing = await env.WA_DEDUPE.get(key2);
      if (existing) continue;
      await env.WA_DEDUPE.put(key2, "1", { expirationTtl: 86400 });
    }

    try {
      await env.WA_LOGS.prepare(
        `INSERT INTO wa_messages (message_id, from_number, phone_number_id, message_text, timestamp, processed)
         VALUES (?, ?, ?, ?, ?, false)
         ON CONFLICT(message_id) DO NOTHING`
      )
        .bind(messageId, from, waPhoneNumberId, message, timestamp)
        .run();
    } catch (e) {}

    if (message) {
      const reply = await replyViaMeta(env.WA_ACCESS_TOKEN, env.WA_PHONE_ID, from, "Anda bilang: " + message);
      if (!reply.ok) {
        try {
          await env.WA_LOGS.prepare(
            `INSERT INTO wa_errors (message_id, error_message) VALUES (?, ?)
             ON CONFLICT(message_id) DO NOTHING`
          )
            .bind(messageId, await reply.text())
            .run();
        } catch (e) {}
      }
    }
  }
  return JSON_OK();
}

async function replyViaMeta(accessToken, phoneId, to, text) {
  return fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}