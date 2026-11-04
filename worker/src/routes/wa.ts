import { Hono } from 'hono';
import { Env } from '../types/env';
import { sendWA } from '../utils/fonnte';
import { readFonnteTarget } from '../utils/notif';

/**
 * Route WhatsApp / Fonnte. Saat ini hanya dipakai untuk mengirim pesan uji
 * dari halaman Pengaturan (integrasi lanjutan). Kirim pesan dilakukan di
 * server agar token Fonnte tidak bocor ke frontend.
 */
export const waRoutes = new Hono<{ Bindings: Env }>();

// POST /api/wa/test — kirim pesan uji ke target WhatsApp (opsional target custom)
waRoutes.post('/test', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const customTarget = typeof body?.target === 'string' ? body.target.trim() : '';
  const target = customTarget || (await readFonnteTarget(c.env));

  if (!target) {
    return c.json(
      {
        ok: false,
        data: null,
        error: { code: 'WA_NO_TARGET', message: 'Nomor target WhatsApp belum diatur. Isi target lalu simpan dulu.' },
      },
      400
    );
  }

  const ok = await sendWA(c.env, 'Tes dari Bayt Mustaqbal: notifikasi WhatsApp berfungsi.', target);
  if (!ok) {
    return c.json(
      {
        ok: false,
        data: null,
        error: { code: 'WA_SEND_FAILED', message: 'Gagal mengirim pesan uji. Periksa token Fonnte & nomor tujuan.' },
      },
      502
    );
  }

  return c.json({ ok: true, data: { sent: true, target }, error: null });
});
