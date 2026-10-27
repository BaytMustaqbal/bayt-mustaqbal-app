import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Avatar } from './ui';
import {
  AGENDA_CATEGORIES,
  FINANCE_CATEGORIES,
  FAMILY_CATEGORIES,
  NOTES_FILTERS,
  countByCategory,
  countByNoteFilter,
} from './categories';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'expenses', label: 'Keuangan', icon: 'wallet' },
  { id: 'terjadwal', label: 'Tugas Terjadwal', icon: 'clock' },
  { id: 'family', label: 'Keluarga', icon: 'users' },
  { id: 'notes', label: 'Catatan', icon: 'note' },
];

const BOTTOM_NAV_ITEMS = [
  { id: 'agenda' },
  { id: 'expenses' },
  { id: 'dashboard' },
  { id: 'terjadwal' },
  { id: 'family' },
  { id: 'notes' },
];

const DROPDOWNS = {
  agenda: { items: AGENDA_CATEGORIES, ariaLabel: 'Kategori agenda' },
  expenses: { items: FINANCE_CATEGORIES, ariaLabel: 'Kategori pengeluaran' },
  terjadwal: { items: [], ariaLabel: 'Tugas terjadwal' }, // placeholder
  family: { items: FAMILY_CATEGORIES, ariaLabel: 'Bagian keluarga' },
  notes: { items: NOTES_FILTERS, ariaLabel: 'Filter catatan' },
};

const TERJADWAL_ITEMS = [
  { id: 'pengeluaran-terjadwal', label: 'Pengeluaran Terjadwal', icon: 'receipt' },
  { id: 'target-tabungan', label: 'Target Tabungan', icon: 'piggyBank' },
];

