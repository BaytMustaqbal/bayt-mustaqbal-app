import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { SectionHeader, Badge, CTA_CLASS } from './ui';
import { settingsApi, gcalApi, auth, backupApi, waApi } from '../services/client';
import { readUiPrefs, writeUiPrefs, applyUiPrefs, UI_PREFS_DEFAULTS } from '../services/uiPrefs';
import RulesComp from './RulesComp';
import AuditComp from './AuditComp';

/* Pilihan tampilan (same config di AccountModal.jsx) */
const THEME_OPTIONS = [
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

/* Baris header accordion — satu area terbuka dalam satu waktu. */
function SettingSection({ icon, title, subtitle, open, onToggle, badge, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">{title}</span>
          <span className="block text-[11px] text-mutedfg">{subtitle}</span>
        </span>
        {badge}
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} className="shrink-0 text-mutedfg" />
      </button>
      {open && <div className="border-t border-line p-4">{children}</div>}
    </div>
  );
}

/* ============================================================================
   Halaman Pengaturan — rumah untuk pengaturan app. Isi pertama: integrasi
   Google Calendar (satu arah: app → Google).

   Status integrasi dipegang App.jsx (state `gcal`) karena ia yang memanggil
   API /api/gcal dan menangani balikan ?gcal=connected|error dari OAuth.
   ============================================================================ */

