import React, { useMemo } from 'react';
import { Icon } from './Icon';
import { Badge, PendingRow } from './ui';
import { getCategoryMeta, FINANCE_CATEGORIES } from './categories';

/* Riwayat transaksi bergaya Timeline: rel vertikal + titik per hari +
   cabang penghubung ke tiap item (ikon kategori + deskripsi + nominal).
   Dipakai untuk pengeluaran & pemasukan, menggantikan daftar kartu datar.
   ItemPending tidak bisa diedit (openEdit yang menolak), baris jadi nonaktif. */
const pad2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const parseISO = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
};
const addDaysISO = (iso, days) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return isoOf(d);
};
const longDate = (iso) =>
  parseISO(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
const relativeDay = (iso, today) => {
  if (iso === today) return 'Hari Ini';
  if (iso === addDaysISO(today, 1)) return 'Besok';
  if (iso === addDaysISO(today, -1)) return 'Kemarin';
  return '';
};

export function HistoryTimeline({
  items = [],
  formatCurrency,
  onEdit,
  readOnly = false,
  tone = 'brand',
  categories = FINANCE_CATEGORIES,
  amountPrefix = '',
  onRetry,
  onDiscard,
}) {
  const today = todayISO();
  const tileCls = tone === 'success'
    ? 'border-success/25 bg-success/15 text-success'
    : 'border-brand/20 bg-brandtint text-brandfg';
  const amountCls = tone === 'success' ? 'text-success' : 'text-brandfg';

  // Kelompokkan per tanggal; urutan input dipertahankan (terbaru dulu).
  const days = useMemo(() => {
    const map = new Map();
    (items || [])
      .filter((it) => it && it.date)
      .forEach((it) => {
        if (!map.has(it.date)) map.set(it.date, []);
        map.get(it.date).push(it);
      });
    return [...map.entries()]
      .sort(([a], [b]) => (a > b ? -1 : a < b ? 1 : 0))
      .map(([date, rows]) => ({
        date,
        rows,
        total: rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      }));
  }, [items]);

  return (
    <ol className="stagger" aria-label={tone === 'success' ? 'Riwayat pemasukan' : 'Riwayat pengeluaran'}>
      {days.map((day) => {
        const isToday = day.date === today;
        const rel = relativeDay(day.date, today);
        return (
          <li key={day.date} className="relative border-l border-line pb-6 pl-6 last:border-transparent last:pb-1">
            <span
              className={`absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                isToday ? 'border-brand bg-brand ring-4 ring-brand/15' : 'border-line bg-canvas'
              }`}
              aria-hidden="true"
            />

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="text-sm font-bold text-ink">{longDate(day.date)}</h2>
              {rel && <Badge tone={isToday ? 'brand' : 'gray'}>{rel}</Badge>}
              <span className="ml-auto font-mono text-[11px] text-mutedfg">
                {day.rows.length} item · {amountPrefix}{formatCurrency(day.total)}
              </span>
            </div>

            <ul className="mt-2 space-y-1.5">
              {day.rows.map((item) => {
                const meta = getCategoryMeta(categories, item.category);
                const judul = item.description || meta?.label || (tone === 'success' ? 'Pemasukan' : 'Pengeluaran');
                const Tag = readOnly ? 'div' : 'button';
                return (
                  <li key={item.id} className="relative">
                    {/* cabang penghubung item → rel (dekoratif) */}
                    <span aria-hidden="true" className="absolute -left-6 top-1/2 h-px w-6 bg-line" />
                    <Tag
                      {...(readOnly ? {} : { type: 'button', onClick: () => onEdit?.(item) })}
                      aria-label={readOnly ? undefined : `Ubah ${judul}`}
                      className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 text-left transition-[background-color,border-color] duration-fast ease-crisp ${
                        readOnly ? '' : 'hover:border-brand/40 hover:bg-muted'
                      }`}
                    >
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${tileCls}`} aria-hidden="true">
                        <Icon name={meta?.icon || 'wallet'} size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{judul}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-mutedfg">
                          {meta?.label || item.category}
                          {item.pending ? ' · Menunggu sinkron' : ''}
                        </span>
                      </span>
                      <span className={`shrink-0 pt-0.5 font-mono text-xs font-bold ${amountCls}`}>
                        {amountPrefix}{formatCurrency(item.amount)}
                      </span>
                    </Tag>
                    {item.pending && (
                      <div className="mt-1.5">
                        <PendingRow item={item} onRetry={onRetry} onDiscard={onDiscard} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

export default HistoryTimeline;
