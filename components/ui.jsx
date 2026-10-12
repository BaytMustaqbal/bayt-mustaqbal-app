import React from 'react';
import { Icon } from './Icon';

/* Kartu dasar (flat: border, tanpa shadow).
   `min-w-0` penting agar kartu bisa menyusut di dalam grid/flex tanpa meluber. */
export function Card({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`min-w-0 rounded-2xl border border-line bg-surface ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/* Header tiap section: ikon + judul (h1) + aksi opsional */
export function SectionHeader({ icon, title, subtitle, actionLabel, onAction, actionTone = 'brand' }) {
  const tones = {
    brand: 'hover:bg-brandtint hover:text-branddark',
    accent: 'hover:bg-orange-50 hover:text-accent',
  };
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brandtint text-branddark sm:h-10 sm:w-10" aria-hidden="true">
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
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-branddark transition-colors ${tones[actionTone]}`}
        >
          <Icon name="plus" size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* Kartu statistik dashboard */
export function StatCard({ icon, label, value, hint, valueTitle, tone = 'teal', className = '' }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    orange: 'bg-orange-50 text-orange-700',
  };
  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <span className={`grid h-10 w-10 place-items-center rounded-xl sm:h-11 sm:w-11 ${tones[tone]}`} aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <p
        className="mt-3 break-words text-base font-bold tracking-tight text-ink tabular-nums sm:mt-4 sm:text-2xl"
        title={valueTitle}
      >
        {value}
      </p>
      <p className="text-xs font-medium text-ink sm:text-sm">{label}</p>
      {hint && <p className="truncate text-[11px] text-mutedfg sm:text-xs">{hint}</p>}
    </Card>
  );
}

/* Empty state dengan ikon + pesan */
export function EmptyState({ icon = 'inbox', title, message }) {
  return (
    <Card className="flex flex-col items-center justify-center px-5 py-10 text-center sm:px-6 sm:py-14">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brandtint text-branddark sm:h-14 sm:w-14" aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-mutedfg">{message}</p>
    </Card>
  );
}

/* Kartu pengeluaran */
export function ExpenseCard({ item, formatCurrency }) {
  return (
    <Card className="p-4 transition-colors hover:border-brand sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{item.category}</p>
          <p className="mt-0.5 truncate text-sm text-mutedfg">{item.description}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-mutedfg">
            <Icon name="clock" size={13} />
            {item.date}
          </p>
        </div>
        <p className="shrink-0 text-right text-sm font-bold text-branddark tabular-nums sm:text-base">
          {formatCurrency(item.amount)}
        </p>
      </div>
    </Card>
  );
}

/* Badge kecil */
export function Badge({ children, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brandtint text-branddark',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-muted text-mutedfg',
    red: 'bg-rose-50 text-rose-700',
  };
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
