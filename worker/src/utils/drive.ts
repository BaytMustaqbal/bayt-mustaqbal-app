import { Env } from '../types/env';
import { GcalConnection, ensureAccessToken, getConnection, resolveConnectionUserId } from './gcal';
import { logAudit } from './audit';
import { groupScope } from './group';

const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

const TABLES = ['transactions', 'calendar_events', 'notes', 'family_moments', 'settings'];

async function gatherBackup(env: Env, groupId: string | null, userId: string) {
  const scope = groupScope(groupId, userId);
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const hasGroupCol = t === 'transactions' || t === 'calendar_events' || t === 'notes' || t === 'family_moments' || t === 'settings';
    const sql = hasGroupCol
      ? `SELECT * FROM ${t} WHERE ${scope.sql} AND void IS NULL`
      : `SELECT * FROM ${t} WHERE user_id = ? AND void IS NULL`;
    const params = hasGroupCol ? [scope.val] : [userId];
    try {
      const rows = await env.DB.prepare(sql).bind(...params).all();
      data[t] = rows.results || [];
    } catch {
      data[t] = [];
    }
  }
  return { exported_at: new Date().toISOString(), app: 'bayt-mustaqbal', scope_id: groupId || userId, data };
}

/** Arsipkan data seluruh output ke Google Drive. Lempar Error bila gagal. */
export async function runDriveBackup(env: Env, groupId: string | null, userId: string): Promise<{ fileId: string; last_backup: string }> {
  const ownerUserId = await resolveConnectionUserId(env, userId, groupId);
  if (!ownerUserId) throw new Error('NO_CONNECTION');
  const conn = await getConnection(env, ownerUserId);
  if (!conn) throw new Error('NO_CONNECTION');

  const payload = await gatherBackup(env, groupId, userId);
  const json = JSON.stringify(payload);

  const driveRow = (await env.DB.prepare(
    `SELECT value FROM settings WHERE key = 'drive_backup_file' AND void IS NULL
     AND (group_id = ? OR (group_id IS NULL AND user_id = ?))
     ORDER BY updated_at DESC LIMIT 1`
  ).bind(groupId, userId).first()) as { value: string } | null;
  const existingFileId = driveRow?.value || null;

  const { fileId } = await uploadBackupToDrive(env, conn, json, existingFileId);

  const now = new Date().toISOString();
  const exist = await env.DB.prepare(
    `SELECT id FROM settings WHERE key = 'drive_backup_file' AND void IS NULL AND (group_id = ? OR (group_id IS NULL AND user_id = ?))`
  ).bind(groupId, userId).first();
  if (exist) {
    await env.DB.prepare('UPDATE settings SET value = ?, updated_at = ? WHERE id = ?')
      .bind(fileId, now, (exist as { id: string }).id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO settings (id, user_id, group_id, key, value, rev, created_at, updated_at)
       VALUES (?, ?, ?, 'drive_backup_file', ?, 1, ?, ?)`
    ).bind(crypto.randomUUID(), userId, groupId, fileId, now, now).run();
  }

  await logAudit(env, userId, groupId, 'backup_drive', 'family', groupId || userId);
  return { fileId, last_backup: now };
}

/** Unggah/menimpa arsip backup ke Google Drive (file JSON). */
export async function uploadBackupToDrive(
  env: Env,
  conn: GcalConnection,
  json: string,
  existingFileId: string | null
): Promise<{ fileId: string }> {
  const token = await ensureAccessToken(env, conn);
  const metadata = JSON.stringify({ name: 'bayt-mustaqbal-backup.json', mimeType: 'application/json' });
  const boundary = `----BMTBoundary${crypto.randomUUID().replace(/-/g, '')}`;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const push = (s: string) => chunks.push(encoder.encode(s));
  push(`--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`);
  push(metadata);
  push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="bayt-mustaqbal-backup.json"\r\nContent-Type: application/json\r\n\r\n`);
  push(json);
  push(`\r\n--${boundary}--\r\n`);

  const body = new Blob(chunks as BlobPart[], { type: `multipart/related; boundary=${boundary}` });
  const url = existingFileId
    ? `${DRIVE_UPLOAD}/${existingFileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD}?uploadType=multipart`;

  const res = await fetch(url, {
    method: existingFileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Google Drive upload gagal (${res.status})`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error('Drive tidak mengembalikan file id');
  return { fileId: data.id };
}
