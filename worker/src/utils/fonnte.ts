import { Env } from '../types/env';

/**
 * Send a WhatsApp message via Fonnte API.
 *
 * @param env    - Worker Env binding (FONNTE_TOKEN, FONNTE_TARGET, FONNTE_DEVICE)
 * @param message - WhatsApp message text
 * @param target  - Optional phone number (defaults to env.FONNTE_TARGET)
 * @param inboxId - Optional inbox id (dari payload webhook). Kalau diisi, Fonnte
 *                  membalas pesan dalam percakapan yang sama (bukan chat baru).
 * @returns true if sent successfully, false on failure
 */
export async function sendWA(env: Env, message: string, target?: string, inboxId?: string): Promise<{ ok: boolean; reason?: string }> {
  const token = env.FONNTE_TOKEN;
  const recipient = target || env.FONNTE_TARGET;

  if (!token || !recipient || token.startsWith('dev-')) {
    const reason = 'dev or no token/target';
    console.log('WA skip (dev or no token/target):', { hasToken: !!token, hasTarget: !!recipient });
    return { ok: false, reason };
  }

  try {
    const body: Record<string, unknown> = {
      target: recipient,
      message,
      countryCode: '62',
    };
    if (inboxId) body.inboxid = inboxId;

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await res.json() as any;

    const failed = !res.ok || result?.status === false || !!result?.error || !!result?.reason;
    if (failed) {
      const reason = result?.reason || result?.error?.message || result?.message || `HTTP ${res.status}`;
      console.error('WA send error:', reason);
      return { ok: false, reason };
    }

    console.log('WA sent successfully');
    return { ok: true };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error('WA send failed:', reason);
    return { ok: false, reason };
  }
}
