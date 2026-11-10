import * as webpush from 'web-push';
import { Env } from '../types/env';

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Kirim push ke semua langganan milik user. Gagal satu tidak menggagalkan lainnya. */
export async function sendPushToUser(env: Env, userId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(
    env.VAPID_SUBJECT || 'mailto:baytmustaqbal@gmail.com',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  const rows = await env.DB.prepare(
    `SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?`
  ).bind(userId).all();
  const subs = (rows.results || []) as unknown as PushSubscriptionRow[];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch {
      // Subscription kadaluwarsa atau tidak valid → hapus.
      await env.DB.prepare('DELETE FROM push_subscriptions WHERE id = ?').bind(sub.id).run();
    }
  }
}
