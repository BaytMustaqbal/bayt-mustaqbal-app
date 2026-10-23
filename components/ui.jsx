import React from 'react';
import { Icon } from './Icon';
import { Sparkline } from './charts';
import { FINANCE_CATEGORIES, INCOME_CATEGORIES, getCategoryMeta } from './categories';

/* Tombol utama (CTA) — gradasi cobalt dengan teks putih (kontras 5,2:1).
   Ditulis sekali di sini supaya semua tombol utama konsisten. */
export const CTA_CLASS =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-5 text-sm font-semibold text-white shadow-glow transition-transform duration-fast ease-crisp hover:from-[#1E40AF] hover:to-[#1D4ED8] active:scale-[0.98] disabled:opacity-50';

/* Kartu data yang interaktif (agenda/pengeluaran/tugas/catatan/keluarga):
   saat hover → elevasi naik (e1→e2) + kartu terangkat 2px.
   `transform` tidak menggeser layout tetangga, jadi grid tetap stabil.
   Warna border hover tetap diatur masing-masing kartu. */
export const CARD_INTERACTIVE =
  'transition-[color,background-color,border-color,box-shadow,transform] duration-base ease-crisp hover:shadow-e2 hover:-translate-y-0.5';

/* Inisial dari nama akun: 2 kata → huruf awal kata pertama & terakhir ("Rezki YT" → "RY"),
   1 kata → 2 huruf pertama ("Hilda" → "HI"). Dipakai sebagai cadangan saat belum ada foto. */
export const initialsOf = (name) => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/* Avatar akun: foto (kalau ada) atau inisial. Ukuran, radius, dan warna
   diatur lewat `className` supaya chip header, kartu gerbang, dan modal akun
   bisa memakai komponen yang sama. Dekoratif → selalu `aria-hidden`
   (nama pengguna sudah dibacakan oleh teks di sebelahnya). */
export function Avatar({ user, className = '' }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden ${className}`} aria-hidden="true">
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        user?.initials || initialsOf(user?.name)
      )}
    </span>
  );
}

/* Kartu dasar — permukaan navy + elevasi e1 (garis cahaya atas + bayangan tipis).
   Sengaja TANPA blur: kartu muncul sangat banyak, backdrop-filter yang
   berulang bikin HP kelas bawah tersendat. Blur hanya di elemen kunci. */
export function Card({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`min-w-0 rounded-2xl border border-line bg-surface shadow-e1 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/* Kartu kaca (glassmorphism) — dipakai hemat: kartu hero, panel menonjol.
   Memakai `shadow-pop` (halo cyan tipis + bayangan navy) agar terasa melayang.
   Ada fallback ke kartu solid lewat @supports di App.css. */
export function GlassCard({ className = '', children, ...rest }) {
  return (
    <div className={`glass min-w-0 overflow-hidden rounded-2xl shadow-pop ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* Header tiap section: ikon + judul (h1) + aksi opsional */
export function SectionHeader({ icon, title, subtitle, actionLabel, onAction, actionTone = 'brand' }) {
  const tones = {
    brand: 'hover:bg-brandtint hover:text-brandfg',
    accent: 'hover:bg-toneamber/15 hover:text-toneamberfg',
  };
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brandtint text-brandfg sm:h-10 sm:w-10" aria-hidden="true">
          <Icon name={icon} size={19} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">{title}</h1>
          {subtitle && <p className="truncate text-xs text-mutedfg sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-brandfg transition-colors ${tones[actionTone]}`}
        >
          <Icon name="plus" size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* Kartu statistik (KPI). `spark` = deret angka untuk grafik mini. */
export function StatCard({ icon, label, value, hint, valueTitle, tone = 'cyan', spark, className = '' }) {
  const tones = {
    cyan: 'bg-tonecyan/15 text-tonecyanfg',
    blue: 'bg-toneblue/15 text-tonebluefg',
    violet: 'bg-toneviolet/15 text-tonevioletfg',
    emerald: 'bg-toneemerald/15 text-toneemeraldfg',
    amber: 'bg-toneamber/15 text-toneamberfg',
    rose: 'bg-tonerose/15 text-tonerosefg',
  };
  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 ${tones[tone]}`} aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>
        {spark && (
          <span className="hidden shrink-0 opacity-80 sm:block" aria-hidden="true">
            <Sparkline data={spark} />
          </span>
        )}
      </div>
      <p
        className="mt-3 break-words font-mono text-base font-bold tracking-tight text-ink sm:mt-4 sm:text-2xl"
        title={valueTitle}
      >
        {value}
      </p>
      <p className="text-xs font-medium text-ink sm:text-sm">{label}</p>
      {hint && <p className="truncate text-[11px] text-mutedfg sm:text-xs">{hint}</p>}
    </Card>
  );
}

/* Batang progres (mis. realisasi anggaran). */
export function ProgressBar({ value, max, className = '' }) {
  const pct = Math.min(100, Math.round(((Number(value) || 0) / (Number(max) || 1)) * 100));
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-cta to-brand transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* Ikon aksi cepat di dashboard (kotak sentuh ≥ 76px). */
export function QuickAction({ icon, label, onClick, tone = 'cyan' }) {
  const tones = {
    cyan: 'bg-tonecyan/15 text-tonecyanfg',
    blue: 'bg-toneblue/15 text-tonebluefg',
    violet: 'bg-toneviolet/15 text-tonevioletfg',
    emerald: 'bg-toneemerald/15 text-toneemeraldfg',
    amber: 'bg-toneamber/15 text-toneamberfg',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-2.5 text-center shadow-e1 transition-[color,background-color,border-color,box-shadow,transform] duration-base ease-crisp hover:-translate-y-0.5 hover:border-brand/50 hover:bg-muted hover:shadow-e2`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-transform duration-base ease-crisp group-hover:scale-105 ${tones[tone]}`}
        aria-hidden="true"
      >
        <Icon name={icon} size={19} />
      </span>
      <span className="text-[11px] font-medium leading-tight text-ink sm:text-xs">{label}</span>
    </button>
  );
}

/* Empty state dengan ikon + pesan */
export function EmptyState({ icon = 'inbox', title, message }) {
  return (
    <Card className="flex flex-col items-center justify-center px-5 py-10 text-center sm:px-6 sm:py-14">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-brand/20 bg-brandtint text-brandfg sm:h-14 sm:w-14" aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-mutedfg">{message}</p>
    </Card>
  );
}

/* Tombol aksi per kartu data (edit + hapus). Dua kotak sentuh 44px agar
   nyaman di jari; dipakai seragam oleh kartu agenda, pengeluaran, tugas,
   dan catatan supaya pola "ubah/buang" konsisten. */
export function ItemActions({ onEdit, onDelete, label = 'item', readOnly = false }) {
  // Peran baca-saja (anak/cucu): aksi disembunyikan, kartu jadi informatif.
  if (readOnly) return null;
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Ubah ${label}`}
        className="grid h-11 w-11 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink"
      >
        <Icon name="edit" size={17} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Hapus ${label}`}
        className="grid h-11 w-11 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-tonerose/15 hover:text-tonerosefg"
      >
        <Icon name="trash" size={17} />
      </button>
    </div>
  );
}

/* Kartu pengeluaran (tile ikon mengikuti kategori) */
export function ExpenseCard({ item, formatCurrency, onEdit, onDelete, readOnly = false }) {
  const meta = getCategoryMeta(FINANCE_CATEGORIES, item.category);
  return (
    <Card className={`flex h-full flex-col p-4 ${CARD_INTERACTIVE} hover:border-brand/50 sm:p-5`}>
      <div className="flex items-start justify-between gap-3 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
            <Icon name={meta?.icon || 'wallet'} size={19} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{meta?.label || item.category}</p>
            <p className="mt-0.5 truncate text-sm text-mutedfg">{item.description}</p>
          </div>
        </div>
        <p className="shrink-0 pt-0.5 text-right font-mono text-sm font-bold text-brandfg sm:text-base">
          {formatCurrency(item.amount)}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-mutedfg">
          <Icon name="clock" size={13} />
          {item.date}
        </span>
        <ItemActions label={item.description} onEdit={() => onEdit?.(item)} onDelete={() => onDelete?.(item)} readOnly={readOnly} />
      </div>
    </Card>
  );
}

/* Kartu pemasukan — kembaran ExpenseCard dengan nuansa hijau (emas/positif)
   supaya tidak tertukar dengan pengeluaran saat digulir. */
export function IncomeCard({ item, formatCurrency, onEdit, onDelete, readOnly = false }) {
  const meta = getCategoryMeta(INCOME_CATEGORIES, item.category);
  return (
    <Card className={`flex h-full flex-col p-4 ${CARD_INTERACTIVE} hover:border-success/50 sm:p-5`}>
      <div className="flex items-start justify-between gap-3 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-success/25 bg-success/15 text-success" aria-hidden="true">
            <Icon name={meta?.icon || 'wallet'} size={19} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{meta?.label || item.category}</p>
            <p className="mt-0.5 truncate text-sm text-mutedfg">{item.description}</p>
          </div>
        </div>
        <p className="shrink-0 pt-0.5 text-right font-mono text-sm font-bold text-success sm:text-base">
          +{formatCurrency(item.amount)}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-mutedfg">
          <Icon name="clock" size={13} />
          {item.date}
        </span>
        <ItemActions label={item.description} onEdit={() => onEdit?.(item)} onDelete={() => onDelete?.(item)} readOnly={readOnly} />
      </div>
    </Card>
  );
}

/* Badge kecil */
export function Badge({ children, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brandtint text-brandfg',
    green: 'bg-toneemerald/15 text-toneemeraldfg',
    amber: 'bg-toneamber/15 text-toneamberfg',
    gray: 'bg-muted text-mutedfg',
    red: 'bg-tonerose/15 text-tonerosefg',
  };
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* Daftar baris untuk sub-bagian keluarga (Info Medis / Kontak & Darurat / Dokumen) */
export function FamilyList({ title, icon, items, onAdd }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-mutedfg">
        <Icon name={icon} size={16} />
        {title}
        <span className="ml-auto font-mono text-xs font-normal opacity-70">{items.length}</span>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Tambah ${title.toLowerCase()}`}
            className="ml-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-line text-mutedfg opacity-50 transition-all hover:opacity-100 hover:text-ink"
          >
            <Icon name="plus" size={13} />
          </button>
        )}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface/60 px-4 py-6 text-center text-sm text-mutedfg">
          Belum ada catatan di bagian ini.
        </p>
      ) : (
        <ul className="stagger grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="flex items-start justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 truncate text-sm text-mutedfg">{item.meta}</p>
                </div>
                {item.badge && <Badge tone={item.tone || 'brand'}>{item.badge}</Badge>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
