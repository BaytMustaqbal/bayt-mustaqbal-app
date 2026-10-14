import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { Card, GlassCard, StatCard, QuickAction, ProgressBar, Badge, CTA_CLASS } from './ui';
import { DonutChart, LineChart } from './charts';
import { Timeline } from './Timeline';

/* =========================================================
   Dashboard — slice pertama tema "High-Tech Blue".

   Susunannya mengikuti rujukan (kartu saldo di atas, aksi cepat,
   KPI, lalu grafik dan daftar terbaru), tapi isinya disesuaikan
   dengan data yang benar-benar ada: belum ada saldo/akun, jadi kartu
   hero memakai "Pengeluaran bulan ini + realisasi anggaran" —
   bukan "Total Balance" palsu.
   ========================================================= */

function Panel({ icon, title, action, children }) {
  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <div className="flex min-w-0 items-center gap-2">
          <Icon name={icon} size={18} className="shrink-0 text-brandfg" />
          <h2 className="truncate font-bold text-ink">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function Dashboard({ data, user, formatCurrency, formatCurrencyShort, onNavigate, onOpenTimeline, onEditItem }) {
  // Jumlah uang di kartu hero disembunyikan secara default (privasi saat
  // orang lain melirik layar). Tombol mata menampilkannya sementara —
  // sengaja TIDAK disimpan, supaya tiap kali app dibuka kembali tersembunyi.
  const [showMoney, setShowMoney] = useState(false);
  const masked = 'Rp ••••••';

  const totals = useMemo(() => {
    const totalExpense = data.expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const tasksDone = data.tasks.filter((t) => t.completed).length;
    const budgetLeft = Math.max(0, data.budget.total - totalExpense);
    const monthCount = data.monthlyTrend.length;
    const prevMonth = monthCount > 1 ? data.monthlyTrend[monthCount - 2].value : 0;
    const delta = prevMonth ? Math.round(((totalExpense - prevMonth) / prevMonth) * 100) : 0;
    const avgMonth = Math.round(
      data.monthlyTrend.reduce((sum, m) => sum + m.value, 0) / (monthCount || 1)
    );
    return { totalExpense, tasksDone, budgetLeft, delta, avgMonth };
  }, [data]);

  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const usedPct = Math.min(100, Math.round((totals.totalExpense / data.budget.total) * 100));
  const isDown = totals.delta <= 0;

  return (
    <section className="app-fade-in stagger space-y-5 sm:space-y-6">
      {/* ---------- Sapaan ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-mutedfg sm:text-sm">{dateLabel}</p>
          <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            {greeting}, {user.name}
          </h1>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/25 bg-brandtint px-3 py-1 text-[11px] font-semibold text-brandfg">
          <Icon name="sparkles" size={13} />
          Rumah Masa Depan
        </span>
      </div>

      {/* ---------- Kartu hero: keuangan bulan ini ---------- */}
      <GlassCard className="relative p-5 sm:p-6">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative grid gap-5 sm:grid-cols-[1.05fr_1fr] sm:items-center sm:gap-8">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-mutedfg">
              <Icon name="wallet" size={14} />
              Pengeluaran {data.budget.month}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <p
                className="font-mono text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl"
                title={showMoney ? formatCurrency(totals.totalExpense) : undefined}
              >
                {showMoney ? (
                  formatCurrency(totals.totalExpense)
                ) : (
                  <>
                    <span aria-hidden="true">{masked}</span>
                    <span className="sr-only">Jumlah pengeluaran disembunyikan</span>
                  </>
                )}
              </p>
              {/* Tombol mata — pola sama dengan "Lihat password" di modal Akun:
                  aria-pressed = jumlah sedang tampil, ikon = aksi berikutnya. */}
              <button
                type="button"
                onClick={() => setShowMoney((prev) => !prev)}
                aria-label={showMoney ? 'Sembunyikan jumlah pengeluaran' : 'Tampilkan jumlah pengeluaran'}
                aria-pressed={showMoney}
                title={showMoney ? 'Sembunyikan jumlah' : 'Tampilkan jumlah'}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-mutedfg transition-colors hover:bg-muted hover:text-ink"
              >
                <Icon name={showMoney ? 'eyeOff' : 'eye'} size={19} />
              </button>
            </div>
            <p className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-mutedfg">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                  isDown ? 'bg-toneemerald/15 text-toneemeraldfg' : 'bg-tonerose/15 text-tonerosefg'
                }`}
              >
                <Icon name={isDown ? 'arrowDownRight' : 'arrowUpRight'} size={12} />
                {Math.abs(totals.delta)}%
              </span>
              dibanding bulan lalu
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3 text-xs text-mutedfg">
              <span>Realisasi anggaran</span>
              <span className="font-mono font-semibold text-ink">{usedPct}%</span>
            </div>
            <ProgressBar value={totals.totalExpense} max={data.budget.total} className="mt-2" />
            <div className="mt-2 flex items-baseline justify-between gap-3 text-xs">
              <span className="text-mutedfg">
                Sisa dari {showMoney ? formatCurrencyShort(data.budget.total) : 'Rp ••••'}
              </span>
              <span className="font-mono font-semibold text-brandfg">
                {showMoney ? formatCurrency(totals.budgetLeft) : masked}
              </span>
            </div>
            <button type="button" onClick={() => onNavigate('expenses')} className={`${CTA_CLASS} mt-4 w-full`}>
              <Icon name="wallet" size={16} />
              Lihat Keuangan
            </button>
          </div>
        </div>
      </GlassCard>

      {/* ---------- Aksi cepat ---------- */}
      <div>
        <h2 className="mb-2.5 text-sm font-semibold text-ink">Aksi Cepat</h2>
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          <QuickAction icon="wallet" label="Pengeluaran" tone="cyan" onClick={() => onNavigate('expenses')} />
          <QuickAction icon="calendar" label="Agenda" tone="blue" onClick={() => onNavigate('agenda')} />
          <QuickAction icon="note" label="Catatan" tone="violet" onClick={() => onNavigate('notes')} />
          <QuickAction icon="users" label="Keluarga" tone="emerald" onClick={() => onNavigate('family')} />
        </div>
      </div>

      {/* ---------- KPI ---------- */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon="calendar" tone="cyan" value={data.schedule.length} label="Agenda" hint="Jadwal aktif" />
        <StatCard icon="users" tone="blue" value={data.family.length} label="Anggota" hint="Terdaftar" />
        <StatCard
          icon="tasks"
          tone="violet"
          value={`${totals.tasksDone}/${data.tasks.length}`}
          label="Tugas"
          hint="Selesai · di Agenda"
        />
        <StatCard
          icon="target"
          tone="emerald"
          value={formatCurrencyShort(totals.budgetLeft)}
          valueTitle={formatCurrency(totals.budgetLeft)}
          label="Sisa anggaran"
          hint={`dari ${formatCurrencyShort(data.budget.total)}`}
        />
      </div>

      {/* ---------- Tren 6 bulan ---------- */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon name="trendingUp" size={18} className="shrink-0 text-brandfg" />
            <h2 className="truncate font-bold text-ink">Tren Pengeluaran</h2>
          </div>
          <span className="shrink-0 text-xs text-mutedfg">
            6 bulan · rata-rata {formatCurrencyShort(totals.avgMonth)}
          </span>
        </div>
        <LineChart data={data.monthlyTrend} formatValue={formatCurrencyShort} />
      </Card>

      {/* ---------- Donat ---------- */}
      <Panel
        icon="pieChart"
        title="Komposisi Pengeluaran"
        action={<span className="shrink-0 text-xs text-mutedfg">bulan ini</span>}
      >
        <DonutChart data={data.categories} formatValue={formatCurrencyShort} centerLabel="Total" />
      </Panel>

      {/* ---------- Timeline Agenda (ringkas) ----------
          Dashboard hanya memuat hari ini + 2 hari ke depan, tanpa blok riwayat
          dan tanpa chip filter — tampilan penuh tetap di halaman Agenda.
          "Lihat semua" membuka halaman Agenda langsung di sub-tab Timeline. */}
      <Panel
        icon="calendar"
        title="Timeline Agenda"
        action={
          <button
            type="button"
            onClick={() => onOpenTimeline?.()}
            className="grid h-11 shrink-0 place-items-center rounded-full px-3 text-xs font-medium text-brandfg transition-colors hover:bg-brandtint"
          >
            Lihat semua
          </button>
        }
      >
        <Timeline
          data={data}
          onEdit={onEditItem}
          formatCurrency={formatCurrencyShort}
          limitDays={3}
          showHistory={false}
          showFilters={false}
        />
      </Panel>

      {/* ---------- Pengeluaran terbaru ----------
          "Agenda Terdekat" dilepas dari Dashboard: isinya sudah tercakup kartu
          Timeline Agenda di atas (hari ini + 2 hari ke depan), jadi tampilnya
          tidak lagi dua daftar agenda yang tumpang tindih. */}
      <Panel
        icon="wallet"
        title="Pengeluaran Terbaru"
        action={
          <button
            type="button"
            onClick={() => onNavigate('expenses')}
            className="grid h-11 shrink-0 place-items-center rounded-full px-3 text-xs font-medium text-brandfg transition-colors hover:bg-brandtint"
          >
            Semua
          </button>
        }
      >
        {data.expenses.length === 0 ? (
          <p className="py-6 text-center text-sm text-mutedfg">Belum ada pengeluaran.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.expenses.slice(0, 4).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.category}</p>
                  <p className="truncate text-xs text-mutedfg">{item.description}</p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold text-brandfg">
                  {formatCurrency(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Catatan kejujuran data */}
      <p className="text-center text-[11px] text-mutedfg">
        <Badge tone="gray">Purwarupa</Badge>{' '}
        <span className="align-middle">angka di atas masih data contoh, belum dari database.</span>
      </p>
    </section>
  );
}
