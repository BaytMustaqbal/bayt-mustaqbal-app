import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { Card, GlassCard, StatCard, ProgressBar, Badge, CTA_CLASS } from './ui';
import { Timeline } from './Timeline';
import { getBudget } from './budget';
import { openAlbum } from './album';
import { readUiPrefs } from '../services/uiPrefs';

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

export function Dashboard({ data, user, formatCurrency, formatCurrencyShort, onNavigate, onOpenTimeline, onEditItem, insight = null }) {
  // Jumlah uang di kartu hero disembunyikan secara default (privasi saat
  // orang lain melirik layar). Tombol mata menampilkannya sementara —
  // sengaja TIDAK disimpan, supaya tiap kali app dibuka kembali tersembunyi.
  const [showMoney, setShowMoney] = useState(() => !readUiPrefs().hideMoneyDefault);
  const masked = 'Rp ••••••';

  // Satu sumber angka anggaran (components/budget.js). Snapshot localStorage
  // lama (budget masih `{ total, month }`) tetap terbaca: `income` di sana
  // punya nilai cadangan ke `total`.
  const budget = getBudget(data);

  const totals = useMemo(() => {
    const expenses = data.expenses || [];
    const incomeList = data.income || [];
    const monthlyTrend = data.monthlyTrend || [];
    const totalExpense = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalIncome = incomeList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    // Bulan berjalan — dipakai kartu "Pemasukan Bulan Ini" & "Selisih"
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const inMonth = (list) => list.filter((i) => (i.date || '').startsWith(monthPrefix));
    const incomeMonth = inMonth(incomeList).reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const expenseMonth = inMonth(expenses).reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const tasksDone = (data.tasks || []).filter((t) => t.completed).length;
    const budgetLeft = budget.income - totalExpense;
    const monthCount = monthlyTrend.length;
    const prevMonth = monthCount > 1 ? monthlyTrend[monthCount - 2].value : 0;
    const delta = prevMonth ? Math.round(((totalExpense - prevMonth) / prevMonth) * 100) : 0;
    const avgMonth = Math.round(
      monthlyTrend.reduce((sum, m) => sum + m.value, 0) / (monthCount || 1)
    );
    // Proyeksi saldo akhir bulan: rata-rata pengeluaran harian bulan ini × sisa hari.
    const nowDate = new Date();
    const daysInMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate();
    const dayToday = nowDate.getDate();
    const dailyAvg = dayToday > 0 ? expenseMonth / dayToday : 0;
    const projectedExpense = Math.round(dailyAvg * daysInMonth);
    const projectedNet = Math.round(incomeMonth - projectedExpense);
    return { totalExpense, totalIncome, incomeMonth, expenseMonth, net: incomeMonth - expenseMonth, tasksDone, budgetLeft, delta, avgMonth, dailyAvg, projectedExpense, projectedNet, daysInMonth, dayToday };
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

  // Gaji 0/belum diisi → 0% (bukan NaN/∞).
  const usedPct =
    budget.income > 0
      ? Math.round((totals.totalExpense / budget.income) * 100)
      : 0;
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
      </div>

      {/* ---------- Panduan pertama kali (saat keuangan masih kosong) ---------- */}
      {totals.totalExpense === 0 && totals.totalIncome === 0 && (
        <Card className="border-brand/30 bg-brandtint/40 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Icon name="zap" size={18} className="shrink-0 text-brandfg" />
            <h2 className="truncate font-bold text-ink">Mulai Bayt Mustaqbal</h2>
          </div>
          <p className="mt-1 text-sm text-mutedfg">
            Isi pemasukan & anggaran dulu, lalu catat pengeluaran supaya wawasan dan proyeksi hidup.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onNavigate('income')}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-ink transition-colors hover:bg-muted"
            >
              <Icon name="arrowDown" size={14} /> 1. Catat Pemasukan
            </button>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-ink transition-colors hover:bg-muted"
            >
              <Icon name="arrowUp" size={14} /> 2. Anggaran & Perlu
            </button>
            <button
              type="button"
              onClick={() => onNavigate('agenda')}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-ink transition-colors hover:bg-muted"
            >
              <Icon name="calendar" size={14} /> 3. Agenda Keluarga
            </button>
          </div>
        </Card>
      )}

      {/* ---------- Kartu hero: keuangan bulan ini ---------- */}
      <GlassCard className="relative p-5 sm:p-6">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative grid gap-5 sm:grid-cols-[1.05fr_1fr] sm:items-center sm:gap-8">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-mutedfg">
              <Icon name="wallet" size={14} />
              Pengeluaran {budget.month}
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
            <ProgressBar value={totals.totalExpense} max={budget.income} className="mt-2" />
            <div className="mt-2 flex items-baseline justify-between gap-3 text-xs">
              <span className="text-mutedfg">
                {totals.budgetLeft >= 0 ? 'Sisa dari' : 'Anggaran'}{' '}
                {showMoney ? formatCurrencyShort(budget.income) : 'Rp ••••'}
              </span>
              <span className={`font-mono font-semibold ${totals.budgetLeft < 0 ? 'text-tonerosefg' : 'text-brandfg'}`}>
                {showMoney
                  ? totals.budgetLeft >= 0
                    ? formatCurrency(totals.budgetLeft)
                    : `Lebih ${formatCurrency(-totals.budgetLeft)}`
                  : masked}
              </span>
            </div>
            <button type="button" onClick={() => onNavigate('expenses')} className={`${CTA_CLASS} mt-4 w-full`}>
              <Icon name="wallet" size={16} />
              Lihat Keuangan
            </button>
          </div>
        </div>
      </GlassCard>

      {/* ---------- KPI ---------- */}
      {/* Hanya menampilkan Agenda dan Tugas di ringkasan dashboard */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard compact icon="calendar" tone="cyan" value={(data.schedule || []).length} label="Agenda" hint="Jadwal" />
        <StatCard compact icon="tasks" tone="violet" value={`${totals.tasksDone}/${(data.tasks || []).length}`} label="Tugas" hint="Selesai" />
      </div>

      {/* ---------- Proyeksi saldo ---------- */}
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="trendingUp" size={18} className="shrink-0 text-brandfg" />
          <h2 className="truncate font-bold text-ink">Proyeksi Saldo</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-canvas p-3">
            <p className="text-[11px] text-mutedfg">Rata-rata harian</p>
            <p className="font-mono text-sm font-bold text-ink">{formatCurrencyShort(totals.dailyAvg)}</p>
          </div>
          <div className="rounded-xl border border-line bg-canvas p-3">
            <p className="text-[11px] text-mutedfg">Proyeksi pengeluaran</p>
            <p className="font-mono text-sm font-bold text-ink">{formatCurrencyShort(totals.projectedExpense)}</p>
          </div>
          <div className="rounded-xl border border-line bg-canvas p-3">
            <p className="text-[11px] text-mutedfg">Pemasukan bulan ini</p>
            <p className="font-mono text-sm font-bold text-brandfg">{formatCurrencyShort(totals.incomeMonth)}</p>
          </div>
          <div className="rounded-xl border border-line bg-canvas p-3">
            <p className="text-[11px] text-mutedfg">Proyeksi akhir bulan</p>
            <p className={`font-mono text-sm font-bold ${totals.projectedNet >= 0 ? 'text-toneemeraldfg' : 'text-tonerosefg'}`}>
              {formatCurrencyShort(totals.projectedNet)}
            </p>
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-mutedfg">
          Estimasi berdasar rata-rata {totals.dayToday} hari pertama bulan {budget.month}.
        </p>
      </Card>

      {/* ---------- Pengeluaran terbaru ----------
          "Agenda Terdekat" dilepas dari Dashboard: isinya sudah tercakup kartu
          Timeline Agenda di bawah (hari ini + 2 hari ke depan), jadi tidak lagi
          ada dua daftar agenda yang tumpang tindih. */}
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
        {(data.expenses || []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-mutedfg">Belum ada pengeluaran.</p>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className={`${CTA_CLASS}`}
            >
              <Icon name="plus" size={16} />
              Catat pengeluaran
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {(data.expenses || []).slice(0, 4).map((item) => (
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

      {/* ---------- Wawasan ringkas ---------- */}
      {insight && (
        <Card className="p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Icon name="barChart" size={18} className="shrink-0 text-brandfg" />
              <h2 className="truncate font-bold text-ink">Wawasan</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('wawasan')}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brandfg transition-colors hover:bg-brandtint"
            >
              Lihat semua
              <Icon name="chevronRight" size={15} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-canvas p-3">
              <p className="text-[11px] text-mutedfg">Pengeluaran {insight.month}</p>
              <p className="font-mono text-lg font-bold text-ink">{formatCurrencyShort(insight.totalExpense)}</p>
              {insight.changePct != null && (
                <p className={`text-[11px] font-semibold ${insight.changePct >= 0 ? 'text-tonerosefg' : 'text-toneemeraldfg'}`}>
                  {insight.changePct >= 0 ? '▲' : '▼'} {Math.abs(insight.changePct)}% vs lalu
                </p>
              )}
            </div>
            {insight.topCategories[0] && (
              <div className="rounded-xl border border-line bg-canvas p-3">
                <p className="text-[11px] text-mutedfg">Kategori teratas</p>
                <p className="truncate text-sm font-semibold text-ink">{insight.topCategories[0].label}</p>
                <p className="font-mono text-xs text-brandfg">{formatCurrencyShort(insight.topCategories[0].amount)}</p>
              </div>
            )}
            <div className="rounded-xl border border-line bg-canvas p-3">
              <p className="text-[11px] text-mutedfg">Anggaran</p>
              <p className="text-sm font-semibold text-ink">
                {insight.buckets.some((b) => b.pct > 100)
                  ? 'Ada yang melebihi'
                  : insight.buckets.some((b) => b.pct >= 80)
                    ? 'Mendekati batas'
                    : 'Terjaga'}
              </p>
              <p className="text-[11px] text-mutedfg">
                {insight.buckets.length > 0
                  ? `tertinggi ${Math.max(...insight.buckets.map((b) => b.pct))}%`
                  : ''}
              </p>
            </div>
          </div>
        </Card>
      )}

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

      {/* ---------- Ajakan ke Album Foto Keluarga (situs terpisah) ---------- */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brandtint text-brandfg" aria-hidden="true">
            <Icon name="image" size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-bold text-ink">Album Foto Keluarga</h2>
            <p className="mt-0.5 text-xs text-mutedfg">
              Kenangan keluarga bertimeline, lengkap dengan galeri dan lightbox.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openAlbum}
          className={`${CTA_CLASS} shrink-0`}
        >
          Buka Album
          <Icon name="chevronRight" size={16} />
        </button>
      </Card>
    </section>
  );
}
