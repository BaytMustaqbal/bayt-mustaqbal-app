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
  { id: 'family', label: 'Keluarga', icon: 'users' },
  { id: 'notes', label: 'Catatan', icon: 'note' },
];

// Tab yang membuka dropdown kategori + sumber jumlah itemnya.
const DROPDOWNS = {
  agenda: { items: AGENDA_CATEGORIES, ariaLabel: 'Kategori agenda' },
  expenses: { items: FINANCE_CATEGORIES, ariaLabel: 'Kategori pengeluaran' },
  family: { items: FAMILY_CATEGORIES, ariaLabel: 'Bagian keluarga' },
  notes: { items: NOTES_FILTERS, ariaLabel: 'Filter catatan' },
};

/* Panel dropdown kategori (dipakai 2x per tab: bawah HP + atas desktop).
   Animasi slide-up + fade berundak via App.css; exit lebih cepat dari enter. */
function CategoryMenu({ items, data, activeId, closing, menuId, onSelect, ariaLabel, count = countByCategory }) {
  return (
    <div
      id={menuId}
      role="menu"
      aria-label={ariaLabel}
      data-drop-menu
      className={`drop-menu w-64 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-pop backdrop-blur-xl ${
        closing ? 'drop-menu--closing' : ''
      }`}
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
            className={`drop-menu__item flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors ${
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
            <span className="shrink-0 font-mono text-xs opacity-80">{count(data, cat.id)}</span>
            {active && <Icon name="check" size={15} className="shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

/* Warna tile ikon notifikasi — sama dengan peta tone di ui.jsx (StatCard). */
const NOTIF_TONES = {
  rose: 'bg-tonerose/15 text-tonerosefg',
  amber: 'bg-toneamber/15 text-toneamberfg',
  violet: 'bg-toneviolet/15 text-tonevioletfg',
  blue: 'bg-toneblue/15 text-tonebluefg',
  cyan: 'bg-tonecyan/15 text-tonecyanfg',
};

/* Panel notifikasi (lonceng pojok kanan atas). Isinya turunan data —
   lihat components/notifications.js. Animasi memakai pola menu kategori;
   item yang belum dibaca tampil penuh + titik cyan, yang sudah dibaca redup.
   Sengaja TANPA role="menu": isinya bukan pilihan radio, tapi daftar tautan
   aksi — cukup dijangkau Tab dari tombol lonceng. */
function NotificationMenu({ items, readIds, closing, onSelect, onMarkAll }) {
  const unreadCount = items.filter((n) => !readIds.includes(n.id)).length;

  return (
    <div
      id="notif-menu"
      aria-label="Notifikasi"
      data-drop-menu
      className={`drop-menu drop-menu--right w-80 max-w-[calc(100vw_-_2rem)] overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-pop backdrop-blur-xl ${
        closing ? 'drop-menu--closing' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <p className="text-sm font-bold text-ink">Notifikasi</p>
        <span className="shrink-0 font-mono text-xs text-mutedfg">
          {unreadCount > 0 ? `${unreadCount} baru` : 'semua terbaca'}
        </span>
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
                  className={`drop-menu__item flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-muted ${
                    unread ? '' : 'opacity-70'
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      NOTIF_TONES[item.tone] || NOTIF_TONES.cyan
                    }`}
                    aria-hidden="true"
                  >
                    <Icon name={item.icon} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-ink">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-mutedfg">{item.message}</span>
                  </span>
                  {unread && (
                    <span
                      className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-brand shadow-glow"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {unreadCount > 0 && (
        <div className="border-t border-line p-1.5">
          <button
            type="button"
            onClick={onMarkAll}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-brandfg transition-colors hover:bg-brandtint"
          >
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
}) {
  // Hanya satu dropdown terbuka pada satu waktu (openKey = 'agenda' | 'expenses' | null)
  const [openKey, setOpenKey] = useState(null);
  const [closingKey, setClosingKey] = useState(null);
  const closeTimerRef = useRef(null);
  const lastTriggerRef = useRef(null);
  const desktopMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

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

  // Tutup saat: klik/ketuk di luar menu & trigger, atau tekan Escape
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

  // Fokus item pertama saat menu dibuka di desktop (bagi pengguna keyboard).
  // Panel notifikasi ikut pola ini supaya Enter → Tab/panah langsung terasa.
  useEffect(() => {
    if (!openKey) return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    if (openKey === 'notif') notifMenuRef.current?.querySelector('[data-notif-item]')?.focus();
    else desktopMenuRef.current?.querySelector('[role="menuitemradio"]')?.focus();
  }, [openKey]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // Kepala naik elevasi begitu konten mulai bergulir di bawahnya
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Indeks tab yang sedang "menyala". Hanya dropdown kategori yang dihitung
  // sebagai aktif; panel notifikasi (openKey='notif') tidak menggeser indikator.
  const activeId = openKey && DROPDOWNS[openKey] ? openKey : activeSection;

  // Jumlah notifikasi yang belum dibaca (untuk badge + label pembaca layar).
  const notifUnread = notifications.filter((n) => !notifReadIds.includes(n.id)).length;

  // Klik item notifikasi → tutup panel, App yang mengurus navigasi + tandai baca.
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

  const handleSection = (id) => {
    if (DROPDOWNS[id]) return; // tab dropdown ditangani trigger-nya sendiri
    closeMenu();
    onSectionChange(id);
  };

  const dropdownData = { agenda: schedule, expenses, family, notes };
  const dropdownCount = { agenda: countByCategory, expenses: countByCategory, family: countByCategory, notes: countByNoteFilter };
  const activeFilter = (key) =>
    key === 'agenda'
      ? agendaFilter
      : key === 'expenses'
        ? financeFilter
        : key === 'family'
          ? familyFilter
          : noteFilter;

  return (
    <>
      {/* Bar atas (sticky, bukan fixed → tidak goyang saat address bar HP menyusut) */}
      <header
        className={`sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-base ease-crisp ${
          scrolled ? 'border-line bg-canvas/90 shadow-e2' : 'border-transparent bg-canvas/80'
        }`}
      >
        <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => handleSection('dashboard')}
            className="flex min-w-0 items-center gap-2.5 rounded-xl p-1 text-left transition-colors hover:bg-muted"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-brand/25 bg-brandtint p-1 shadow-glow sm:h-10 sm:w-10"
              aria-hidden="true"
            >
              <img src="/brand/logo.png" alt="" className="h-full w-full object-contain" />
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
                const isDropdown = !!DROPDOWNS[item.id];
                const active = activeSection === item.id || (isDropdown && openKey === item.id);
                return (
                  <li key={item.id} className={isDropdown ? 'relative' : ''}>
                    <button
                      type="button"
                      onClick={isDropdown ? (e) => toggleMenu(item.id, e) : () => handleSection(item.id)}
                      aria-haspopup={isDropdown ? 'menu' : undefined}
                      aria-expanded={isDropdown ? openKey === item.id : undefined}
                      aria-controls={isDropdown ? `${item.id}-menu-desktop` : undefined}
                      data-dropdown-trigger={isDropdown ? '' : undefined}
                      aria-current={active && openKey !== item.id ? 'page' : undefined}
                      className={`flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                        active
                          ? 'border-brand/25 bg-brandtint text-brandfg'
                          : 'border-transparent text-mutedfg hover:bg-muted hover:text-ink'
                      }`}
                    >
                      <Icon name={item.icon} size={18} />
                      {item.label}
                      {isDropdown && (
                        <Icon
                          name="chevronDown"
                          size={14}
                          className={`transition-transform duration-200 ${openKey === item.id ? 'rotate-180' : ''}`}
                        />
                      )}
                    </button>

                    {isDropdown && openKey === item.id && (
                      <div
                        ref={desktopMenuRef}
                        className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2"
                      >
                        <CategoryMenu
                          items={DROPDOWNS[item.id].items}
                          data={dropdownData[item.id]}
                          count={dropdownCount[item.id]}
                          activeId={activeFilter(item.id)}
                          closing={closingKey === item.id}
                          menuId={`${item.id}-menu-desktop`}
                          onSelect={(cat) => handleDropdownSelect(item.id, cat)}
                          ariaLabel={DROPDOWNS[item.id].ariaLabel}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {/* Notifikasi (lonceng) — panel dibuka di bawah header, rata kanan.
                Badge TIDAK dibacakan sebagai angka telanjang: hitungannya
                masuk ke aria-label tombol + live region di bawah. */}
            <button
              type="button"
              onClick={(e) => toggleMenu('notif', e)}
              aria-expanded={openKey === 'notif'}
              aria-controls="notif-menu"
              aria-label={notifUnread > 0 ? `Notifikasi, ${notifUnread} belum dibaca` : 'Notifikasi'}
              data-dropdown-trigger=""
              className={`relative grid h-11 w-11 place-items-center rounded-full border transition-colors ${
                openKey === 'notif'
                  ? 'border-brand/30 bg-brandtint text-brandfg'
                  : 'border-line text-mutedfg hover:bg-muted hover:text-ink'
              }`}
            >
              <Icon name="bell" size={19} />
              {notifUnread > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-1 text-[10px] font-bold leading-none text-white shadow-glow"
                >
                  {notifUnread > 9 ? '9+' : notifUnread}
                </span>
              )}
            </button>
            <span role="status" aria-atomic="true" className="sr-only">
              {notifUnread > 0 ? `${notifUnread} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
            </span>

            {/* Buka modal "Akun saya" (nama, username, avatar, password) */}
            <button
              type="button"
              id="account-trigger"
              onClick={onOpenAccount}
              aria-label={`Pengaturan akun (sekarang ${user.name})`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-1.5 text-sm transition-colors hover:bg-muted sm:px-3"
            >
              <Avatar user={user} className="h-8 w-8 rounded-lg bg-brandtint text-xs font-bold text-brandfg" />
              <span className="hidden max-w-[7rem] truncate text-mutedfg sm:inline">{user.name}</span>
            </button>
          </div>

          {/* Panel notifikasi: menempel di bawah header, rata kanan konten
              (anchor-nya baris header, bukan tombol — supaya di layar 320px
              panel tidak menjulur keluar tepi kiri). */}
          {openKey === 'notif' && (
            <div ref={notifMenuRef} className="absolute right-4 top-full z-50 mt-2 sm:right-6">
              <NotificationMenu
                items={notifications}
                readIds={notifReadIds}
                closing={closingKey === 'notif'}
                onSelect={handleNotification}
                onMarkAll={onMarkAllNotificationsRead}
              />
            </div>
          )}
        </div>
      </header>

      {/* Bar bawah: mobile & tablet (dirapikan max-w-md agar tidak melar) */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/85 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-xl lg:hidden"
      >
        {/* Tinggi dikunci 56px agar banner install bisa diposisikan tepat di atasnya */}
        <ul className="relative mx-auto flex h-[68px] max-w-md items-stretch px-2 lg:max-w-6xl">
          {/* Kiri: Agenda + Keuangan */}
          {NAV_ITEMS.filter((i) => i.id === 'agenda' || i.id === 'expenses').map((item) => {
            const active = activeSection === item.id || openKey === item.id;
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={(e) => toggleMenu(item.id, e)}
                  aria-haspopup="menu"
                  aria-expanded={active}
                  aria-controls={`${item.id}-menu-mobile`}
                  data-dropdown-trigger=""
                  aria-current={active && openKey !== item.id ? 'page' : undefined}
                  className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[11px] font-medium leading-tight transition-colors ${active ? 'text-brandfg' : 'text-mutedfg'}`}
                >
                  <span className={`grid h-7 w-11 shrink-0 place-items-center rounded-full transition-colors duration-base ease-crisp ${active ? 'bg-brandtint' : ''}`}>
                    <Icon name={item.icon} size={19} />
                  </span>
                  <span className="flex w-full items-center justify-center gap-0.5">
                    <span className="truncate">{item.label}</span>
                    <Icon
                      name="chevronDown"
                      size={12}
                      className={`shrink-0 transition-transform duration-200 ${openKey === item.id ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>
              </li>
            );
          })}

          {/* Tengah: Dashboard FAB (menonjol + collar notch) */}
          <li className="relative w-20 shrink-0">
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 h-8 w-20 -translate-x-1/2 rounded-t-[2rem] bg-canvas"
            />
            <button
              type="button"
              onClick={() => handleSection('dashboard')}
              aria-current={activeSection === 'dashboard' ? 'page' : undefined}
              className={`absolute left-1/2 -top-4 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white shadow-glow ring-4 ring-canvas transition-transform active:scale-95 ${activeSection === 'dashboard' ? 'outline outline-2 outline-offset-2 outline-brand/60' : ''}`}
            >
              <Icon name="home" size={24} />
              <span className="sr-only">Dashboard</span>
            </button>
            <span
              className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold ${activeSection === 'dashboard' ? 'text-brandfg' : 'text-mutedfg'}`}
            >
              Dashboard
            </span>
          </li>

          {/* Kanan: Keluarga + Catatan */}
          {NAV_ITEMS.filter((i) => i.id === 'family' || i.id === 'notes').map((item) => {
            const active = activeSection === item.id || openKey === item.id;
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={(e) => toggleMenu(item.id, e)}
                  aria-haspopup="menu"
                  aria-expanded={active}
                  aria-controls={`${item.id}-menu-mobile`}
                  data-dropdown-trigger=""
                  aria-current={active && openKey !== item.id ? 'page' : undefined}
                  className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[11px] font-medium leading-tight transition-colors ${active ? 'text-brandfg' : 'text-mutedfg'}`}
                >
                  <span className={`grid h-7 w-11 shrink-0 place-items-center rounded-full transition-colors duration-base ease-crisp ${active ? 'bg-brandtint' : ''}`}>
                    <Icon name={item.icon} size={19} />
                  </span>
                  <span className="flex w-full items-center justify-center gap-0.5">
                    <span className="truncate">{item.label}</span>
                    <Icon
                      name="chevronDown"
                      size={12}
                      className={`shrink-0 transition-transform duration-200 ${openKey === item.id ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Menu kategori aktif: menggantung di atas tab bar (hanya satu terbuka).
            Panel notifikasi tidak di sini — ia menempel di header. */}
        {DROPDOWNS[openKey] && (
          <div className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 lg:hidden">
            <CategoryMenu
              items={DROPDOWNS[openKey].items}
              data={dropdownData[openKey]}
              count={dropdownCount[openKey]}
              activeId={activeFilter(openKey)}
              closing={closingKey === openKey}
              menuId={`${openKey}-menu-mobile`}
              onSelect={(cat) => handleDropdownSelect(openKey, cat)}
              ariaLabel={DROPDOWNS[openKey].ariaLabel}
            />
          </div>
        )}
      </nav>
    </>
  );
}