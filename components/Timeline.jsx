import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { Badge, EmptyState } from './ui';
import { AGENDA_CATEGORIES, FINANCE_CATEGORIES, NOTE_CATEGORIES, getCategoryMeta } from './categories';

// ============================================================================
// Timeline keluarga — satu alur kronologis yang menggabungkan empat modul.
//
// Tanggal yang dipakai tiap jenis (semua field yang sudah ada, tanpa data baru):
//   agenda      → schedule.date  (+ time untuk urutan jam)
//   tugas       → tasks.dueDate
//   pengeluaran → expenses.date
//   catatan     → notes.updatedAt  → dilabeli jujur "Catatan diperbarui",
//                 karena data ini belum punya tanggal pembuatan.
//
// Urutan alur: mulai dari HARI INI ke depan (rencana), lalu blok "Riwayat"
// berisi yang sudah lewat (terbaru dulu). Kalau hari ini belum ada item,
// garis penanda "Hari Ini" tetap ditampilkan supaya batas lewat/akan datang
// tidak hilang.
//
// Bentuk: rel vertikal + titik per hari + cabang penghubung ke tiap item
// (nuansa alur). Rel, titik, dan cabang murni dekoratif (aria-hidden) — semua
// informasi tetap teks. Tiap item = tombol utuh (area sentuh ≥ 44px + fokus
// keyboard jelas) yang membuka sheet "Ubah" modul asalnya lewat `onEdit`.
// ============================================================================

// Jenis item + warna chip filter. Ikon di tiap baris memakai ikon kategori
// dari `categories.js` (satu sumber kebenaran), sama seperti kartu agenda.
const FILTERS = [
  { id: 'semua', label: 'Semua', icon: 'activity' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'tugas', label: 'Tugas', icon: 'tasks' },
  { id: 'keuangan', label: 'Keuangan', icon: 'wallet' },
  { id: 'catatan', label: 'Catatan', icon: 'note' },
];

const PRIORITY_TONE = { high: 'red', medium: 'amber', low: 'green' };
const PRIORITY_LABEL = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };

// Urutan dalam satu hari: agenda dulu (punya jam), lalu tugas → keuangan → catatan.
const KIND_ORDER = { agenda: 0, tugas: 1, keuangan: 2, catatan: 3 };

// ---------- Tanggal ----------
// Semua perhitungan berangkat dari string "YYYY-MM-DD". Tanggal diurai manual
// (bukan `new Date('2026-10-13')`) karena bentuk itu dibaca sebagai UTC dan
// bisa bergeser sehari di zona waktu tertentu.
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

// ---------- Isi tiap baris per jenis ----------
const rowTitle = (row) =>
  row.kind === 'keuangan' ? row.item.description : row.item.title;

const rowIcon = (row) => {
  if (row.kind === 'agenda') return getCategoryMeta(AGENDA_CATEGORIES, row.item.category)?.icon || 'calendar';
  if (row.kind === 'keuangan') return getCategoryMeta(FINANCE_CATEGORIES, row.item.category)?.icon || 'wallet';
  if (row.kind === 'catatan') return getCategoryMeta(NOTE_CATEGORIES, row.item.category)?.icon || 'note';
  return 'tasks';
};

