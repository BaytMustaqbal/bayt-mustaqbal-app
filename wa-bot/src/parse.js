export function parseAmountToken(tok) {
  let v = String(tok || '').replace(/^rp\.?/i, '').replace(/\./g, '').replace(/,/g, '');
  let mm = v.match(/^(\d+)(k|rb)?$/i);
  if (mm) return parseInt(mm[1], 10) * (mm[2] ? 1000 : 1);
  mm = v.match(/^(\d+(?:[.,]\d+)?)jt$/i);
  if (mm) return Math.round(parseFloat(mm[1].replace(',', '.')) * 1000000);
  return null;
}

export function parseExpense(text) {
  const t = String(text || '').trim();
  const m = t.match(/^(?:catat|tambah)\s+(?:pengeluaran|belanja)\s*(.*)$/i);
  if (!m) return null;
  const rest = (m[1] || '').trim();
  const tokens = rest.split(/\s+/).filter(Boolean);
  let amount = null;
  const noteTokens = [];
  for (const tok of tokens) {
    if (amount !== null) { noteTokens.push(tok); continue; }
    const parsed = parseAmountToken(tok);
    if (parsed != null) { amount = parsed; continue; }
    noteTokens.push(tok);
  }
  if (!amount || amount <= 0) return { amount: null, note: rest || null };
  return { amount, note: noteTokens.join(' ').trim() || null };
}

/** "catat pemasukan 5jt gaji ke dompet BCA" / "tambah pemasukan 500k bonus" */
export function parseIncome(text) {
  const t = String(text || '').trim();
  const m = t.match(/^(?:catat|tambah)\s+(?:pemasukan|pendapatan|income)\s*(.*)$/i);
  if (!m) return null;
  const rest = (m[1] || '').trim();
  if (!rest) return { amount: null, note: null, accountHint: null };
  const tokens = rest.split(/\s+/).filter(Boolean);
  let amount = null;
  const noteTokens = [];
  for (const tok of tokens) {
    if (amount !== null) { noteTokens.push(tok); continue; }
    const parsed = parseAmountToken(tok);
    if (parsed != null) { amount = parsed; continue; }
    noteTokens.push(tok);
  }
  let noteStr = noteTokens.join(' ').trim();
  let accountHint = null;
  const ke = noteStr.match(/^(.*?)(?:\s+(?:ke|ke\s+dompet|ke\s+rekening|dompet|rekening)\s+(.+))$/i);
  if (ke) {
    noteStr = (ke[1] || '').trim();
    accountHint = (ke[2] || '').trim() || null;
  }
  return { amount: amount && amount > 0 ? amount : null, note: noteStr || null, accountHint };
}

export function matchAccountHint(accounts, hint) {
  if (!hint || !accounts?.length) return null;
  const h = String(hint).toLowerCase().trim();
  return accounts.find((a) => String(a.nama || '').toLowerCase() === h)
    || accounts.find((a) => String(a.nama || '').toLowerCase().includes(h))
    || null;
}

export function isYes(text) {
  return /^(ya|iya|y|ok|oke|okay|sip|ya\s*simpan|simpan|lanjut|setuju)$/i.test(String(text || '').trim());
}
export function isNo(text) {
  return /^(batal|tidak|nggak|gak|ga|no|n|cancel)$/i.test(String(text || '').trim());
}
export function isMenu(text) {
  const t = String(text || '').trim().toLowerCase();
  return ['menu', 'bantuan', 'help', 'halo', 'hai', 'hi', 'assalamualaikum', 'neuro'].includes(t);
}
export function wantsReminderList(text) {
  return /\b(cek|daftar|list|lihat)\b/i.test(String(text || '')) && /\b(pengingat|ingat|reminder)\b/i.test(String(text || ''));
}

const DAY_HOURS = { pagi: 6, siang: 12, sore: 17, malam: 20 };

const MONTHS = {
  januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4,
  mei: 5, juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8,
  september: 9, sep: 9, oktober: 10, okt: 10, november: 11, nov: 11, desember: 12, des: 12,
};

const pad2 = (n) => String(n).padStart(2, '0');

