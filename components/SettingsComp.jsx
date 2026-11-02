import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { SectionHeader, Badge, CTA_CLASS } from './ui';
import { settingsApi } from '../services/client';

/* Pilihan tampilan (same config di AccountModal.jsx) */
const THEME_OPTIONS = [
  { value: 'system', label: 'Sistem', icon: 'monitor' },
  { value: 'light', label: 'Terang', icon: 'sun' },
  { value: 'dark', label: 'Gelap', icon: 'moon' },
];

const NOTIF_DEFAULTS = {
  tagihanEnabled: true,
  digestEnabled: true,
  digestHour: 7,
  reminderHour: null,
  quietStart: null,
  quietEnd: null,
};

const hoursOptions = () => {
  const arr = [];
  for (let h = 0; h < 24; h++) arr.push(h);
  return arr;
};

/* ============================================================================
   Halaman Pengaturan — rumah untuk pengaturan app. Isi pertama: integrasi
   Google Calendar (satu arah: app → Google).

   Status integrasi dipegang App.jsx (state `gcal`) karena ia yang memanggil
   API /api/gcal dan menangani balikan ?gcal=connected|error dari OAuth.
   ============================================================================ */

const statusBadge = (gcal) => {
  if (gcal.loading) return <Badge tone="gray">Memeriksa…</Badge>;
  if (gcal.notConfigured) return <Badge tone="amber">Belum dikonfigurasi</Badge>;
  if (gcal.error) return <Badge tone="red">Gagal memeriksa</Badge>;
  if (gcal.connected) return <Badge tone="green">Tersambung</Badge>;
  return <Badge tone="gray">Belum tersambung</Badge>;
};

