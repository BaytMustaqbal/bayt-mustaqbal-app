import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { Badge } from './ui';

// ============================================================================
// Kalender keluarga — tampilan gabungan agenda semua anggota.
// View: Minggu / Bulan / Tahun (default Bulan). Warna per member + tugas.
// Aksesibilitas: role="grid" + aria-label deskriptif per sel, tombol ≥ 44px,
// warna hanya pelengkap — nama anggota selalu tampil (bukan warna saja).
// ============================================================================

// Warna per member — token tema (--member1..5), jadi versi gelap & terang
// sudah disiapkan di App.css dan titik tetap terbaca di latar putih.
const MEMBER_COLORS = {
  'Rezki YT': 'bg-member1',
  'Hilda AK': 'bg-member2',
  'RAGASUCI': 'bg-member3',
  'RAJABRANA': 'bg-member4',
  'Keluarga': 'bg-member5',
};

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']; // index 0 = Senin
const WEEKDAY_LONG = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// ---- Helper tanggal (semua lokal, tanpa UTC shift) -------------------------
const pad = (n) => String(n).padStart(2, '0');
const toDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => {
  const x = toDate(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeek = (d) => {
  const x = toDate(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Senin sebagai awal minggu
  return x;
};
const isSameDay = (a, b) => a && b && fmtKey(a) === fmtKey(b);
const formatLong = (d) =>
  `${WEEKDAY_LONG[(d.getDay() + 6) % 7]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

// Ambil warna member dengan fallback aman (member baru di luar daftar).
// Untuk events dengan category, gunakan color yang sudah diset.
const memberColor = (member, categoryColor) => {
  if (categoryColor) return categoryColor;
  return MEMBER_COLORS[member] || 'bg-brand';
};

// ============================================================================
export function FamilyCalendar({ items, tasks, events, onEventClick }) {
  const today = useMemo(() => toDate(new Date()), []);
  const [view, setView] = useState('month'); // 'week' | 'month' | 'year'
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState(today);

  // Indeks jadwal & tugas per tanggal ('YYYY-MM-DD').
  const dayMap = useMemo(() => {
    const map = {};
    
    // Add schedule items (date is already YYYY-MM-DD string)
    items?.forEach((it) => {
      if (!it.date) return;
      (map[it.date] = map[it.date] || []).push({
        ...it,
        category: it.category || 'agenda',
        color: it.color || EVENT_COLORS[it.category || 'agenda'],
      });
    });
    
    // Add events (expenses, service, etc.) with category colors
    events?.forEach((e) => {
      if (!e.date) return;
      // Normalize date to YYYY-MM-DD string
      const dateStr = typeof e.date === 'string' ? e.date : e.date.split('T')[0];
      (map[dateStr] = map[dateStr] || []).push({
        ...e,
        member: e.category,
        ...e.color && { color: e.color },
        onClick: () => onEventClick?.(e),
      });
    });
    
    // Add tasks with due dates
    tasks?.forEach((t) => {
      if (!t.dueDate) return;
      const dateStr = typeof t.dueDate === 'string' ? t.dueDate : t.dueDate.split('T')[0];
      (map[dateStr] = map[dateStr] || []).push({
        id: `task-${t.id}`,
        title: t.title || 'Tugas',
        date: t.dueDate,
        category: 'task',
        color: t.completed ? 'bg-gray-400' : 'bg-amber-500',
        completed: t.completed,
        priority: t.priority,
        onClick: () => onEventClick?.({ type: 'task', item: t }),
      });
    });
    
    return map;
  }, [items, events, tasks]);

  const tasksByKey = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      (map[t.dueDate] = map[t.dueDate] || []).push(t);
    });
    return map;
  }, [tasks]);

  const taskKeys = useMemo(() => new Set(Object.keys(tasksByKey)), [tasksByKey]);

  // Label periode sesuai view aktif.
  const periodLabel =
    view === 'month'
      ? `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`
      : view === 'week'
        ? weekLabel(cursor)
        : String(cursor.getFullYear());

  const shift = (dir) => {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (view === 'week') setCursor(addDays(cursor, dir * 7));
    else setCursor(new Date(cursor.getFullYear() + dir, cursor.getMonth(), 1));
  };

  const goToday = () => {
    setCursor(today);
    setSelected(today);
  };

  const pickMonth = (m) => {
    setCursor(new Date(cursor.getFullYear(), m, 1));
    setView('month');
  };

  const pickDay = (d) => {
    setSelected(d);
    setCursor(toDate(d));
  };

  return (
    <section aria-label="Kalender keluarga" className="space-y-4">
      {/* Header: skala view + periode + navigasi */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="Skala kalender">
          {[
            { k: 'week', l: 'Minggu' },
            { k: 'month', l: 'Bulan' },
            { k: 'year', l: 'Tahun' },
          ].map((v) => (
            <button
              key={v.k}
              type="button"
              onClick={() => setView(v.k)}
              aria-pressed={view === v.k}
              className={`inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium transition-colors ${
                view === v.k ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:text-ink'
              }`}
            >
              {v.l}
            </button>
          ))}
        </div>

        <h2 className="min-w-0 flex-1 truncate px-1 text-center font-mono text-sm font-bold text-ink">
          {periodLabel}
        </h2>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Periode sebelumnya"
            className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-mutedfg transition-colors hover:text-ink"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="h-11 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-mutedfg transition-colors hover:text-ink"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Periode berikutnya"
            className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-mutedfg transition-colors hover:text-ink"
          >
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </div>

      {view === 'month' && (
        <MonthGrid
          cursor={cursor}
          today={today}
          selected={selected}
          dayMap={dayMap}
          taskKeys={taskKeys}
          onPickDay={pickDay}
        />
      )}

      {view === 'week' && <WeekList cursor={cursor} today={today} dayMap={dayMap} tasksByKey={tasksByKey} />}

      {view === 'year' && (
        <YearGrid
          cursor={cursor}
          today={today}
          dayMap={dayMap}
          taskKeys={taskKeys}
          onPickMonth={pickMonth}
        />
      )}

      {view === 'month' && <DayList date={selected} dayMap={dayMap} tasksByKey={tasksByKey} onEventClick={onEventClick} />}

      <Legend />
    </section>
  );
}

// ---- Label periode minggu: "12–18 Okt 2026" ---------------------------------
function weekLabel(d) {
  const start = startOfWeek(d);
  const end = addDays(start, 6);
  const sm = MONTH_NAMES[start.getMonth()].slice(0, 3);
  const em = MONTH_NAMES[end.getMonth()].slice(0, 3);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${em} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${sm} – ${end.getDate()} ${em} ${end.getFullYear()}`;
}

// ============================================================================
// Grid bulan: 7 kolom, sel = angka + dot warna member + bar tugas
// ============================================================================
function MonthGrid({ cursor, today, selected, dayMap, taskKeys, onPickDay }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Senin = 0
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div
      role="grid"
      aria-label={`Kalender ${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`}
      // Full-bleed di layar kecil supaya sel tetap ≥ 44px (320px → 7×44 + 6px garis)
      className="-mx-4 md:-mx-0"
    >
      <div role="row" className="grid grid-cols-7 gap-px">
        {DAY_LABELS.map((n) => (
          <span key={n} role="columnheader" className="px-1 py-1.5 text-center text-xs font-semibold text-mutedfg">
            {n}
          </span>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-line">
        {rows.map((row, ri) => (
          <div key={ri} role="row" className="grid grid-cols-7 gap-px">
            {row.map((d, ci) =>
              d ? (
                <DayCell
                  key={fmtKey(d)}
                  date={d}
                  today={today}
                  selected={selected}
                  dayMap={dayMap}
                  taskKeys={taskKeys}
                  onPickDay={onPickDay}
                />
              ) : (
                <span key={`e${ci}`} className="bg-surface/50" aria-hidden="true" />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCell({ date, today, selected, dayMap, taskKeys, onPickDay }) {
  const key = fmtKey(date);
  const items = dayMap[key] || [];
  const members = [...new Set(items.map((i) => i.member).filter(Boolean))];
  const hasTask = taskKeys.has(key);
  const desc = `${formatLong(date)}${
    items.length ? ' — ' + items.map((i) => `${i.title}`).join(', ') : ''
  }${hasTask ? '; ada tugas jatuh tempo' : ''}`;

  // Check if any item has a click handler
  const itemWithClick = items.find((i) => i.onClick);

  const isToday = isSameDay(date, today);
  const isSelected = isSameDay(date, selected);

  const handleClick = (e) => {
    if (itemWithClick) {
      e.stopPropagation();
      itemWithClick.onClick?.();
    } else {
      onPickDay(date);
    }
  };

  return (
    /* Satu kelas latar untuk tiap keadaan — bukan "latar dasar + tambahan".
       Kalau ditumpuk, urutan aturan CSS Tailwind (yang menang: bg-surface)
       membuat sorotan "hari ini"/"terpilih" tidak pernah terlihat. */
    <button
      type="button"
      onClick={handleClick}
      aria-label={desc}
      aria-pressed={isSelected}
      className={`relative flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-[3px] rounded-md text-sm transition-colors hover:border-brand/40 ${
        isSelected
          ? 'bg-cta/25 text-ink ring-2 ring-inset ring-cta'
          : isToday
            ? 'bg-brandtint text-brandfg'
            : 'bg-surface text-mutedfg'
      }`}
    >
      <span className="font-mono leading-none">{date.getDate()}</span>
      <span className="flex items-center gap-[3px]">
        {items.map((item) => (
          <span 
            key={item.id} 
            className={`h-1.5 w-1.5 rounded-full ${item.color || memberColor(item.member)}`} 
            aria-hidden="true" 
          />
        ))}
      </span>
      {hasTask && (
        <span className="absolute bottom-1 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-mutedfg/60" aria-hidden="true" />
      )}
    </button>
  );
}

// ============================================================================
// Minggu: 7 baris (Senin–Minggu), tiap baris = daftar agenda hari itu.
// (Baris full-width — lebih terbaca di HP daripada 7 kolom sempit.)
// ============================================================================
function WeekList({ cursor, today, dayMap, tasksByKey }) {
  const start = startOfWeek(cursor);
  const days = [...Array(7)].map((_, i) => addDays(start, i));

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2" role="list" aria-label={`Minggu ${weekLabel(cursor)}`}>
      {days.map((d) => {
        const key = fmtKey(d);
        const items = dayMap[key] || [];
        const ttasks = tasksByKey[key] || [];
        const isToday = isSameDay(d, today);
        return (
          <div key={key} className="rounded-2xl border border-line bg-surface/70 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className={`text-sm font-bold ${isToday ? 'text-brandfg' : 'text-ink'}`}>
                {WEEKDAY_LONG[(d.getDay() + 6) % 7]}, {d.getDate()} {MONTH_NAMES[d.getMonth()].slice(0, 3)}
              </h3>
              {isToday && <Badge tone="brand">Hari Ini</Badge>}
            </div>
            {items.length + ttasks.length === 0 ? (
              <p className="text-sm text-mutedfg/80">Tidak ada agenda</p>
            ) : (
              <ul className="space-y-1.5">
                {items.map((it) => (
                  <li key={`s${it.id}`} className="flex min-w-0 items-center gap-2 text-sm">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${it.color || memberColor(it.member)}`} aria-hidden="true" />
                    <span className="shrink-0 font-mono text-xs text-mutedfg">{it.time || ''}</span>
                    <span className="truncate font-medium text-ink">{it.title}</span>
                  </li>
                ))}
                {ttasks.map((t) => (
                  <li key={`t${t.id}`} className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="shrink-0 text-mutedfg" aria-hidden="true">
                      <Icon name="check" size={13} />
                    </span>
                    <span className={`truncate ${t.completed ? 'text-mutedfg line-through' : 'font-medium text-ink'}`}>
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Tahun: 12 kartu bulan + heatmap mini per hari; klik kartu → lihat bulan itu.
// ============================================================================
function YearGrid({ cursor, today, dayMap, taskKeys, onPickMonth }) {
  const year = cursor.getFullYear();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" role="list" aria-label={`Tahun ${year}`}>
      {MONTH_NAMES.map((name, m) => {
        const prefix = `${year}-${pad(m + 1)}-`;
        const monthItems = Object.keys(dayMap)
          .filter((k) => k.startsWith(prefix))
          .reduce((sum, k) => sum + dayMap[k].length, 0);
        const monthTasks = [...taskKeys].filter((k) => k.startsWith(prefix)).length;
        const isCurrent = m === today.getMonth() && year === today.getFullYear();
        return (
          <button
            key={name}
            type="button"
            onClick={() => onPickMonth(m)}
            aria-label={`${name} ${year}: ${monthItems} jadwal, ${monthTasks} tugas`}
            className={`min-h-[92px] rounded-2xl border p-3 text-left transition-colors ${
              /* Tint 14% (pola sama dengan penanda aktif lain). Tint 40% terbaca
                 pekat sehingga nama bulan & jumlah di atasnya gagal kontras
                 (gelap 3,9:1 / 2,6:1 · terang 4,0:1 / 3,5:1). Border 40% yang
                 lebih tegas tetap jadi penandanya. */
              isCurrent ? 'border-brand/40 bg-brandtint' : 'border-line bg-surface hover:border-brand/40'
            }`}
          >
            <p className={`text-sm font-bold ${isCurrent ? 'text-brandfg' : 'text-ink'}`}>{name}</p>
            <p className="mt-0.5 font-mono text-xs text-mutedfg">
              {monthItems} jadwal · {monthTasks} tugas
            </p>
            <MiniMonthDots year={year} month={m} dayMap={dayMap} taskKeys={taskKeys} />
          </button>
        );
      })}
    </div>
  );
}

function MiniMonthDots({ year, month, dayMap, taskKeys }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prefix = `${year}-${pad(month + 1)}-`;
  const cells = [];
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div className="mt-2 grid grid-cols-7 gap-px" aria-hidden="true">
      {rows.flat().map((d, idx) => {
        const key = d ? `${prefix}${pad(d)}` : null;
        const n = key ? (dayMap[key]?.length || 0) + (taskKeys.has(key) ? 1 : 0) : 0;
        return (
          <span
            key={idx}
            className={`h-1 w-1 rounded-[2px] ${
              !d ? 'bg-transparent' : n > 1 ? 'bg-brand' : n === 1 ? 'bg-brand/70' : 'bg-muted/40'
            }`}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// Daftar agenda hari terpilih (view Bulan).
// ============================================================================
function DayList({ date, dayMap, tasksByKey, onEventClick }) {
  const key = fmtKey(date);
  const items = dayMap[key] || [];
  const ttasks = tasksByKey[key] || [];

  return (
    <div className="rounded-2xl border border-line bg-surface/70 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
        <span className="text-mutedfg" aria-hidden="true">
          <Icon name="clock" size={15} />
        </span>
        {formatLong(date)}
      </h3>
      <div className="mt-3 space-y-2">
        {items.length + ttasks.length === 0 && (
          <p className="text-sm text-mutedfg">Tidak ada agenda di hari ini.</p>
        )}
        {items.map((it) => (
          <div 
            key={`s${it.id}`} 
            className={`flex min-w-0 items-center gap-2 cursor-pointer rounded-lg p-2 text-sm transition-colors hover:bg-muted ${
              it.onClick ? 'cursor-pointer' : ''
            }`}
            onClick={it.onClick || (onEventClick ? () => onEventClick(it) : undefined)}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${it.color || memberColor(it.member)}`} aria-hidden="true" />
            <span className="shrink-0 font-mono text-xs text-mutedfg">{it.time || ''}</span>
            <span className="truncate font-medium text-ink">{it.title}</span>
            <Badge tone="gray">{it.category || it.member || 'Keluarga'}</Badge>
          </div>
        ))}
        {ttasks.map((t) => (
          <div key={`t${t.id}`} className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-mutedfg" aria-hidden="true">
              <Icon name="check" size={13} />
            </span>
            <span className={`truncate ${t.completed ? 'text-mutedfg line-through' : 'font-medium text-ink'}`}>
              {t.title}
            </span>
            <Badge tone="amber">Tugas</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Legenda warna member — supaya warna bukan satu-satunya penanda.
// ============================================================================
function Legend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-line bg-surface/60 px-3 py-2 text-xs text-mutedfg"
      role="note"
      aria-label="Legenda warna anggota"
    >
      {Object.entries(MEMBER_COLORS).map(([m, c]) => (
        <span key={m} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${c}`} aria-hidden="true" />
          {m}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-mutedfg/60" aria-hidden="true" />
        Tugas
      </span>
    </div>
  );
}