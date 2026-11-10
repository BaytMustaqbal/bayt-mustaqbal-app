import { Env } from '../types/env';
import { GcalConnection, ensureAccessToken } from './gcal';

const PHOTOS_API = 'https://photoslibrary.googleapis.com/v1';
const ALBUM_TITLE = 'Bayt Mustaqbal Moment';

/**
 * Util unggah foto momen ke Google Photos Library API.
 *
 * Alur (wajib sudah terhubung akun Google dengan scope
 * photoslibrary.appendonly):
 *   1. access token dari koneksi gcal (refresh otomatis).
 *   2. cari album "Bayt Mustaqbal Moment"; kalau belum ada, buat.
 *   3. upload byte mentah → uploadToken.
 *   4. batchCreate media item di album → balikin baseUrl (dipakai <img>).
 *
 * Catatan: baseUrl Google Photos bukan tautan permanen seratus persen
 * (dibuat untuk dirender app). Cukup untuk jurnal keluarga.
 */

/** Access token untuk panggilan Google Photos. */
async function photosToken(env: Env, conn: GcalConnection): Promise<string> {
  return ensureAccessToken(env, conn);
}

/** Cari album berdasarkan judul; kalau tidak ada, buat. Simpan album_id di
 *  settings (key "photos_album_id") per user agar selalu dipakai ulang. */
async function findOrCreateAlbum(
  env: Env,
  conn: GcalConnection,
  token: string,
  userId: string
): Promise<string> {
  // 1) Coba pakai album_id yang sudah tersimpan.
  const savedRow = (await env.DB.prepare(
    `SELECT value FROM settings WHERE user_id = ? AND key = 'photos_album_id' AND void IS NULL ORDER BY updated_at DESC LIMIT 1`
  ).bind(userId).first()) as { value?: string } | null;
  if (savedRow?.value) {
    return savedRow.value;
  }

  // 2) Cari album existing (dengan pagination agar tidak terbatas 50 pertama).
  let pageToken: string | undefined;
  let hit: string | null = null;
  do {
    const q = `${PHOTOS_API}/albums?pageSize=50${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const list = await fetch(q, { headers: { Authorization: `Bearer ${token}` } });
    if (!list.ok) break;
    const data = (await list.json()) as { albums?: { id: string; title: string }[]; nextPageToken?: string };
    const found = (data.albums || []).find(
      (a) => a.title.trim().toLowerCase() === ALBUM_TITLE.trim().toLowerCase()
    );
    if (found) { hit = found.id; break; }
    pageToken = data.nextPageToken;
  } while (pageToken);

  if (hit) {
    // Simpan untuk dipakai ulang.
    const now = new Date().toISOString();
    const cid = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO settings (id, user_id, key, value, rev, created_at, updated_at) VALUES (?, ?, 'photos_album_id', ?, 1, ?, ?)`
    ).bind(cid, userId, hit, now, now).run();
    return hit;
  }

  // 3) Buat baru.
  const created = await fetch(`${PHOTOS_API}/albums`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ album: { title: ALBUM_TITLE } }),
  });
  if (!created.ok) {
    throw new Error(`Gagal membuat album Google Photos (${created.status})`);
  }
  const createdData = (await created.json()) as { id: string };
  const now = new Date().toISOString();
  const cid = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO settings (id, user_id, key, value, rev, created_at, updated_at) VALUES (?, ?, 'photos_album_id', ?, 1, ?, ?)`
  ).bind(cid, userId, createdData.id, now, now).run();
  return createdData.id;
}

export interface PhotoUploadResult {
  photo_url: string;
  product_url: string;
}

/** Unggah satu foto ke Google Photos di album keluarga. */
export async function uploadMomentPhoto(
  env: Env,
  conn: GcalConnection,
  file: { bytes: ArrayBuffer; name: string; type: string },
  description?: string,
  userId?: string
): Promise<PhotoUploadResult> {
  const token = await photosToken(env, conn);
  const albumId = await findOrCreateAlbum(env, conn, token, userId || '');

  // 1) Upload byte mentah → uploadToken
  const up = await fetch(`${PHOTOS_API}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: file.bytes,
  });
  if (!up.ok) {
    throw new Error(`Google Photos upload gagal (${up.status})`);
  }
  const uploadToken = (await up.text()).trim();
  if (!uploadToken) {
    throw new Error('Google Photos tidak mengembalikan uploadToken');
  }

  // 2) batchCreate media item. Coba langsung ke album; kalau Google hanya
  // mengembalikan uploadToken (tanpa mediaItem), ulangi TANPA albumId untuk
  // mengisolasi masalah kepemilikan album.
  const doBatchCreate = async (targetAlbumId: string | null) => {
    const payload: Record<string, unknown> = {
      newMediaItems: [
        {
          description: description || 'Momen Keluarga',
          simpleMediaItem: { fileName: file.name, uploadToken },
        },
      ],
    };
    if (targetAlbumId) payload.albumId = targetAlbumId;
    const res = await fetch(`${PHOTOS_API}/mediaItems:batchCreate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const status = res.status;
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      throw new Error(`Google Photos batchCreate gagal (${status}) ${text}`);
    }
    const json = (await res.json()) as {
      newMediaItemResults?: { mediaItem?: { baseUrl?: string; productUrl?: string }; status?: { code?: number; message?: string } }[];
    };
    const r = json?.newMediaItemResults?.[0];
    if (r?.status?.code && r.status.code !== 0) {
      throw new Error(`Google Photos: ${r.status.message || `gagal (code ${r.status.code})`}`);
    }
    return { baseUrl: r?.mediaItem?.baseUrl, productUrl: r?.mediaItem?.productUrl || '' };
  };

  let created = await doBatchCreate(albumId);
  if (!created.baseUrl) {
    created = await doBatchCreate(null);
  }
  if (!created.baseUrl) {
    throw new Error('Google tidak membuat media item (batchCreate hanya mengembalikan uploadToken). Coba lagi atau cek akun Google.');
  }

  return { photo_url: created.baseUrl, product_url: created.productUrl };
}
