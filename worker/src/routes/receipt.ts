import { Hono } from 'hono';
import { Env } from '../types/env';

export const receiptRoutes = new Hono<{ Bindings: Env }>();

const AI_MODEL = '@cf/google/gemma-4-26b-a4b-it';
const AI_TIMEOUT_MS = 30_000;
// ±4 MB gambar setelah base64 (base64 membengkak ±33%).
const MAX_BASE64 = 5_500_000;
const MAX_TOTAL = 1_000_000_000;

// Harus sama dengan id kategori di app (components/categories.js).
const CATEGORY_IDS = [
  'belanja', 'cicilan', 'hiburan', 'hobi', 'ibadah', 'kesehatan', 'kuliner',
  'pendidikan', 'rumah', 'tabungan', 'transportasi', 'utilitas', 'lainnya',
];

const SYSTEM_PROMPT = [
  'Kamu pembaca struk belanja Indonesia.',
  'Balas HANYA JSON valid, tanpa markdown dan tanpa penjelasan.',
  'Skema: {"merchant":"nama toko","total":18500,"date":"2026-11-17","category":"belanja","items":[{"name":"Indomie","price":3500}]}',
  'Aturan:',
  '- merchant: nama toko/warung di bagian atas struk. Bila tidak ada, tulis jenis belanja singkat (misal "Belanja harian").',
  '- total: angka bulat rupiah dari TOTAL AKHIR yang dibayar, sudah termasuk diskon dan pajak. Jangan pakai subtotal. Tanpa titik, koma, atau "Rp".',
  '- date: tanggal transaksi format YYYY-MM-DD. null bila tidak terbaca.',
  `- category: satu dari ${CATEGORY_IDS.join(', ')}.`,
  '- items: maksimal 20 baris barang, tiap item {"name":"...","price":3500} dengan price angka bulat satuan rupiah. Lewati baris non-barang (kasir, NPWP, terima kasih, barcode).',
  '- Jangan mengarang. Bila total tidak terbaca, isi total 0.',
].join('\n');

type ScanItem = { name: string; price: number };
type ScanResult = {
  merchant: string;
  total: number;
  date: string | null;
  category: string;
  items: ScanItem[];
};

/** Ambil teks dari respons Workers AI (bisa `response` atau format OpenAI choices). */
function aiText(response: unknown): string {
  const r = response as any;
  const candidates = [r?.response, r?.choices?.[0]?.message?.content, r?.result?.response];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
    if (c && typeof c === 'object') return JSON.stringify(c);
  }
  return '';
}

function extractJson(text: string): Record<string, unknown> | null {  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1));
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

/** Tanggal YYYY-MM-DD, termasuk konversi DD/MM/YYYY. Tanggal mustahil jadi null. */
function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  let ymd = '';
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (iso) {
    ymd = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  } else if (dmy) {
    ymd = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  } else {
    return null;
  }
  const d = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== ymd) return null;
  // Struk tidak mungkin bertanggal jauh di masa depan; anggap salah baca.
  const limit = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  if (ymd > limit) return null;
  return ymd;
}

function normalizeResult(obj: Record<string, unknown> | null): ScanResult | null {
  if (!obj) return null;
  const merchant = typeof obj.merchant === 'string' ? obj.merchant.trim().slice(0, 120) : '';
  const totalNum = Number(obj.total);
  const total = Number.isFinite(totalNum) ? Math.round(totalNum) : 0;
  if (!merchant || !(total > 0) || total > MAX_TOTAL) return null;

  const category = typeof obj.category === 'string' && CATEGORY_IDS.includes(obj.category)
    ? obj.category
    : 'lainnya';

  const items: ScanItem[] = [];
  if (Array.isArray(obj.items)) {
    for (const raw of obj.items.slice(0, 20)) {
      if (!raw || typeof raw !== 'object') continue;
      const it = raw as Record<string, unknown>;
      const name = typeof it.name === 'string' ? it.name.trim().slice(0, 60) : '';
      const priceNum = Number(it.price);
      if (!name || !Number.isFinite(priceNum) || priceNum < 0) continue;
      items.push({ name, price: Math.round(priceNum) });
    }
  }

  return { merchant, total, date: normalizeDate(obj.date), category, items };
}

/**
 * POST /api/receipt/scan — baca foto struk dengan Gemma 4 vision.
 * Auth: JWT app, atau header X-Receipt-Token untuk bot WA.
 * Body: { image: "<base64 atau data URL>", mime?: "image/jpeg"|"image/png" }
 * Gambar tidak disimpan dan tidak dicatat ke log.
 */
receiptRoutes.post('/scan', async (c) => {
  let body: { image?: unknown; mime?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Body harus JSON' } }, 400);
  }

  const rawImage = typeof body.image === 'string' ? body.image.trim() : '';
  if (!rawImage) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Field image wajib' } }, 400);
  }

  const isPng = /^data:image\/png/i.test(rawImage) || body.mime === 'image/png';
  const base64 = rawImage.replace(/^data:image\/[a-z]+;base64,/i, '');
  if (base64.length < 100) {
    return c.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Gambar terlalu kecil' } }, 400);
  }
  if (base64.length > MAX_BASE64) {
    return c.json({ ok: false, data: null, error: { code: 'TOO_LARGE', message: 'Foto terlalu besar, maksimal ±4 MB' } }, 413);
  }

  const dataUrl = `data:${isPng ? 'image/png' : 'image/jpeg'};base64,${base64}`;

  let response: unknown;
  try {
    response = await Promise.race([
      (c.env.AI.run as any)(AI_MODEL, {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Baca struk pada gambar ini. Balas JSON sesuai skema.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        chat_template_kwargs: { enable_thinking: false },
        temperature: 0.1,
        max_tokens: 900,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS)),
    ]);
  } catch {
    return c.json({ ok: false, data: null, error: { code: 'AI_FAILED', message: 'Layanan baca struk sedang tidak tersedia' } }, 502);
  }

  const text = aiText(response);
  const result = normalizeResult(extractJson(text));
  if (!result) {
    return c.json({
      ok: false,
      data: null,
      error: { code: 'UNREADABLE', message: 'Total atau nama toko tidak terbaca. Coba foto lebih jelas atau isi manual.' },
    }, 422);
  }

  return c.json({ ok: true, data: result, error: null });
});
