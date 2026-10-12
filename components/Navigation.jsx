import React from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'expenses', label: 'Keuangan', icon: 'wallet' },
  { id: 'family', label: 'Keluarga', icon: 'users' },
  { id: 'tasks', label: 'Tugas', icon: 'tasks' },
];

export function Navigation({ activeSection, onSectionChange, user, onSwitchUser }) {
  return (
    <>
      {/* Bar atas (sticky, bukan fixed → tidak goyang saat address bar HP menyusut) */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => onSectionChange('dashboard')}
            className="flex min-w-0 items-center gap-2.5 rounded-xl p-1 text-left transition-colors hover:bg-muted"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/25 bg-brandtint text-brand shadow-glow"
              aria-hidden="true"
            >
              <Icon name="home" size={18} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold tracking-tight text-ink">Bayt Mustaqbal</span>
              <span className="hidden text-[11px] text-mutedfg sm:block">Manajemen Keluarga</span>
            </span>
          </button>

          {/* Navigasi desktop (muncul di lg; di bawah itu pakai nav bawah) */}
          <nav aria-label="Navigasi utama" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSectionChange(item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                        active
                          ? 'border-brand/25 bg-brandtint text-brandfg'
                          : 'border-transparent text-mutedfg hover:bg-muted hover:text-ink'
                      }`}
                    >
                      <Icon name={item.icon} size={18} />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {/* Kembali ke layar gerbang (ganti pengguna) */}
            <button
              type="button"
              onClick={onSwitchUser}
              aria-label={`Ganti pengguna (sekarang ${user.name})`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-1.5 text-sm transition-colors hover:bg-muted sm:px-3"
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-lg bg-brandtint text-xs font-bold text-brandfg"
                aria-hidden="true"
              >
                {user.initials}
              </span>
              <span className="hidden max-w-[7rem] truncate text-mutedfg sm:inline">{user.name}</span>
            </button>

            <button
              type="button"
              onClick={() => window.installApp && window.installApp()}
              className={`${CTA_CLASS} hidden sm:inline-flex`}
            >
              <Icon name="download" size={16} />
              Pasang
            </button>
          </div>
        </div>
      </header>

      {/* Bar bawah: mobile & tablet (dirapikan max-w-md agar tidak melar) */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        {/* Tinggi dikunci 56px agar banner install bisa diposisikan tepat di atasnya */}
        <ul className="mx-auto flex h-[56px] max-w-md items-stretch px-1.5 lg:max-w-6xl">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[11px] font-medium leading-tight transition-colors ${
                    active ? 'text-brandfg' : 'text-mutedfg'
                  }`}
                >
                  {active && (
                    <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand shadow-glow" aria-hidden="true" />
                  )}
                  <span
                    className={`grid h-7 w-11 shrink-0 place-items-center rounded-full transition-colors ${
                      active ? 'bg-brandtint' : ''
                    }`}
                  >
                    <Icon name={item.icon} size={19} />
                  </span>
                  <span className="w-full truncate text-center">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
