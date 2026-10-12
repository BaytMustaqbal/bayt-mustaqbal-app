import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';
import { AGENDA_CATEGORIES, countByCategory } from './agendaCategories';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'expenses', label: 'Keuangan', icon: 'wallet' },
  { id: 'family', label: 'Keluarga', icon: 'users' },
  { id: 'tasks', label: 'Tugas', icon: 'tasks' },
];

/* Panel dropdown kategori agenda (dipakai 2x: bawah HP + atas desktop).
   Animasi slide-up + fade berundak via App.css; exit lebih cepat dari enter. */
function AgendaMenu({ schedule, activeId, closing, menuId, onSelect }) {
  return (
    <div
      id={menuId}
      role="menu"
      aria-label="Kategori agenda"
      data-agenda-menu
      className={`agenda-menu w-64 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-glow backdrop-blur-xl ${
        closing ? 'agenda-menu--closing' : ''
      }`}
    >
      {AGENDA_CATEGORIES.map((cat, index) => {
        const active = activeId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            style={{ '--i': index }}
            onClick={() => onSelect(cat.id)}
            className={`agenda-menu__item flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors ${
              active ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:bg-muted hover:text-ink'
            }`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                active ? 'bg-brand/15' : 'bg-muted'
              }`}
              aria-hidden="true"
            >
              <Icon name={cat.icon} size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{cat.label}</span>
            <span className="shrink-0 font-mono text-xs opacity-80">{countByCategory(schedule, cat.id)}</span>
            {active && <Icon name="check" size={15} className="shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export function Navigation({
  activeSection,
  onSectionChange,
  user,
  onSwitchUser,
  schedule,
  agendaFilter,
  onAgendaSelect,
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const lastTriggerRef = useRef(null);
  const desktopMenuRef = useRef(null);

  const closeMenu = () => {
    if (!open) return;
    setClosing(true);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 150);
  };

  const openMenu = (trigger) => {
    clearTimeout(closeTimerRef.current);
    lastTriggerRef.current = trigger;
    setClosing(false);
    setOpen(true);
  };

  const toggleMenu = (e) => (open ? closeMenu() : openMenu(e.currentTarget));

  // Tutup saat: klik/ketuk di luar menu & trigger, atau tekan Escape
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (e.target.closest('[data-agenda-menu], [data-agenda-trigger]')) return;
      closeMenu();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeMenu();
        lastTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Fokus item pertama saat menu dibuka di desktop (bagi pengguna keyboard)
  useEffect(() => {
    if (open && window.matchMedia('(min-width: 1024px)').matches) {
      const first = desktopMenuRef.current?.querySelector('[role="menuitemradio"]');
      first?.focus();
    }
  }, [open]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const handleAgendaSelect = (categoryId) => {
    closeMenu();
    onAgendaSelect(categoryId);
  };

  const handleSection = (id) => {
    if (id === 'agenda') return; // tab Agenda = trigger dropdown, bukan navigasi biasa
    closeMenu();
    onSectionChange(id);
  };

  return (
    <>
      {/* Bar atas (sticky, bukan fixed → tidak goyang saat address bar HP menyusut) */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => handleSection('dashboard')}
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
                const isAgenda = item.id === 'agenda';
                const active = activeSection === item.id || (isAgenda && open);
                return (
                  <li key={item.id} className={isAgenda ? 'relative' : ''}>
                    <button
                      type="button"
                      onClick={isAgenda ? toggleMenu : () => handleSection(item.id)}
                      aria-haspopup={isAgenda ? 'menu' : undefined}
                      aria-expanded={isAgenda ? open : undefined}
                      aria-controls={isAgenda ? 'agenda-menu-desktop' : undefined}
                      data-agenda-trigger={isAgenda ? '' : undefined}
                      aria-current={active && !open ? 'page' : undefined}
                      className={`flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                        active
                          ? 'border-brand/25 bg-brandtint text-brandfg'
                          : 'border-transparent text-mutedfg hover:bg-muted hover:text-ink'
                      }`}
                    >
                      <Icon name={item.icon} size={18} />
                      {item.label}
                      {isAgenda && (
                        <Icon
                          name="chevronDown"
                          size={14}
                          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        />
                      )}
                    </button>

                    {isAgenda && open && (
                      <div
                        ref={desktopMenuRef}
                        className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2"
                      >
                        <AgendaMenu
                          schedule={schedule}
                          activeId={agendaFilter}
                          closing={closing}
                          menuId="agenda-menu-desktop"
                          onSelect={handleAgendaSelect}
                        />
                      </div>
                    )}
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
            const isAgenda = item.id === 'agenda';
            const active = activeSection === item.id || (isAgenda && open);
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={isAgenda ? toggleMenu : () => handleSection(item.id)}
                  aria-haspopup={isAgenda ? 'menu' : undefined}
                  aria-expanded={isAgenda ? open : undefined}
                  aria-controls={isAgenda ? 'agenda-menu-mobile' : undefined}
                  data-agenda-trigger={isAgenda ? '' : undefined}
                  aria-current={active && !open ? 'page' : undefined}
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
                  <span className="flex w-full items-center justify-center gap-0.5">
                    <span className="truncate">{item.label}</span>
                    {isAgenda && (
                      <Icon
                        name="chevronDown"
                        size={12}
                        className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                      />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Menu kategori: menggantung di atas tab bar */}
        {open && (
          <div className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 lg:hidden">
            <AgendaMenu
              schedule={schedule}
              activeId={agendaFilter}
              closing={closing}
              menuId="agenda-menu-mobile"
              onSelect={handleAgendaSelect}
            />
          </div>
        )}
      </nav>
    </>
  );
}