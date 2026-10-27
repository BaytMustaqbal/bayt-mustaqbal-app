import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import {
  AGENDA_CATEGORIES,
  FINANCE_CATEGORIES,
  FAMILY_CATEGORIES,
  NOTES_FILTERS,
  countByCategory,
  countByNoteFilter,
} from './categories';

const TERJADWAL_ITEMS = [
  { id: 'pengeluaran-terjadwal', label: 'Pengeluaran Terjadwal', icon: 'receipt' },
  { id: 'target-tabungan', label: 'Target Tabungan', icon: 'piggyBank' },
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', dropdown: null },
  { id: 'agenda', label: 'Agenda', icon: 'calendar', dropdown: AGENDA_CATEGORIES },
  { id: 'expenses', label: 'Keuangan', icon: 'wallet', dropdown: FINANCE_CATEGORIES },
  { id: 'terjadwal', label: 'Tugas Terjadwal', icon: 'clock', dropdown: TERJADWAL_ITEMS },
  { id: 'family', label: 'Keluarga', icon: 'users', dropdown: FAMILY_CATEGORIES },
  { id: 'notes', label: 'Catatan', icon: 'note', dropdown: NOTES_FILTERS },
];

export function Sidebar({
  open,
  onClose,
  activeSection,
  onSectionChange,
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
  theme = 'dark',
}) {
  const sidebarRef = useRef(null);
  const [openKey, setOpenKey] = useState(null);

  // Tutup saat klik di luar
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (e.target.closest('[data-sidebar]')?.closest('[data-sidebar]')) return;
      onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, onClose]);

  const closeMenu = () => {
    setOpenKey(null);
  };

  const toggleMenu = (key) => {
    setOpenKey(openKey === key ? null : key);
  };

  const handleSection = (id) => {
    setOpenKey(null);
    onSectionChange(id);
    onClose();
  };

  const handleDropdownSelect = (key, itemId) => {
    if (key === 'terjadwal') {
      if (itemId === 'pengeluaran-terjadwal') onSectionChange('expenses');
      else if (itemId === 'target-tabungan') onSectionChange('tabungan');
    }
    closeMenu();
    if (key === 'agenda') onAgendaSelect(itemId);
    else if (key === 'expenses') onFinanceSelect(itemId);
    else if (key === 'family') onFamilySelect(itemId);
    else onNoteSelect(itemId);
    onClose();
  };

  const dropdownData = { agenda: schedule, expenses, terjadwal: [], family, notes };
  const dropdownCount = {
    agenda: countByCategory,
    expenses: countByCategory,
    terjadwal: () => 0,
    family: countByCategory,
    notes: countByNoteFilter,
  };
  const activeFilter = (key) =>
    key === 'agenda' ? agendaFilter : key === 'expenses' ? financeFilter : key === 'family' ? familyFilter : key === 'notes' ? noteFilter : null;

  return (
    <>
      {/* Overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-canvas/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        data-sidebar
        ref={sidebarRef}
        className={`fixed top-0 z-50 flex h-screen w-72 max-w-[90vw] flex-col overflow-y-auto border-r border-line bg-surface/95 shadow-nav backdrop-blur-xl transition-transform duration-300 ease-crisp lg:fixed lg:inset-y-auto lg:left-0 lg:top-0 lg:bottom-0 lg:translate-x-0 lg:z-50 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navigasi utama"
      >
        {/* Header sidebar */}
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/brand/logo.png" alt="" className="h-8 w-8 rounded-xl border border-brand/25 bg-brandtint p-1 shadow-glow" />
            <span className="text-sm font-bold text-ink">Bayt Mustaqbal</span>
          </div>
          {open && (
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-mutedfg hover:bg-muted hover:text-ink lg:hidden"
              aria-label="Tutup menu"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>

        {/* Menu items */}
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isDropdown = !!item.dropdown;
              const isActive = activeSection === item.id;
              const isOpen = isDropdown && openKey === item.id;

              return (
                <li key={item.id}>
                  <details open={isOpen} className="group">
                    {/* Trigger */}
                    <summary
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted [&_svg]:shrink-0 [&_svg]:opacity-70 [&_svg]:group-[open]/[.group>summary>_svg]:rotate-180 [&_svg]:transition-transform"
                      onClick={(e) => {
                        if (!isDropdown) {
                          handleSection(item.id);
                          e.preventDefault();
                        }
                      }}
                      style={{ listStyle: 'none' }}
                    >
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-lg ${isActive ? 'bg-brandtint text-brandfg' : 'bg-muted text-mutedfg'}`}
                        aria-hidden="true"
                      >
                        <Icon name={item.icon} size={16} />
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {isDropdown && <Icon name="chevronDown" size={14} />}
                      <span
                        className={`ml-auto round hidden group-data-[open]:inline-flex h-5 min-w-[1.25rem] place-items-center justify-center rounded-full text-[10px] font-bold ${countByCategory(dropdownData[item.id] || [], activeFilter(item.id) || item.id) > 9 ? 'bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white' : 'bg-brandtint text-brandfg'}`}
                      >
                        {countByCategory(dropdownData[item.id] || [], activeFilter(item.id) || item.id)}
                      </span>
                    </summary>

                    {/* Dropdown items */}
                    {isDropdown && (
                      <ul className="ml-7 mt-1 space-y-1 pl-4 border-l-2 border-line/30">
                        {item.dropdown.map((cat) => (
                          <li key={cat.id}>
                            <button
                              type="button"
                              onClick={() => handleDropdownSelect(item.id, cat.id)}
                              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-mutedfg transition-colors hover:bg-muted hover:text-ink"
                            >
                              <span className={`grid h-6 w-6 place-items-center rounded-lg ${activeFilter(item.id) === cat.id ? 'bg-brandtint text-brandfg' : 'bg-muted text-mutedfg'}`} aria-hidden="true">
                                <Icon name={cat.icon} size={14} />
                              </span>
                              <span className="truncate">{cat.label}</span>
                              <span className="ml-auto font-mono text-xs opacity-60">
                                {typeof dropdownCount[item.id] === 'function'
                                  ? dropdownCount[item.id](dropdownData[item.id], cat.id)
                                  : 0}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={() => (window.location.href = '/')}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-mutedfg transition-colors hover:bg-muted hover:text-ink"
          >
            <Icon name="logOut" size={14} />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}