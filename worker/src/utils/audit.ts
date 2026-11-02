import { Env } from '../types/env';

/** Catat aktivitas penting ke audit_log. */
export async function logAudit(
  env: Env,
  userId: string,
  groupId: string | null,
  action: string,
  tableName = 'users',
  recordId = userId
): Promise<void> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO audit_log (id, user_id, group_id, action, table_name, record_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, userId, groupId, action, tableName, recordId, now).run();
}
