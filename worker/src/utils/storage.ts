import { Env } from '../types/env';

/**
 * Util penyimpanan foto momen di Cloudflare R2.
 *
 * Kenapa R2 (bukan Google Photos):
 *   - Tidak butuh OAuth / scope / refresh token.
 *   - Tidak butuh API pihak ketiga; binding langsung ke Worker.
 *   - Free tier 10 GB, egress gratis.
 *
 * Bentuk key: `<uuid>.<ext>` (tanpa garis miring) supaya aman dipakai
 * sebagai segmen route dan tidak bisa keluar dari bucket saat disassembly.
 */

/** Batas ukuran foto momen: 5MB. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/;

/** Key acak untuk objek foto. Hanya uuid + ekstensi aman. */
export function buildPhotoKey(ext: string): string {
  const safeExt = /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'jpg';
  return `${crypto.randomUUID()}.${safeExt}`;
}

/** Validasi key yang datang dari URL (anti path traversal / key asing). */
export function isValidPhotoKey(key: string): boolean {
  return KEY_RE.test(key);
}

/** Ambil key foto dari URL absolut (https://host/photo/<key>). */
export function extractPhotoKey(photoUrl: string | null | undefined): string | null {
  if (!photoUrl) return null;
  const m = photoUrl.match(/\/photo\/([0-9a-f-]{36}\.[a-z0-9]{1,8})(?:\?.*)?$/);
  return m && isValidPhotoKey(m[1]) ? m[1] : null;
}

/* ---- Tanda tangan URL foto ----
   Foto disajikan lewat route Worker, bukan URL bucket publik. Route ini
   dilindungi auth middleware, sedangkan <img src> tak bisa mengirim header
   Authorization. Solusi: HMAC pada key, Disimpan di photo_url. Tanpa tanda
   tangan, UUID acak saja sudah sulit ditebak; HMAC menambah lapisan kedua
   dan membuat URL tidak bisa dibajak orang lain hanya dengan menebak key. */

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Tanda tangan untuk key foto. */
export async function signPhotoKey(env: Env, key: string): Promise<string> {
  return hmacHex(env.JWT_SECRET, `moment-photo:${key}`);
}

/** Cek tanda tangan (perbandingan waktu-tetap). */
export async function verifyPhotoSignature(
  env: Env,
  key: string,
  signature: string | undefined | null
): Promise<boolean> {
  if (!signature) return false;
  const expected = await signPhotoKey(env, key);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

/** Simpan foto ke R2. */
export async function putMomentPhoto(
  env: Env,
  key: string,
  body: ArrayBuffer,
  contentType: string
): Promise<void> {
  await env.MOMENTS_R2.put(key, body, {
    httpMetadata: { contentType },
  });
}

/** Ambil objek foto dari R2 (null kalau tidak ada). */
export async function getMomentPhoto(env: Env, key: string) {
  return env.MOMENTS_R2.get(key);
}

/** Hapus objek foto dari R2 (biaya $0). Error diabaikan. */
export async function deleteMomentPhoto(env: Env, key: string): Promise<void> {
  try {
    await env.MOMENTS_R2.delete(key);
  } catch {
    // Objek sudah hilang / tidak bisa dihapus — tidak perlu menggagalkan soften.
  }
}
