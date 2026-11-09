import { Env } from '../types/env';

/**
 * Preferensi notifikasi WA (disimpan di tabel settings, key "notif_prefs",
 * per grup keluarga). Dipakai cron untuk memutuskan apakah & kapan mengirim
 * pengingat tagihan / digest harian, plus menghormati mode senyap.
 */
export interface NotifPrefs {
  /** Kirim pengingat tagihan (default true). */
  tagihanEnabled: boolean;
  /** Kirim digest harian (default true). */
  digestEnabled: boolean;
  /** Kirim pengingat H-3 tugas terjadwal (default true). */
  scheduledEnabled: boolean;
  /** Jam WIB kirim digest (0-23, default 7 = 07.00). */
  digestHour: number;
  /** Jam WIB kirim pengingat tagihan; null = tiap jam. */
  reminderHour: number | null;
  /** Awal jendela senyap (0-23); null = nonaktif. */
  quietStart: number | null;
  /** Akhir jendela senyap (0-23); null = nonaktif. */
  quietEnd: number | null;
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  tagihanEnabled: true,
  digestEnabled: true,
  scheduledEnabled: true,
  digestHour: 7,
  reminderHour: null,
  quietStart: null,
  quietEnd: null,
};

function toIntOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) ? v : null;
}

/** Baca preferensi dari settings; tanpa baris/parse gagal → default. */
export async function readNotifPrefs(env: Env): Promise<NotifPrefs> {
  const row = (await env.DB.prepare(
    `SELECT value FROM settings WHERE key = 'notif_prefs' AND group_id IS NOT NULL AND void IS NULL ORDER BY updated_at DESC LIMIT 1`
  ).first()) as { value: string } | null;

  if (!row?.value) return { ...DEFAULT_NOTIF_PREFS };

  try {
    const p = JSON.parse(row.value) as Partial<NotifPrefs>;
    return {
      tagihanEnabled: p.tagihanEnabled !== false,
      digestEnabled: p.digestEnabled !== false,
      scheduledEnabled: p.scheduledEnabled !== false,
      digestHour: toIntOrNull(p.digestHour) ?? DEFAULT_NOTIF_PREFS.digestHour,
      reminderHour: toIntOrNull(p.reminderHour),
      quietStart: toIntOrNull(p.quietStart),
      quietEnd: toIntOrNull(p.quietEnd),
    };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

/** Benarkah jam ini berada dalam jendela senyap (mendukung lompat tengah malam)? */
export function isInQuietWindow(prefs: NotifPrefs, hour: number): boolean {
  const s = prefs.quietStart;
  const e = prefs.quietEnd;
  if (s == null || e == null || s === e) return false;
  if (s < e) return hour >= s && hour < e;
  return hour >= s || hour < e;
}

/** Target WhatsApp untuk pengingat keluarga (setting "fonnte_target" per grup), fallback env. */
export async function readFonnteTarget(env: Env): Promise<string | undefined> {
  const row = (await env.DB.prepare(
    `SELECT value FROM settings WHERE key = 'fonnte_target' AND group_id IS NOT NULL AND void IS NULL ORDER BY updated_at DESC LIMIT 1`
  ).first()) as { value: string } | null;
  const configured = row?.value?.trim();
  return configured || env.FONNTE_TARGET;
}