export function SettingsComp({ gcal, onConnect, onDisconnect, onRetry, theme = 'system', onThemeChange }) {
  const busy = gcal.loading || gcal.connecting;

  // ---- Notifikasi WA (preferensi per grup) ----
  const [notif, setNotif] = useState(NOTIF_DEFAULTS);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    settingsApi
      .fetchAll()
      .then((rows) => {
        if (!alive) return;
        const row = (rows || []).find((s) => s.key === 'notif_prefs');
        if (row?.value) {
          try {
            const p = JSON.parse(row.value);
            setNotif({
              tagihanEnabled: p.tagihanEnabled !== false,
              digestEnabled: p.digestEnabled !== false,
              digestHour: Number.isInteger(p.digestHour) ? p.digestHour : NOTIF_DEFAULTS.digestHour,
              reminderHour: p.reminderHour == null ? null : Number.isInteger(p.reminderHour) ? p.reminderHour : null,
              quietStart: p.quietStart == null ? null : Number.isInteger(p.quietStart) ? p.quietStart : null,
              quietEnd: p.quietEnd == null ? null : Number.isInteger(p.quietEnd) ? p.quietEnd : null,
            });
          } catch {
            /* default */
          }
        }
        setNotifLoaded(true);
      })
      .catch(() => setNotifLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const persistNotif = async (patch) => {
    const next = { ...notif, ...patch };
    setNotif(next);
    setNotifSaved(false);
    try {
      await settingsApi.upsert('notif_prefs', JSON.stringify(next));
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    } catch (e) {
      /* gagal simpan — biarkan state lokal */
      console.warn('Gagal simpan preferensi notifikasi:', e.message);
    }
  };

  return (
    <section className="app-fade-in">
      <SectionHeader
        icon="settings"
        title="Pengaturan"
        subtitle="Akun, integrasi & preferensi"
      />

      <div className="space-y-4">
        {/* ---- Kartu Google Calendar ---- */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
                  <Icon name="calendar" size={18} />
                </span>
                <h2 className="text-sm font-bold text-ink sm:text-base">Google Calendar</h2>
                {statusBadge(gcal)}
              </div>
              <p className="mt-2 max-w-xl text-sm text-mutedfg">
                Agenda dan tagihan otomatis dikirim ke Google Calendar setiap kali
                ditambah, diubah, atau dihapus. Akses hanya untuk menulis event
                kalender, bukan membaca email atau data Google lain.
              </p>
              {gcal.connected && gcal.email && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-mutedfg">
                  <Icon name="mail" size={14} aria-hidden="true" />
                  Akun: <span className="font-medium text-ink">{gcal.email}</span>
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              {gcal.connected ? (
                <button
                  type="button"
                  onClick={onDisconnect}
                  disabled={busy}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink disabled:opacity-50"
                >
                  <Icon name="logOut" size={16} />
                  Putuskan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onConnect}
                  disabled={busy || gcal.notConfigured}
                  className={CTA_CLASS}
                >
                  <Icon name={gcal.connecting ? 'loader' : 'refresh'} size={16} className={gcal.connecting ? 'animate-spin' : ''} />
                  {gcal.connecting ? 'Membuka Google…' : 'Hubungkan'}
                </button>
              )}
            </div>
          </div>

          {/* ---- Pesan status / error ---- */}
          {gcal.notConfigured && (
            <p className="mt-4 rounded-lg bg-toneamber/10 px-3 py-2 text-xs text-toneamberfg">
              Integrasi belum diaktifkan di server: GOOGLE_CLIENT_ID dan
              GOOGLE_CLIENT_SECRET belum di-set ke Worker. Hubungkan setelah
              konfigurasi OAuth Google disiapkan.
            </p>
          )}
          {gcal.error && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-tonerose/10 px-3 py-2 text-xs text-tonerosefg">
              <span>{gcal.error}</span>
              <button
                type="button"
                onClick={onRetry}
                className="font-semibold underline underline-offset-2"
              >
                Coba lagi
              </button>
            </div>
          )}

          <ul className="mt-4 grid gap-2 text-xs text-mutedfg sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <Icon name="circleCheck" size={14} className="mt-0.5 shrink-0 text-toneemeraldfg" aria-hidden="true" />
              Event agenda tampil sesuai jam (zona Asia/Jakarta).
            </li>
            <li className="flex items-start gap-2">
              <Icon name="circleCheck" size={14} className="mt-0.5 shrink-0 text-toneemeraldfg" aria-hidden="true" />
              Tagihan jatuh tempo tampil sebagai event seharian.
            </li>
            <li className="flex items-start gap-2">
              <Icon name="circleCheck" size={14} className="mt-0.5 shrink-0 text-toneemeraldfg" aria-hidden="true" />
              Sinkron dicoba ulang otomatis bila Google sedang gangguan.
            </li>
            <li className="flex items-start gap-2">
              <Icon name="lock" size={14} className="mt-0.5 shrink-0 text-toneemeraldfg" aria-hidden="true" />
              Token disimpan di server, bukan di browser.
            </li>
          </ul>
        </div>

        {/* ---- Notifikasi & pengingat WA ---- */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
              <Icon name="bell" size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-ink">Notifikasi & Pengingat</h2>
              <p className="text-[11px] text-mutedfg">Kirim pengingat lewat WhatsApp</p>
            </div>
            {notifSaved && <Badge tone="green">Tersimpan</Badge>}
          </div>

          {!notifLoaded ? (
            <p className="text-xs text-mutedfg">Memuat preferensi…</p>
          ) : (
            <div className="space-y-4">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-canvas px-3.5">
                <input
                  type="checkbox"
                  checked={notif.tagihanEnabled}
                  onChange={(e) => persistNotif({ tagihanEnabled: e.target.checked })}
                  className="h-5 w-5 shrink-0 rounded border-line bg-canvas accent-[#2563EB]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">Pengingat Tagihan</span>
                  <span className="block text-[11px] text-mutedfg">WA saat tagihan jatuh tempo</span>
                </span>
              </label>

              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-canvas px-3.5">
                <input
                  type="checkbox"
                  checked={notif.digestEnabled}
                  onChange={(e) => persistNotif({ digestEnabled: e.target.checked })}
                  className="h-5 w-5 shrink-0 rounded border-line bg-canvas accent-[#2563EB]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">Digest Harian</span>
                  <span className="block text-[11px] text-mutedfg">Ringkasan transaksi & agenda pagi</span>
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="notif-digest-hour" className="mb-1 block text-xs font-semibold text-mutedfg">Jam digest</label>
                  <select
                    id="notif-digest-hour"
                    value={notif.digestHour}
                    disabled={!notif.digestEnabled}
                    onChange={(e) => persistNotif({ digestHour: Number(e.target.value) })}
                    className="min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand disabled:opacity-50"
                  >
                    {hoursOptions().map((h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="notif-reminder-hour" className="mb-1 block text-xs font-semibold text-mutedfg">Jam pengingat tagihan</label>
                  <select
                    id="notif-reminder-hour"
                    value={notif.reminderHour ?? ''}
                    disabled={!notif.tagihanEnabled}
                    onChange={(e) => persistNotif({ reminderHour: e.target.value === '' ? null : Number(e.target.value) })}
                    className="min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand disabled:opacity-50"
                  >
                    <option value="">Tiap jam</option>
                    {hoursOptions().map((h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-mutedfg">
                  <Icon name="moon" size={14} />
                  Mode senyap (tidak kirim WA)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="notif-quiet-start" className="mb-1 block text-[11px] text-mutedfg">Mulai</label>
                    <select
                      id="notif-quiet-start"
                      value={notif.quietStart ?? ''}
                      onChange={(e) => persistNotif({ quietStart: e.target.value === '' ? null : Number(e.target.value) })}
                      className="min-h-[40px] w-full rounded-lg border border-line bg-canvas px-2.5 text-sm text-ink outline-none focus:border-brand"
                    >
                      <option value="">Nonaktif</option>
                      {hoursOptions().map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="notif-quiet-end" className="mb-1 block text-[11px] text-mutedfg">Selesai</label>
                    <select
                      id="notif-quiet-end"
                      value={notif.quietEnd ?? ''}
                      onChange={(e) => persistNotif({ quietEnd: e.target.value === '' ? null : Number(e.target.value) })}
                      className="min-h-[40px] w-full rounded-lg border border-line bg-canvas px-2.5 text-sm text-ink outline-none focus:border-brand"
                    >
                      <option value="">Nonaktif</option>
                      {hoursOptions().map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---- Tampilan (tema) ---- */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">Tampilan</h2>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => (
              <label key={opt.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="bm-theme"
                  value={opt.value}
                  checked={theme === opt.value}
                  onChange={() => onThemeChange?.(opt.value)}
                  className="peer sr-only"
                />
                <span className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface px-2 text-[11px] font-medium text-mutedfg transition-colors hover:bg-muted peer-checked:border-brand/50 peer-checked:bg-brandtint peer-checked:text-brandfg peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas">
                  <Icon name={opt.icon} size={17} />
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-mutedfg">
            Pilihan langsung berlaku. <strong className="font-semibold text-ink">Sistem</strong> mengikuti
            pengaturan terang/gelap HP.
          </p>
        </div>
      </div>
    </section>
  );
}

export default SettingsComp;