export function SettingsComp({ gcal, onConnect, onDisconnect, theme = 'system', onThemeChange, onChangePassword }) {
  // ---- Notifikasi WA (preferensi per grup) ----
  const [notif, setNotif] = useState(NOTIF_DEFAULTS);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // ---- Konfigurasi Tombol Aksi Cepat di Dashboard ----
  // Pengguna bisa memilih 4 dari 6 pilihan tombol di bawah ini
  // Hasil disimpan di localStorage key 'bayt_qac'
  // Default: Album, Agenda, Service, Foto Struk
  const QUICK_ACTION_OPTIONS = [
    { icon: 'image', label: 'Album', path: 'album' },
    { icon: 'calendar', label: 'Agenda', path: 'agenda' },
    { icon: 'wrench', label: 'Service', path: 'service' },
    { icon: 'camera', label: 'Foto Struk', path: 'scan' },
    { icon: 'shoppingBag', label: 'Belanja', path: 'shopping' },
    { icon: 'note', label: 'Catatan', path: 'notes' },
  ];

  const DEFAULT_QUICK_ACTIONS = [
    { icon: 'image', label: 'Album', path: 'album' },
    { icon: 'calendar', label: 'Agenda', path: 'agenda' },
    { icon: 'wrench', label: 'Service', path: 'service' },
    { icon: 'camera', label: 'Foto Struk', path: 'scan' },
  ];

  // Tombol yang sudah dipilih user (dari localStorage), atau default
  const [quickActionButtons, setQuickActionButtons] = useState(() => {
    try {
      const stored = localStorage.getItem('bayt_qac');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 4 && parsed.every(b => b && b.icon && b.label && b.path)) {
          return parsed;
        }
      }
    } catch (e) {}
    // Default: Album, Agenda, Service, Foto Struk
    return [...DEFAULT_QUICK_ACTIONS];
  });

  // Simpan konfigurasi tombol aksi cepat
  const saveQuickActionButtons = (buttons) => {
    try {
      localStorage.setItem('bayt_qac', JSON.stringify(buttons));
      setQuickActionButtons(buttons);
    } catch (e) {}
  };

  // ---- Privasi & tampilan (preferensi per perangkat) ----
  const [uiPrefs, setUiPrefs] = useState(() => readUiPrefs());
  // Area accordion yang sedang terbuka (default: Integrasi).
  const [openKey, setOpenKey] = useState(null);
  const toggleKey = (k) => setOpenKey((cur) => (cur === k ? null : k));
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
  const [waTesting, setWaTesting] = useState(false);
  const [waTestMsg, setWaTestMsg] = useState(null);
  const [waSavedTarget, setWaSavedTarget] = useState(null);
  const [editingWa, setEditingWa] = useState(false);

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
        if (row?.value) {
          setWaTarget(row.value);
          setWaSavedTarget(row.value);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveWaTarget = async () => {
    setWaSaved(false);
    try {
      await settingsApi.upsert('fonnte_target', waTarget.trim());
      setWaSavedTarget(waTarget.trim());
      setEditingWa(false);
      setWaSaved(true);
      setTimeout(() => setWaSaved(false), 2500);
    } catch (e) {
      console.warn('Gagal simpan target WA:', e.message);
      setWaSaved(false);
    }
  };

  const sendWaTest = async () => {
    if (!waTarget.trim()) {
      setWaTestMsg({ tone: 'amber', text: 'Isi nomor target WhatsApp dulu.' });
      return;
    }
    setWaTesting(true);
    setWaTestMsg(null);
    try {
      await waApi.test(waTarget.trim());
      setWaTestMsg({ tone: 'green', text: 'Pesan uji terkirim ke target.' });
    } catch (e) {
      setWaTestMsg({ tone: 'danger', text: `Gagal kirim: ${e.message}` });
    } finally {
      setWaTesting(false);
    }
  };

  // ---- Keamanan sesi: metode login, sesi aktif, unlink ----
  const [googleSub, setGoogleSub] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessLoading, setSessLoading] = useState(true);

  const loadSecurity = async () => {
    try {
      const me = await auth.me();
      setGoogleSub(me?.google_sub || null);
    } catch {
      /* biarkan */
    }
    try {
      setSessions(await auth.sessions());
    } catch {
      /* biarkan */
    } finally {
      setSessLoading(false);
    }
  };

  useEffect(() => {
    loadSecurity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlinkGoogle = async () => {
    if (!window.confirm('Hapus koneksi Google akun ini? Anda tetap bisa login pakai password.')) return;
    try {
      await auth.unlinkGoogle();
      setGoogleSub(null);
    } catch (e) {
      console.warn('Gagal unlink Google:', e.message);
    }
  };

  const revokeSession = async (id) => {
    try {
      await auth.revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.warn('Gagal revoke sesi:', e.message);
    }
  };

  // ---- Data & cadangan: export/import ----
  const [bkBusy, setBkBusy] = useState(false);
  const [bkMsg, setBkMsg] = useState('');
  const fileInputRef = React.useRef(null);

  const doExport = async () => {
    setBkBusy(true);
    setBkMsg('');
    try {
      const payload = await backupApi.exportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bayt-mustaqbal-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBkMsg('Backup berhasil diunduh.');
    } catch (e) {
      setBkMsg('Gagal membuat backup: ' + e.message);
    } finally {
      setBkBusy(false);
      setTimeout(() => setBkMsg(''), 3500);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm('Import akan menimpa seluruh data keluarga saat ini. Lanjutkan?')) return;
    setBkBusy(true);
    setBkMsg('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.data) throw new Error('Format backup tidak valid');
      const res = await backupApi.importBackup(parsed);
      setBkMsg(`Import selesai (${res.restored} baris).`);
    } catch (err) {
      setBkMsg('Gagal import: ' + (err.message || 'format salah'));
    } finally {
      setBkBusy(false);
      setTimeout(() => setBkMsg(''), 4000);
    }
  };

  const doExportDrive = async () => {
    setBkBusy(true);
    setBkMsg('');
    try {
      const r = await backupApi.exportDrive();
      setBkMsg(`Backup Drive selesai (${new Date(r.last_backup).toLocaleString('id-ID')}).`);
    } catch (e) {
      const m = e.message || '';
      setBkMsg(m.includes('Hubungkan') ? 'Hubungkan Google dengan izin Drive dulu.' : 'Gagal backup Drive: ' + m);
    } finally {
      setBkBusy(false);
      setTimeout(() => setBkMsg(''), 4000);
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
        <SettingSection
          icon="bell"
          title="Notifikasi & Pengingat"
          subtitle="Kirim pengingat lewat WhatsApp"
          open={openKey === 'notifikasi'}
          onToggle={() => toggleKey('notifikasi')}
          badge={notifSaved && <Badge tone="green">Tersimpan</Badge>}
        >
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
        </SettingSection>

        {/* ---- Privasi & Tampilan ---- */}
        <SettingSection
          icon="eye"
          title="Privasi & Tampilan"
          subtitle="Berlaku di perangkat ini"
          open={openKey === 'privasi'}
          onToggle={() => toggleKey('privasi')}
        >
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

            <div>
              <p className="mb-2 text-xs font-semibold text-mutedfg">Tema</p>
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
                    <span className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface px-2 text-[11px] font-medium text-mutedfg transition-colors hover:bg-muted peer-checked:border-brand/50 peer-checked:bg-brandtint peer-checked:text-brandfg peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas">
                      <Icon name={opt.icon} size={16} />
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-mutedfg">
                <strong className="font-semibold text-ink">Sistem</strong> mengikuti pengaturan terang/gelap HP.
              </p>
            </div>
          </div>
        </SettingSection>

        {/* ---- Integrasi Lanjutan ---- */}
        <SettingSection
          icon="sparkles"
          title="Integrasi Lanjutan"
          subtitle="Layanan yang terhubung"
          open={openKey === 'integrasi'}
          onToggle={() => toggleKey('integrasi')}
        >
          <div className="space-y-4">
            {/* Daftar integrasi */}
            <div className="divide-y divide-line rounded-xl border border-line bg-canvas">
              {[
                { nama: 'Google Calendar', ket: 'Agenda & tagihan', status: gcal.connected ? 'Tersambung' : 'Belum terhubung', tone: gcal.connected ? 'green' : 'gray' },
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
                  {syncing ? <div className="ld-trio ld-xs inline-block align-middle" aria-hidden="true"><i></i><i></i><i></i></div> : <Icon name="refresh" size={14} />}
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
              {(!waSavedTarget || editingWa) ? (
                <div className="space-y-2">
                  <input
                    id="wa-target"
                    type="text"
                    inputMode="numeric"
                    value={waTarget}
                    onChange={(e) => { setWaTarget(e.target.value); setWaSaved(false); setWaTestMsg(null); }}
                    placeholder="mis. 6281234567890"
                    className="min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none focus:border-brand"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveWaTarget}
                      className={`${CTA_CLASS} min-h-[44px] flex-1 px-4 text-xs`}
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={sendWaTest}
                      disabled={waTesting}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-brand/25 bg-brandtint px-3 text-xs font-semibold text-brandfg transition-colors hover:bg-brand/10 disabled:opacity-60"
                    >
                      <Icon name="mail" size={14} />
                      {waTesting ? 'Mengirim…' : 'Kirim Tes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-canvas px-3.5 py-2.5">
                  <Icon name="phone" size={15} />
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-ink">{waSavedTarget}</span>
                  <button
                    type="button"
                    onClick={() => { setEditingWa(true); setWaTestMsg(null); }}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-brandfg transition-colors hover:bg-brandtint"
                  >
                    <Icon name="edit" size={13} /> Ubah
                  </button>
                  <button
                    type="button"
                    onClick={sendWaTest}
                    disabled={waTesting}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-brand/25 bg-brandtint px-2.5 text-xs font-semibold text-brandfg transition-colors hover:bg-brand/10 disabled:opacity-60"
                  >
                    <Icon name="mail" size={13} />
                    {waTesting ? 'Mengirim…' : 'Kirim Tes'}
                  </button>
                </div>
              )}
              {(waSaved || waTestMsg) && (
                <p
                  className={`mt-1.5 text-[11px] font-medium ${
                    waTestMsg
                      ? waTestMsg.tone === 'danger'
                        ? 'text-danger'
                        : waTestMsg.tone === 'amber'
                        ? 'text-toneamberfg'
                        : 'text-green'
                      : 'text-green'
                  }`}
                >
                  {waTestMsg ? waTestMsg.text : 'Target tersimpan.'}
                </p>
              )}
            </div>
          </div>
        </SettingSection>

        {/* ---- Keamanan Sesi ---- */}
        <SettingSection
          icon="lock"
          title="Keamanan Sesi"
          subtitle="Cara masuk & sesi aktif"
          open={openKey === 'keamanan'}
          onToggle={() => toggleKey('keamanan')}
        >
          <div className="space-y-4">
            {/* Indikator metode login */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-canvas px-3.5 py-3">
              <span className="text-xs font-semibold text-mutedfg">Metode masuk:</span>
              <Badge tone="green">Password aktif</Badge>
              {googleSub ? (
                <Badge tone="green">Google aktif</Badge>
              ) : (
                <Badge tone="gray">Google tidak terhubung</Badge>
              )}
            </div>

            {/* Aksi akun */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onChangePassword}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink"
              >
                <Icon name="key" size={14} />
                Ubah password
              </button>
              {googleSub && (
                <button
                  type="button"
                  onClick={unlinkGoogle}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-mutedfg transition-colors hover:bg-tonerose/10 hover:text-tonerosefg"
                >
                  <Icon name="logOut" size={14} />
                  Hapus koneksi Google
                </button>
              )}
            </div>

            {/* Daftar sesi aktif */}
            <div className="rounded-xl border border-line bg-canvas">
              <p className="border-b border-line px-3.5 py-2 text-xs font-semibold text-mutedfg">Sesi aktif</p>
              {sessLoading ? (
                <p className="px-3.5 py-3 text-xs text-mutedfg">Memuat…</p>
              ) : sessions.length === 0 ? (
                <p className="px-3.5 py-3 text-xs text-mutedfg">Tidak ada sesi aktif.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink">{s.device || 'Perangkat tidak dikenal'}</p>
                        <p className="text-[11px] text-mutedfg">
                          Masuk {new Date(s.created_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => revokeSession(s.id)}
                        className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[11px] font-semibold text-mutedfg transition-colors hover:bg-tonerose/10 hover:text-tonerosefg"
                      >
                        <Icon name="logOut" size={13} />
                        Keluar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </SettingSection>

        {/* ---- Aturan Otomatis ---- */}
        <SettingSection
          icon="repeat"
          title="Aturan Otomatis"
          subtitle="Otomasi 'jika-maka' pengingat"
          open={openKey === 'otomasi'}
          onToggle={() => toggleKey('otomasi')}
        >
          <RulesComp />
        </SettingSection>

        {/* ---- Konfigurasi Tombol Aksi Cepat ---- */}
        <SettingSection
          icon="quickaction"
          title="Tombol Aksi Cepat"
          subtitle="Pilih 4 tombol dari 6 pilihan di bawah"
          open={openKey === 'quickaction'}
          onToggle={() => toggleKey('quickaction')}
        >
          <div className="space-y-4">
            {QUICK_ACTION_OPTIONS.map((opt, i) => (
              <div key={i} className="checkbox-container">
                <label>
                  <input
                    type="checkbox"
                    name="quickaction-set"
                    value={i}
                    checked={quickActionButtons.some((b) => b.path === opt.path)}
                    onChange={() => {
                      // Hitung berapa checkbox yang sedang dicentang
                      const count = document.querySelectorAll('input[name="quickaction-set"]:checked').length;
                      
                      // Hanya izinkan tepat 4 pilihan
                      if (count >= 4 && !quickActionButtons.some((b) => b.path === opt.path)) {
                        // Sudah 4 dipilih dan tombol ini belum terpilih -> tolak pilihannya
                        alert('Hanya boleh memilih tepat 4 tombol. Hapus salah satu terlebih dahulu.');
                        this.checked = false;
                        return;
                      }
                      
                      const newButtons = [...quickActionButtons];
                      
                      // Jika checkbox ini sudah dicentang, hapus dari daftar
                      const idx = newButtons.findIndex((b) => b.path === opt.path);
                      if (idx >= 0) {
                        newButtons.splice(idx, 1);
                      } else {
                        // Tambah ke posisi baru (gantikan yang pertama jika sudah 4)
                        if (newButtons.length >= 4) {
                          newButtons[0] = opt;
                        } else {
                          newButtons.push(opt);
                        }
                      }
                      setQuickActionButtons(newButtons);
                      saveQuickActionButtons(newButtons);
                    }}
                  />
                  <span className="ml-2 text-sm text-ink">{opt.label}</span>
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-line text-xs text-mutedfg">
            <p>Pilih tepat 4 tombol dari 6 opsi di atas.</p>
            <p>Urutan tombol akan muncul di Dashboard Aksi Cepat.</p>
          </div>
        </SettingSection>

        {/* ---- Audit Log ---- */}
        <SettingSection
          icon="activity"
          title="Audit Log"
          subtitle="Aktivitas keluarga tercatat"
          open={openKey === 'audit'}
          onToggle={() => toggleKey('audit')}
        >
          <AuditComp />
        </SettingSection>

        {/* ---- Data & Cadangan ---- */}
        <SettingSection
          icon="download"
          title="Data & Cadangan"
          subtitle="Ekspor & pulihkan data keluarga"
          open={openKey === 'data'}
          onToggle={() => toggleKey('data')}
        >
          <div className="space-y-3">
            <button
              type="button"
              onClick={doExport}
              disabled={bkBusy}
              className={`${CTA_CLASS} min-h-[44px] w-full`}
            >
              {bkBusy ? <div className="ld-trio ld-xs inline-block align-middle" aria-hidden="true"><i></i><i></i><i></i></div> : <Icon name="download" size={15} />}
              {bkBusy ? 'Memproses…' : 'Export Backup'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={bkBusy}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink disabled:opacity-50"
            >
              <Icon name="upload" size={15} />
              Import Backup
            </button>
            <button
              type="button"
              onClick={doExportDrive}
              disabled={bkBusy}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink disabled:opacity-50"
            >
              <Icon name="drive" size={15} />
              Backup ke Google Drive
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={handleImportFile}
            />
            {bkMsg && <p className="text-center text-xs font-medium text-mutedfg">{bkMsg}</p>}
          </div>
        </SettingSection>
      </div>
    </section>
  );
}

export default SettingsComp;
