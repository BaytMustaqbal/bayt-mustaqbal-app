/**
 * Baca foto struk lewat endpoint AI di api-bayt-mustaqbal.
 * Gambar diunduh dari Graph API Meta, dikirim sebagai base64, dan tidak
 * disimpan di D1 maupun dicatat ke log.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';
const MAX_BYTES = 4 * 1024 * 1024;
const DEFAULT_API = 'https://api.baytmustaqbal.my.id/api';

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Ambil gambar dari media_id Meta. URL media cepat kedaluwarsa, jadi unduh langsung. */
export async function downloadMetaImage(env, mediaId) {
  if (!env.WA_ACCESS_TOKEN) return { error: 'NO_TOKEN' };
  try {
    const metaRes = await fetch(`${GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${env.WA_ACCESS_TOKEN}` },
    });
    const meta = await metaRes.json().catch(() => null);
    if (!metaRes.ok || !meta?.url) return { error: 'MEDIA_INFO' };
    if (meta.mime_type && !String(meta.mime_type).startsWith('image/')) return { error: 'NOT_IMAGE' };
    if (Number(meta.file_size) > MAX_BYTES) return { error: 'TOO_LARGE' };

    const imgRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${env.WA_ACCESS_TOKEN}` },
    });
    if (!imgRes.ok) return { error: 'MEDIA_DOWNLOAD' };
    const buffer = await imgRes.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) return { error: 'TOO_LARGE' };
    return {
      base64: toBase64(buffer),
      mime: meta.mime_type === 'image/png' ? 'image/png' : 'image/jpeg',
    };
  } catch {
    return { error: 'MEDIA_DOWNLOAD' };
  }
}

/** Kirim gambar ke endpoint scan. Hasil: { ok, data } atau { ok:false, code }. */
export async function scanReceiptImage(env, base64, mime) {
  if (!env.RECEIPT_TOKEN) return { ok: false, code: 'NO_TOKEN' };
  const base = (env.API_BASE_URL || DEFAULT_API).replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/receipt/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Receipt-Token': env.RECEIPT_TOKEN,
      },
      body: JSON.stringify({ image: base64, mime }),
      signal: AbortSignal.timeout(30000),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      return { ok: false, code: json?.error?.code || `HTTP_${res.status}` };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, code: 'NETWORK' };
  }
}
