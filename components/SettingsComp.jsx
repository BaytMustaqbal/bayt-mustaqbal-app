import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { SectionHeader, Badge, CTA_CLASS } from './ui';
import { settingsApi, gcalApi } from '../services/client';
import { readUiPrefs, writeUiPrefs, applyUiPrefs, UI_PREFS_DEFAULTS } from '../services/uiPrefs';

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

export function SettingsComp({ gcal, onConnect, onDisconnect, theme = 'system', onThemeChange }) {
  // ---- Notifikasi WA (preferensi per grup) ----
  const [notif, setNotif] = useState(NOTIF_DEFAULTS);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // ---- Privasi & tampilan (preferensi per perangkat) ----
  const [uiPrefs, setUiPrefs] = useState(() => readUiPrefs());
  const saveUiPrefs = (patch) => {
    const next = { ...uiPrefs, ...patch };
    setUiPrefs(next);
    writeUiPrefs(next);
    applyUiPrefs(next);
  };

  // ---- Integrasi lanjutan: status sinkronisasi & target WA ----
  const [syncPending, setSyncPending] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [waTarget, setWaTarget] = useState('');
  const [waSaved, setWaSaved] = useState(false);

  const refreshSyncStatus = async () => {
    try {
      const s = await gcalApi.syncStatus();
      setSyncPending(s.pending);
    } catch {
      setSyncPending(null);
    }
  };

  const retrySync = async () => {
    setSyncing(true);
    try {
      const r = await gcalApi.syncRetry();
      setSyncPending(r.pending);
    } catch {
      /* biarkan */
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    refreshSyncStatus();
    settingsApi
      .fetchAll()
      .then((rows) => {
        const row = (rows || []).find((s) => s.key === 'fonnte_target');
        if (row?.value) setWaTarget(row.value);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveWaTarget = async () => {
    setWaSaved(false);
    try {
      await settingsApi.upsert('fonnte_target', waTarget.trim());
      setWaSaved(true);
      setTimeout(() => setWaSaved(false), 2500);
    } catch (e) {
      console.warn('Gagal simpan target WA:', e.message);
      setWaSaved(false);
    }
  };

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

        {/* ---- Privasi & Tampilan ---- */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
              <Icon name="eye" size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">Privasi & Tampilan</h2>
              <p className="text-[11px] text-mutedfg">Berlaku di perangkat ini</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-canvas px-3.5">
              <input
                type="checkbox"
                checked={uiPrefs.hideMoneyDefault}
                onChange={(e) => saveUiPrefs({ hideMoneyDefault: e.target.checked })}
                className="h-5 w-5 shrink-0 rounded border-line bg-canvas accent-[#2563EB]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">Sembunyikan uang default</span>
                <span className="block text-[11px] text-mutedfg">Jumlah uang tersembunyi saat buka app</span>
              </span>
            </label>

            <div>
              <label htmlFor="ui-density" className="mb-1 block text-xs font-semibold text-mutedfg">Ukuran konten</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'compact', l: 'Kompak' },
                  { v: 'normal', l: 'Normal' },
                  { v: 'large', l: 'Besar' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => saveUiPrefs({ density: opt.v })}
                    aria-pressed={uiPrefs.density === opt.v}
                    className={`min-h-[44px] rounded-xl border text-sm font-semibold transition-colors ${
                      uiPrefs.density === opt.v
                        ? 'border-brand/50 bg-brandtint text-brandfg'
                        : 'border-line bg-canvas text-mutedfg hover:bg-muted hover:text-ink'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-canvas px-3.5">
              <input
                type="checkbox"
                checked={uiPrefs.compactMode}
                onChange={(e) => saveUiPrefs({ compactMode: e.target.checked })}
                className="h-5 w-5 shrink-0 rounded border-line bg-canvas accent-[#2563EB]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">Mode kompak</span>
                <span className="block text-[11px] text-mutedfg">Rapatkan jarak antar-kartu</span>
              </span>
            </label>
          </div>
        </div>

        {/* ---- Integrasi Lanjutan ---- */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
              <Icon name="sparkles" size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">Integrasi Lanjutan</h2>
              <p className="text-[11px] text-mutedfg">Layanan yang terhubung</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Daftar integrasi */}
            <div className="divide-y divide-line rounded-xl border border-line bg-canvas">
              {[
                { nama: 'Google Calendar', ket: 'Agenda & tagihan', status: gcal.connected ? 'Tersambung' : 'Belum terhubung', tone: gcal.connected ? 'green' : 'gray' },
                { nama: 'Google Photos', ket: 'Foto Momen Keluarga', status: gcal.connected ? 'Siap (via Google)' : 'Butuh koneksi Google', tone: gcal.connected ? 'green' : 'amber' },
                { nama: 'WhatsApp / Fonnte', ket: 'Pengingat & digest', status: 'Terpasang', tone: 'green' },
              ].map((row) => (
                <div key={row.nama} className="flex items-center gap-3 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{row.nama}</p>
                    <p className="text-[11px] text-mutedfg">{row.ket}</p>
                  </div>
                  <Badge tone={row.tone}>{row.status}</Badge>
                </div>
              ))}
            </div>

            {/* Detail koneksi Google */}
            <div className="rounded-xl border border-line bg-canvas p-3.5">
              <p className="mb-2 text-xs font-semibold text-mutedfg">Koneksi Google</p>
              {gcal.connected && gcal.email ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-xs text-mutedfg">
                    <Icon name="mail" size={14} />
                    {gcal.email}
                  </p>
                  <button
                    type="button"
                    onClick={onDisconnect}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink"
                  >
                    <Icon name="logOut" size={14} />
                    Putuskan
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-mutedfg">Belum terhubung ke Google.</p>
                  <button type="button" onClick={onConnect} className={`${CTA_CLASS} min-h-[40px] px-4 text-xs`}>
                    <Icon name="refresh" size={14} />
                    Hubungkan
                  </button>
                </div>
              )}
              <p className="mt-2 text-[11px] text-mutedfg">
                Agenda & tagihan otomatis dikirim. Token disimpan di server.
              </p>
            </div>

            {/* Status sinkronisasi */}
            <div className="rounded-xl border border-line bg-canvas p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-mutedfg">
                  <Icon name="refresh" size={14} />
                  Sinkronisasi Google
                </p>
                <button
                  type="button"
                  onClick={retrySync}
                  disabled={syncing}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink disabled:opacity-50"
                >
                  <Icon name={syncing ? 'loader' : 'refresh'} size={14} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Memproses…' : 'Coba ulang'}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-mutedfg">
                {syncPending == null
                  ? 'Tidak dapat membaca status.'
                  : syncPending === 0
                    ? 'Tidak ada antrean tertunda.'
                    : `${syncPending} agenda/tagihan menunggu dikirim.`}
              </p>
            </div>

            {/* Kelola target WhatsApp */}
            <div className="rounded-xl border border-line bg-canvas p-3.5">
              <label htmlFor="wa-target" className="mb-1 block text-xs font-semibold text-mutedfg">
                Target WhatsApp (nomor tujuan pengingat)
              </label>
              <div className="flex gap-2">
                <input
                  id="wa-target"
                  type="text"
                  inputMode="numeric"
                  value={waTarget}
                  onChange={(e) => { setWaTarget(e.target.value); setWaSaved(false); }}
                  placeholder="mis. 6281234567890"
                  className="min-h-[44px] flex-1 rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={saveWaTarget}
                  className={`${CTA_CLASS} min-h-[44px] px-4 text-xs`}
                >
                  Simpan
                </button>
              </div>
              {waSaved && <p className="mt-1.5 text-[11px] font-medium text-green">Target tersimpan.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SettingsComp;
