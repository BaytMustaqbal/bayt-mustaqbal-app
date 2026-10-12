import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';
import { AGENDA_CATEGORIES, FINANCE_CATEGORIES, FAMILY_CATEGORIES, countByCategory } from './categories';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'expenses', label: 'Keuangan', icon: 'wallet' },
  { id: 'family', label: 'Keluarga', icon: 'users' },
  { id: 'tasks', label: 'Tugas', icon: 'tasks' },
];

// Tab yang membuka dropdown kategori + sumber jumlah itemnya.
const DROPDOWNS = {
  agenda: { items: AGENDA_CATEGORIES, ariaLabel: 'Kategori agenda' },
  expenses: { items: FINANCE_CATEGORIES, ariaLabel: 'Kategori pengeluaran' },
  family: { items: FAMILY_CATEGORIES, ariaLabel: 'Bagian keluarga' },
};

/* Panel dropdown kategori (dipakai 2x per tab: bawah HP + atas desktop).
   Animasi slide-up + fade berundak via App.css; exit lebih cepat dari enter. */
function CategoryMenu({ items, data, activeId, closing, menuId, onSelect, ariaLabel }) {
  return (
    <div
      id={menuId}
      role="menu"
      aria-label={ariaLabel}
      data-drop-menu
      className={`drop-menu w-64 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-glow backdrop-blur-xl ${
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
            <span className="shrink-0 font-mono text-xs opacity-80">{countByCategory(data, cat.id)}</span>
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
  expenses,
  family,
  agendaFilter,
  onAgendaSelect,
  financeFilter,
  onFinanceSelect,
  familyFilter,
  onFamilySelect,
}) {
  // Hanya satu dropdown terbuka pada satu waktu (openKey = 'agenda' | 'expenses' | null)
  const [openKey, setOpenKey] = useState(null);
  const [closingKey, setClosingKey] = useState(null);
  const closeTimerRef = useRef(null);
  const lastTriggerRef = useRef(null);
  const desktopMenuRef = useRef(null);

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

  // Fokus item pertama saat menu dibuka di desktop (bagi pengguna keyboard)
  useEffect(() => {
    if (openKey && window.matchMedia('(min-width: 1024px)').matches) {
      const first = desktopMenuRef.current?.querySelector('[role="menuitemradio"]');
      first?.focus();
    }
  }, [openKey]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const handleDropdownSelect = (key, categoryId) => {
    closeMenu();
    if (key === 'agenda') onAgendaSelect(categoryId);
    else if (key === 'expenses') onFinanceSelect(categoryId);
    else onFamilySelect(categoryId);
  };

  const handleSection = (id) => {
    if (DROPDOWNS[id]) return; // tab dropdown ditangani trigger-nya sendiri
    closeMenu();
    onSectionChange(id);
  };

  const dropdownData = { agenda: schedule, expenses, family };
  const activeFilter = (key) =>
    key === 'agenda' ? agendaFilter : key === 'expenses' ? financeFilter : familyFilter;

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
            const isDropdown = !!DROPDOWNS[item.id];
            const active = activeSection === item.id || (isDropdown && openKey === item.id);
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={isDropdown ? (e) => toggleMenu(item.id, e) : () => handleSection(item.id)}
                  aria-haspopup={isDropdown ? 'menu' : undefined}
                  aria-expanded={isDropdown ? openKey === item.id : undefined}
                  aria-controls={isDropdown ? `${item.id}-menu-mobile` : undefined}
                  data-dropdown-trigger={isDropdown ? '' : undefined}
                  aria-current={active && openKey !== item.id ? 'page' : undefined}
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
                    {isDropdown && (
                      <Icon
                        name="chevronDown"
                        size={12}
                        className={`shrink-0 transition-transform duration-200 ${openKey === item.id ? 'rotate-180' : ''}`}
                      />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Menu kategori aktif: menggantung di atas tab bar (hanya satu terbuka) */}
        {openKey && (
          <div className="absolute bottom-full left-1/2 mb-3 -translate-x-1/2 lg:hidden">
            <CategoryMenu
              items={DROPDOWNS[openKey].items}
              data={dropdownData[openKey]}
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