function CategoryMenu({ items, data, activeId, closing, menuId, onSelect, ariaLabel, count = countByCategory }) {
  return (
    <div
      id={menuId}
      role="menu"
      aria-label={ariaLabel}
      data-drop-menu
      className={`drop-menu w-64 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-pop backdrop-blur-xl ${closing ? 'drop-menu--closing' : ''}`}
    >
      {items.map((cat, index) => {
        const active = activeId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            style={{ '--i': index }}
            onClick={() => onSelect(cat.id)}
            className={`drop-menu__item flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors ${active ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:bg-muted hover:text-ink'}`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? 'bg-brand/15' : 'bg-muted'}`}
              aria-hidden="true"
            >
              <Icon name={cat.icon} size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{cat.label}</span>
            <span className="shrink-0 font-mono text-xs opacity-80">{count(data, cat.id)}</span>
            {active && <Icon name="check" size={15} className="shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

const NOTIF_TONES = {
  rose: 'bg-tonerose/15 text-tonerosefg',
  amber: 'bg-toneamber/15 text-toneamberfg',
  violet: 'bg-toneviolet/15 text-tonevioletfg',
  blue: 'bg-toneblue/15 text-tonebluefg',
  cyan: 'bg-tonecyan/15 text-tonecyanfg',
};

function NotificationMenu({ items, readIds, closing, onSelect, onMarkAll }) {
  const unreadCount = items.filter((n) => !readIds.includes(n.id)).length;

  return (
    <div id="notif-menu" aria-label="Notifikasi" data-drop-menu className={`drop-menu drop-menu--right w-80 max-w-[calc(100vw_-_2rem)] overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-pop backdrop-blur-xl ${closing ? 'drop-menu--closing' : ''}`}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <p className="text-sm font-bold text-ink">Notifikasi</p>
        <span className="shrink-0 font-mono text-xs text-mutedfg">{unreadCount > 0 ? `${unreadCount} baru` : 'semua terbaca'}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-mutedfg">Belum ada yang perlu ditindak.</p>
      ) : (
        <ul className="max-h-[60vh] overflow-y-auto p-1.5">
          {items.map((item, index) => {
            const unread = !readIds.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  data-notif-item=""
                  style={{ '--i': index }}
                  onClick={() => onSelect(item)}
                  className={`drop-menu__item flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-muted ${unread ? '' : 'opacity-70'}`}
                >
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${NOTIF_TONES[item.tone] || NOTIF_TONES.cyan}`} aria-hidden="true">
                    <Icon name={item.icon} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-ink">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-mutedfg">{item.message}</span>
                  </span>
                  {unread && (
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-brand shadow-glow" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {unreadCount > 0 && (
        <div className="border-t border-line p-1.5">
          <button type="button" onClick={onMarkAll} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-brandfg transition-colors hover:bg-brandtint">
            <Icon name="circleCheck" size={16} />
            Tandai semua dibaca
          </button>
        </div>
      )}
    </div>
  );
}

export function Navigation({
  activeSection,
  onSectionChange,
  user,
  onOpenAccount,
  schedule,
  expenses,
  family,
  notes,
  agendaFilter,
  onAgendaSelect,
  financeFilter,
  onFinanceSelect,
  familyFilter,
  onFamilySelect,
  noteFilter,
  onNoteSelect,
  notifications = [],
  notifReadIds = [],
  onNotificationOpen,
  onMarkAllNotificationsRead,
  onOpenSidebar,
}) {
  const [openKey, setOpenKey] = useState(null);
  const [closingKey, setClosingKey] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const closeTimerRef = useRef(null);
  const lastTriggerRef = useRef(null);
  const notifMenuRef = useRef(null);
  const lastScrollY = useRef(0);

  const closeMenu = () => {
    if (!openKey) return;
    setClosingKey(openKey);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpenKey(null);
      setClosingKey(null);
    }, 150);
  };

  const openMenu = (key, trigger) => {
    clearTimeout(closeTimerRef.current);
    lastTriggerRef.current = trigger;
    setClosingKey(null);
    setOpenKey(key);
  };

  const toggleMenu = (key, e) => (openKey === key ? closeMenu() : openMenu(key, e.currentTarget));

  // Auto-hide header saat scroll ke bawah
  useEffect(() => {
    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      setScrolled(y > 6);
      if (Math.abs(y - lastScrollY.current) < 8) return;
      const goingDown = y > lastScrollY.current;
      lastScrollY.current = y;
      setHeaderHidden(goingDown && y > 96);
      if (goingDown && y > 96) closeMenu();
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!openKey) return undefined;
    const onPointerDown = (e) => {
      if (e.target.closest('[data-drop-menu], [data-dropdown-trigger]')) return;
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
  }, [openKey]);

  const notifUnread = notifications.filter((n) => !notifReadIds.includes(n.id)).length;

  const handleNotification = (item) => {
    closeMenu();
    onNotificationOpen?.(item);
  };

  const handleDropdownSelect = (key, categoryId) => {
    closeMenu();
    if (key === 'agenda') onAgendaSelect(categoryId);
    else if (key === 'expenses') onFinanceSelect(categoryId);
    else if (key === 'notes') onNoteSelect(categoryId);
    else onFamilySelect(categoryId);
  };

  const dropdownData = { agenda: schedule, expenses, family, notes };
  const dropdownCount = { agenda: countByCategory, expenses: countByCategory, family: countByCategory, notes: countByNoteFilter };
  const activeFilter = (key) => (key === 'agenda' ? agendaFilter : key === 'expenses' ? financeFilter : key === 'family' ? familyFilter : noteFilter);

  return (
    <>
      <header className={`sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-[transform,background-color,border-color,box-shadow] duration-base ease-crisp ${headerHidden ? '-translate-y-full' : 'translate-y-0'} ${scrolled ? 'border-line bg-canvas/90 shadow-e2' : 'border-transparent bg-canvas/80'}`}>
        <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
          {/* Logo - trigger buka sidebar di desktop */}
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex min-w-0 items-center gap-2.5 rounded-xl p-1 text-left transition-colors hover:bg-muted lg:pointer-events-auto lg:cursor-pointer"
            aria-label="Buka menu"
          >
            <span className="grid h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-brand/25 bg-brandtint p-1 shadow-glow sm:h-10 sm:w-10" aria-hidden="true">
              <img src="/brand/logo.png" alt="" className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold tracking-tight text-ink">Bayt Mustaqbal</span>
              <span className="hidden text-[11px] text-mutedfg sm:block">Manajemen Keluarga</span>
            </span>
          </button>

          {/* Notifikasi + Akun di kanan */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Notifikasi (lonceng) */}
            <button
              type="button"
              onClick={() => { if (!openKey || openKey !== 'notif') openMenu('notif',); }}
              aria-expanded={openKey === 'notif'}
              aria-controls="notif-menu"
              aria-label={notifUnread > 0 ? `Notifikasi, ${notifUnread} belum dibaca` : 'Notifikasi'}
              className={`relative grid h-11 w-11 place-items-center rounded-full border transition-colors ${openKey === 'notif' ? 'border-brand/30 bg-brandtint text-brandfg' : 'border-line text-mutedfg hover:bg-muted hover:text-ink'}`}
            >
              <Icon name="bell" size={19} />
              {notifUnread > 0 && (
                <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-1 text-[10px] font-bold leading-none text-white shadow-glow">
                  {notifUnread > 9 ? '9+' : notifUnread}
                </span>
              )}
            </button>
            <span role="status" aria-atomic="true" className="sr-only">{notifUnread > 0 ? `${notifUnread} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}</span>

            {/* Buka modal "Akun saya" */}
            <button type="button" id="account-trigger" onClick={onOpenAccount} aria-label={`Pengaturan akun (sekarang ${user.name})`} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-1.5 text-sm transition-colors hover:bg-muted sm:px-3">
              <Avatar user={user} className="h-8 w-8 rounded-lg bg-brandtint text-xs font-bold text-brandfg" />
              <span className="hidden max-w-[7rem] truncate text-mutedfg sm:inline">{user.name}</span>
            </button>
          </div>

          {/* Panel notifikasi: menempel di bawah header */}
          {openKey === 'notif' && (
            <div ref={notifMenuRef} className="absolute right-4 top-full z-50 mt-2 sm:right-6">
              <NotificationMenu items={notifications} readIds={notifReadIds} closing={closingKey === 'notif'} onSelect={handleNotification} onMarkAll={onMarkAllNotificationsRead} />
            </div>
          )}
        </div>
      </header>

      {/* Bottom navbar - tanpa dropdown, semua tombol buka langsung halamannya */}
      <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 rounded-t-[26px] border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-xl lg:hidden">
        <ul className="relative mx-auto flex h-[68px] max-w-md items-stretch px-2 lg:max-w-6xl">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const isDashboard = item.id === 'dashboard';
            const active = activeSection === item.id;
            const navItem = NAV_ITEMS.find((n) => n.id === item.id);
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-full w-full flex-col items-center gap-0.5 rounded-xl px-0.5 text-[11px] font-medium leading-tight transition-colors ${isDashboard ? 'justify-end pb-2.5' : 'justify-center'} ${isDashboard ? (active ? 'text-brandfg' : 'text-mutedfg') : active ? 'text-brandfg' : 'text-mutedfg hover:text-ink'}`}
                >
                  {isDashboard ? (
                    <span
                      aria-hidden="true"
                      className={`group absolute left-1/2 top-0 grid h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cta shadow-e2 ring-4 ring-canvas transition duration-slow ease-spring active:scale-[0.92] active:bg-ctahover active:shadow-e2 active:duration-fast active:ease-crisp ${active ? 'shadow-glow ring-brand/40' : ''}`}
                    >
                      <img
                        src="/icons/icon-mark-square.png"
                        alt=""
                        className="h-auto w-11 object-contain drop-shadow-md transition-transform duration-base ease-crisp group-hover:-translate-y-0.5 group-hover:scale-110"
                      />
                    </span>
                  ) : (
                    <span
                      className={`grid h-8 w-11 shrink-0 place-items-center rounded-full transition duration-slow ease-spring hover:-translate-y-[1px] hover:opacity-90 active:-translate-y-[3px] active:scale-[1.08] active:shadow-glow active:duration-fast active:ease-crisp ${active ? 'bg-brandtint' : ''}`}
                    >
                      <Icon name={navItem?.icon} size={19} />
                    </span>
                  )}
                  <span className="flex w-full items-center justify-center gap-0.5">
                    <span className="truncate">{navItem?.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}