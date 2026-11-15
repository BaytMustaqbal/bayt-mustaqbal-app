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
    let v = tok.replace(/^rp\.?/i, '').replace(/\./g, '').replace(/,/g, '');
    let mm = v.match(/^(\d+)(k|rb)?$/i);
    if (mm) { amount = parseInt(mm[1], 10) * (mm[2] ? 1000 : 1); continue; }
    mm = v.match(/^(\d+(?:[.,]\d+)?)jt$/i);
    if (mm) { amount = Math.round(parseFloat(mm[1].replace(',', '.')) * 1000000); continue; }
    noteTokens.push(tok);
  }
  if (!amount || amount <= 0) return { amount: null, note: rest || null };
  return { amount, note: noteTokens.join(' ').trim() || null };
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