function ymdValid(year, month, day) {
  if (!(month >= 1 && month <= 12)) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function addDaysIso(todayIso, n) {
  const d = new Date(todayIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Tanggal dari teks Indonesia. Null bila ambigu (bot wajib tanya, bukan menebak). */
export function parseDateId(text, todayIso) {
  const t = String(text || '').toLowerCase();
  const today = new Date(todayIso + 'T00:00:00Z');
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

  const iso = t.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return ymdValid(+iso[1], +iso[2], +iso[3]);

  if (/\blusa\b/.test(t)) return addDaysIso(todayIso, 2);
  if (/\bbesok\b/.test(t)) return addDaysIso(todayIso, 1);
  if (/\bhari ini\b/.test(t)) return todayIso;

  const withMonth = t.match(/\b(\d{1,2})\s*(?:s\/d\s*)?(januari|jan|februari|feb|maret|mar|april|apr|mei|juni|jun|juli|jul|agustus|agu|agt|ags|september|sep|oktober|okt|november|nov|desember|des)\b/);
  if (withMonth) {
    const d = +withMonth[1];
    const m = MONTHS[withMonth[2]];
    const y = m < month ? year + 1 : year;
    return ymdValid(y, m, d);
  }

  const bare = t.match(/\b(?:tgl|tanggal)\s*(\d{1,2})\b/);
  if (bare) {
    const d = +bare[1];
    if (d >= day) return ymdValid(year, month, d);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return ymdValid(nextYear, nextMonth, d);
  }

  return null;
}

/** Jam dari teks ("jam 9", "pukul 19.30", "jam 8 malam"). Null bila tidak disebut. */
export function parseTimeId(text) {
  const t = String(text || '').toLowerCase();
  const m = t.match(/\b(?:jam|pukul)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam)?\b/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mi = m[2] ? parseInt(m[2], 10) : 0;
  if (!(h >= 0 && h <= 23) || !(mi >= 0 && mi <= 59)) return null;
  const part = m[3] || '';
  if ((part === 'siang' || part === 'sore' || part === 'malam') && h < 12) h += 12;
  if (part === 'pagi' && h === 12) h = 0;
  return `${pad2(h)}:${pad2(mi)}`;
}
export function parseReminderLocal(text) {
  const raw = String(text || '').trim();
  const t = raw.toLowerCase();
  if (!/\b(ingatkan|pengingat|reminder)\b/.test(t)) return null;
  let dayOffset = /\bbesok\b/.test(t) ? 1 : 0;
  let hour = 9;
  let minute = 0;
  const jamMatch = t.match(/\bjam\s+(\d{1,2})(?::(\d{2}))?/);
  if (jamMatch) {
    hour = Math.min(23, Math.max(0, parseInt(jamMatch[1], 10)));
    minute = jamMatch[2] ? Math.min(59, Math.max(0, parseInt(jamMatch[2], 10))) : 0;
  } else {
    const day = Object.keys(DAY_HOURS).find((k) => t.includes(k));
    if (day) hour = DAY_HOURS[day];
  }
  const message = raw
    .replace(/\bneuro\b/ig, ' ')
    .replace(/\btolong\b/ig, ' ')
    .replace(/\bingatkan aku\b/ig, ' ')
    .replace(/\bingatkan saya\b/ig, ' ')
    .replace(/\bingatkan\b/ig, ' ')
    .replace(/\bbuat(kan)? pengingat\b/ig, ' ')
    .replace(/\bpengingat\b/ig, ' ')
    .replace(/\breminder\b/ig, ' ')
    .replace(/\buntuk\b/ig, ' ')
    .replace(/\bbesok\b/ig, ' ')
    .replace(/\bhari ini\b/ig, ' ')
    .replace(/\b(pagi|siang|sore|malam)\s+ini\b/ig, ' ')
    .replace(/\bini\s+(pagi|siang|sore|malam)\b/ig, ' ')
    .replace(/\b(pagi|siang|sore|malam)\b/ig, ' ')
    .replace(/\bjam\s+\d{1,2}(?::\d{2})?/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!message) return null;
  return { dayOffset, hour, minute, message };
}
