import { Env } from '../types/env';

/**
 * Send a WhatsApp message via Fonnte API.
 *
 * @param env   - Worker Env binding (FONNTE_TOKEN, FONNTE_TARGET, FONNTE_DEVICE)
 * @param message - WhatsApp message text
 * @param target  - Optional phone number (defaults to env.FONNTE_TARGET)
 * @returns true if sent successfully, false on failure
 */
export async function sendWA(env: Env, message: string, target?: string): Promise<boolean> {
  const token = env.FONNTE_TOKEN;
  const recipient = target || env.FONNTE_TARGET;

  if (!token || !recipient || token.startsWith('dev-')) {
    console.log('WA skip (dev or no token/target):', { hasToken: !!token, hasTarget: !!recipient });
    return false;
  }

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: recipient,
        message,
        countryCode: '62',
      }),
    });

    const result = await res.json() as any;

    if (result.error) {
      console.error('WA send error:', result.error, result.message);
      return false;
    }

    console.log('WA sent successfully');
    return true;
  } catch (e) {
    console.error('WA send failed:', e);
    return false;
  }
}