/* Satu baris aktivitas — seluruh baris adalah tombol "Ubah". */
function Row({ row, onEdit, formatCurrency }) {
  const { item } = row;
  const finished = row.kind === 'tugas' && item.completed;

  return (
    <button
      type="button"
      onClick={() => onEdit?.(row.section, item)}
      className="flex min-h-[44px] w-full items-start gap-2.5 rounded-xl border border-line bg-surface px-3 py-2 text-left transition-[background-color,border-color] duration-fast ease-crisp hover:border-brand/40 hover:bg-muted"
    >
      <span
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-brand/20 bg-brandtint text-brandfg"
        aria-hidden="true"
      >
        <Icon name={rowIcon(row)} size={15} />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-medium ${finished ? 'text-mutedfg line-through' : 'text-ink'}`}
        >
          {rowTitle(row)}
        </span>

        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mutedfg">
          {row.kind === 'agenda' && (
            <>
              <Badge tone="brand">{item.member}</Badge>
              <span>{getCategoryMeta(AGENDA_CATEGORIES, item.category)?.label || item.category}</span>
            </>
          )}

          {row.kind === 'tugas' && (
            <>
              <Badge tone={PRIORITY_TONE[item.priority]}>{PRIORITY_LABEL[item.priority]}</Badge>
              <span>{item.assignedTo}</span>
              {item.completed && <Badge tone="green">Selesai</Badge>}
            </>
          )}

          {row.kind === 'keuangan' && (
            <span>{getCategoryMeta(FINANCE_CATEGORIES, item.category)?.label || item.category}</span>
          )}

          {row.kind === 'catatan' && (
            <>
              <span>Catatan diperbarui</span>
              {item.pinned && (
                <span className="inline-flex items-center gap-1 text-brandfg">
                  <Icon name="pin" size={11} />
                  Penting
                </span>
              )}
              <span>{getCategoryMeta(NOTE_CATEGORIES, item.category)?.label || item.category}</span>
            </>
          )}
        </span>
      </span>

      {/* Angka yang jadi penanda utama: jam untuk agenda, nominal untuk pengeluaran */}
      {row.kind === 'agenda' && row.time && (
        <span className="shrink-0 pt-0.5 font-mono text-xs font-semibold text-brandfg">{row.time}</span>
      )}
      {row.kind === 'keuangan' && (
        <span className="shrink-0 pt-0.5 font-mono text-xs font-bold text-brandfg">
          {formatCurrency(item.amount)}
        </span>
      )}
    </button>
  );
}

/* Satu hari dalam alur: titik di rel + kepala tanggal + cabang ke tiap item. */
function DayRow({ day, today, onEdit, formatCurrency }) {
  const isToday = day.date === today;
  const rel = relativeDay(day.date, today);

  return (
    <li className="relative border-l border-line pb-6 pl-6 last:border-transparent last:pb-1">
      <span
        className={`absolute -left-[7.5px] top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
          isToday ? 'border-brand bg-brand ring-4 ring-brand/15' : 'border-line bg-canvas'
        }`}
        aria-hidden="true"
      />

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-sm font-bold text-ink">{longDate(day.date)}</h2>
        {rel && <Badge tone={isToday ? 'brand' : 'gray'}>{rel}</Badge>}
        <span className="ml-auto font-mono text-[11px] text-mutedfg">{day.rows.length} item</span>
      </div>

      <ul className="mt-2 space-y-1.5">
        {day.rows.map((row) => (
          <li key={row.key} className="relative">
            {/* cabang penghubung item → rel (dekoratif) */}
            <span aria-hidden="true" className="absolute -left-6 top-1/2 h-px w-6 bg-line" />
            <Row row={row} onEdit={onEdit} formatCurrency={formatCurrency} />
          </li>
        ))}
      </ul>
    </li>
  );
}

// Mode tampilan:
//   penuh (default)  → dipakai halaman Agenda → sub-tab Timeline.
//   ringkas          → dipakai kartu Dashboard: batasi `limitDays` hari ke depan,
//                      `showHistory={false}` (blok riwayat disembunyikan) dan
//                      `showFilters={false}` (chip filter milik halaman penuh).
// Nilai default sengaja = tampilan penuh, supaya pemanggil lama tidak berubah.
export function Timeline({
  data,
  onEdit,
  formatCurrency = (v) => String(v),
  limitDays,
  showHistory = true,
  showFilters = true,
}) {
  const [filter, setFilter] = useState('semua');

  // Empat modul → satu daftar baris. Item tanpa tanggal dibuang (tidak bisa
  // diletakkan di alur waktu).
  const items = useMemo(() => {
    const rows = [];
    (data.schedule || []).forEach((item) =>
      rows.push({ key: `agenda-${item.id}`, kind: 'agenda', section: 'agenda', date: item.date, time: item.time || '', item })
    );
    (data.tasks || []).forEach((item) =>
      rows.push({ key: `tugas-${item.id}`, kind: 'tugas', section: 'tasks', date: item.dueDate, time: '', item })
    );
    (data.expenses || []).forEach((item) =>
      rows.push({ key: `keuangan-${item.id}`, kind: 'keuangan', section: 'expenses', date: item.date, time: '', item })
    );
    (data.notes || []).forEach((item) =>
      rows.push({ key: `catatan-${item.id}`, kind: 'catatan', section: 'notes', date: item.updatedAt, time: '', item })
    );
    return rows.filter((row) => row.date);
  }, [data]);

  const counts = useMemo(() => {
    const acc = { semua: items.length };
    items.forEach((row) => {
      acc[row.kind] = (acc[row.kind] || 0) + 1;
    });
    return acc;
  }, [items]);

  const shown = useMemo(
    () => (filter === 'semua' ? items : items.filter((row) => row.kind === filter)),
    [items, filter]
  );

  const today = todayISO();

  // Kelompokkan per tanggal (naik), lalu urutkan isi harinya.
  const days = useMemo(() => {
    const map = new Map();
    shown.forEach((row) => {
      if (!map.has(row.date)) map.set(row.date, []);
      map.get(row.date).push(row);
    });
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, rows]) => ({
        date,
        rows: rows
          .slice()
          .sort(
            (a, b) =>
              KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || String(a.time).localeCompare(String(b.time))
          ),
      }));
  }, [shown]);

  const upcomingAll = days.filter((day) => day.date >= today);
  // Mode ringkas membatasi jumlah hari ke depan; mode penuh menampilkan semua.
  const upcoming = typeof limitDays === 'number' ? upcomingAll.slice(0, limitDays) : upcomingAll;
  const past = showHistory ? days.filter((day) => day.date < today).reverse() : [];
  const hasToday = upcoming.length > 0 && upcoming[0].date === today;

  return (
    <div>
      {/* Filter jenis aktivitas — jumlah mengikuti data nyata.
          Disembunyikan di mode ringkas (kartu Dashboard). */}
      {showFilters && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter jenis aktivitas">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? 'border-brand/50 bg-brandtint text-brandfg'
                    : 'border-line bg-surface text-mutedfg hover:bg-muted hover:text-ink'
                }`}
              >
                <Icon name={f.icon} size={16} />
                {f.label}
                <span className="font-mono text-xs opacity-80">{counts[f.id] || 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState
          icon="activity"
          title={filter === 'semua' ? 'Belum ada aktivitas' : 'Tidak ada item di filter ini'}
          message={
            filter === 'semua'
              ? 'Tambahkan agenda, tugas, pengeluaran, atau catatan — semuanya akan muncul di alur ini.'
              : 'Pilih jenis lain untuk melihat aktivitas keluarga.'
          }
        />
      ) : (
        <ol className="stagger" aria-label="Alur aktivitas keluarga">
          {/* Hari ini kosong → penanda tetap ada supaya batas rencana/riwayat jelas */}
          {!hasToday && (
            <li className="relative border-l border-line pb-6 pl-6">
              <span
                className="absolute -left-[11px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-brand bg-brand ring-4 ring-brand/15"
                aria-hidden="true"
              />
              <h2 className="text-sm font-bold text-ink">Hari Ini</h2>
              <p className="mt-1.5 rounded-xl border border-dashed border-line bg-surface px-3 py-2.5 text-xs text-mutedfg">
                Belum ada agenda, tugas, pengeluaran, atau catatan bertanggal hari ini.
              </p>
            </li>
          )}

          {upcoming.map((day) => (
            <DayRow
              key={day.date}
              day={day}
              today={today}
              onEdit={onEdit}
              formatCurrency={formatCurrency}
            />
          ))}

          {past.length > 0 && (
            <>
              <li className="relative border-l border-line pb-6 pl-6">
                <span
                  className="absolute -left-[11px] top-1 grid h-[21px] w-[21px] place-items-center rounded-full border border-line bg-surface text-mutedfg"
                  aria-hidden="true"
                >
                  <Icon name="clock" size={12} />
                </span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-mutedfg">
                  Riwayat — sebelum hari ini
                </h2>
              </li>
              {past.map((day) => (
                <DayRow
                  key={day.date}
                  day={day}
                  today={today}
                  onEdit={onEdit}
                  formatCurrency={formatCurrency}
                />
              ))}
            </>
          )}
        </ol>
      )}
    </div>
  );
}
