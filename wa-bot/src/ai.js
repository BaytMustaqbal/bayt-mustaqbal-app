const AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export function buildChatPrompt(personaName) {
  const identity = personaName
    ? `Yang sedang chat: ${personaName}. Sapa seperlunya, tidak setiap balasan.`
    : 'Pengirim belum dikenal; jawab netral dan sopan.';
  return (
    'Kamu adalah Neuro, Asisten Pribadi Keluarga Bayt Mustaqbal. ' +
    'Identitasmu untuk seluruh anggota keluarga, bukan asisten pribadi milik satu orang tertentu. ' +
    identity + ' ' +
    'Gunakan kata "Saya" untuk dirimu. Jangan pakai "aku" atau "gue". ' +
    'Jawab dalam Bahasa Indonesia, santai, singkat, tanpa markdown berat. Maksimal 3 kalimat.'
  );
}

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

export async function chatReply(env, userMessage, personaName) {
  if (!env.AI) return null;
  const result = await env.AI.run(AI_MODEL, {
    messages: [
      { role: 'system', content: buildChatPrompt(personaName) },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 220,
  });
  const text = result?.response;
  return text && String(text).trim() ? String(text).trim() : null;
}

export async function detectIntent(env, userMessage, context, personaName) {
  if (!env.AI) return null;
  const who = personaName
    ? `Pengirim teridentifikasi: ${personaName}. Jika ditanya identitas ("siapa saya"), jawab bahwa dia ${personaName}.`
    : 'Pengirim belum teridentifikasi di data keluarga.';
  const system = [
    'Kamu Neuro, Asisten Pribadi Keluarga Bayt Mustaqbal (pengurai intent bot WhatsApp keuangan keluarga).',
    'Identitasmu untuk seluruh anggota keluarga, bukan milik satu orang tertentu.',
    'Balas HANYA JSON valid (tanpa teks lain).',
    'Pilih intent tepat:',
    '- catat_pengeluaran: user mau mencatat pengeluaran. field: {"intent":"catat_pengeluaran","amount":<angka rupiah integer>,"note":"<keterangan singkat atau null>"}',
    '- catat_pemasukan: user mau mencatat pemasukan/pendapatan/gaji/bonus. field: {"intent":"catat_pemasukan","amount":<angka rupiah integer>,"note":"<keterangan singkat atau null>","account":"<nama dompet/akun tujuan atau null>"}. Jika dompet tidak disebut, account null.',
    '- set_pengingat: user mau dibuatkan pengingat. field: {"intent":"set_pengingat","message":"<isi pengingat>","dayOffset":0|1,"hour":0-23,"minute":0-59}. dayOffset 0=hari ini, 1=besok. Jika jam tidak disebut, tebak wajar (pagi 6, siang 12, sore 17, malam 20, default 9).',
    '- cek_pengingat: user minta daftar pengingat aktif. {"intent":"cek_pengingat"}',
    '- cek_tagihan: user tanya tagihan/tenggat/jatuh tempo/belum lunas. {"intent":"cek_tagihan"}',
    '- agenda_hari_ini: tanya agenda/jadwal hari ini. {"intent":"agenda_hari_ini"}',
    '- saldo_bulan_ini: tanya saldo/pemasukan-pengeluaran bulan ini. {"intent":"saldo_bulan_ini"}',
    '- rangkuman: ringkasan pengeluaran. {"intent":"rangkuman","period":"bulan_ini"|"7_hari"}',
    '- rincian_kategori: rekap per kategori. {"intent":"rincian_kategori"}',
    '- target_tabungan: progres target/tabungan. {"intent":"target_tabungan"}',
    '- menu: minta bantuan/menu/halo. {"intent":"menu"}',
    '- chat: obrolan umum/tidak terkait data di atas. {"intent":"chat"}',
    '',
    who,
    `Konteks waktu WIB sekarang: tanggal ${context.today}, jam ${context.time}. Bulan: ${context.month}.`,
    'Jika ragu antara catat_pengeluaran/catat_pemasukan/set_pengingat dengan chat, pilih chat. Jangan mengarang nominal/tanggal.',
  ].join('\n');

  const result = await env.AI.run(AI_MODEL, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 260,
  });
  const text = result?.response ? String(result.response) : '';
  const obj = extractJson(text);
  if (!obj || typeof obj.intent !== 'string') return null;
  return obj;
}
