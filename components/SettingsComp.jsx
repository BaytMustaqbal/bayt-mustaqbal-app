import React from 'react';
import { Icon } from './Icon';
import { SectionHeader, Badge, CTA_CLASS } from './ui';

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

export function SettingsComp({ gcal, onConnect, onDisconnect, onRetry }) {
  const busy = gcal.loading || gcal.connecting;

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

        {/* ---- Placeholder pengaturan lain (biar halaman tidak terasa kosong) ---- */}
        <div className="rounded-xl border border-dashed border-line bg-surface/60 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-mutedfg">
            <Icon name="sparkles" size={16} aria-hidden="true" />
            Pengaturan lainnya
          </div>
          <p className="mt-1 text-xs text-mutedfg">
            Tema, notifikasi, dan preferensi anggota akan menyusul di sini.
          </p>
        </div>
      </div>
    </section>
  );
}

export default SettingsComp;
