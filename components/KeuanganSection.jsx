import React, { useMemo } from 'react';
import { Icon } from './Icon';
import { SectionHeader, EmptyState, Badge, Card } from './ui';
import { SlideTabs } from './SlideTabs';
import { Budgeting } from './Budgeting';
import { HistoryTimeline } from './HistoryTimeline';
import { GroupedBarChart, DonutChart, BarChart } from './charts';
import { getBudget } from './budget';
import { FINANCE_CATEGORIES, INCOME_CATEGORIES } from './categories';
import { urutTransaksiTerbaru } from '../utils/sort';
import { budgetStatus, computeCategories, computeWeekly, buildPairedTrend, monthKeyOf, monthNameLong } from '../utils/finance';

const pad2 = (n) => String(n).padStart(2, '0');

      export function KeuanganSection({
  data,
  canWrite,
  financeMode,
  setFinanceMode,
  financeFilter,
  setFinanceFilter,
  incomeFilter,
  setIncomeFilter,
  summaryMonth,
  setSummaryMonth,
  openAdd,
  openEdit,
  deleteItem,
  formatCurrency,
  formatCurrencyShort,
  retryOutboxOp,
  discardOutboxOp,
}) {
        const activeMeta =
          FINANCE_CATEGORIES.find((c) => c.id === financeFilter) || FINANCE_CATEGORIES[0];
        const filtered = urutTransaksiTerbaru(
          financeFilter === 'semua'
            ? (data?.expenses || [])
            : (data?.expenses || []).filter((item) => item.category === financeFilter),
        );
        const filteredTotal = filtered.reduce((sum, item) => sum + item.amount, 0);
        const budget = getBudget(data || {});

        // ---- Pemasukan (mode ketiga) ----
        const incomeMeta = INCOME_CATEGORIES.find((c) => c.id === incomeFilter) || INCOME_CATEGORIES[0];
        const incomeList = (data?.income || []) || [];
        const filteredIncome = urutTransaksiTerbaru(
          incomeFilter === 'semua'
            ? incomeList
            : incomeList.filter((item) => item.category === incomeFilter),
        );
        const incomeTotal = filteredIncome.reduce((sum, item) => sum + item.amount, 0);

        // Bulan berjalan ï¿½ dipakai header & notifikasi pengingat
        const monthKey = `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}`;
        const incomeThisMonth = incomeList
          .filter((i) => (i.date || '').startsWith(monthKey))
          .reduce((sum, i) => sum + i.amount, 0);

        // ---- Tab Ringkasan: agregat bulan terpilih + status anggaran ----
        const inSummaryMonth = (i) => (i.date || '').startsWith(summaryMonth);
        const monthExpenses = (data?.expenses || []).filter(inSummaryMonth);
        const monthIncomeList = incomeList.filter(inSummaryMonth);
        const expenseMonth = monthExpenses.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const incomeMonth = monthIncomeList.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const netMonth = incomeMonth - expenseMonth;
        const anggaranStatus = budgetStatus(expenseMonth, budget.income);
        const pairedTrend = buildPairedTrend((data?.expenses || []), incomeList, summaryMonth);
        const monthCategories = computeCategories(monthExpenses);
        const monthWeekly = computeWeekly(monthExpenses);
        const atCurrentMonth = summaryMonth >= monthKey;
        const shiftSummaryMonth = (delta) => {
          setSummaryMonth((prev) => {
            const [y, m] = prev.split('-').map(Number);
            const d = new Date(y, m - 1 + delta, 1);
            const key = monthKeyOf(d);
            return key > monthKey ? prev : key;
          });
        };
        return (
          <section className="app-fade-in">
            {financeMode === 'anggaran' ? (
              <SectionHeader
                icon="pieChart"
                title="Anggaran"
                subtitle={`Gaji ${formatCurrencyShort(budget.income)} - ${budget.month}`}
              />
            ) : financeMode === 'ringkasan' ? (
              <SectionHeader icon="barChart" title="Ringkasan" subtitle={`Periode ${monthNameLong(summaryMonth)}`} />
            ) : financeMode === 'pemasukan' ? (
              <SectionHeader
                icon="trendingUp"
                title={incomeMeta.label}
                subtitle={`Total: ${formatCurrencyShort(incomeTotal)} - bulan ini ${formatCurrencyShort(incomeThisMonth)}`}
                actionLabel={canWrite ? 'Tambah' : undefined}
                actionTone="accent"
                actionIconOnly
                onAction={() => openAdd('income')}
              />
            ) : (
              <>
                <SectionHeader
                  icon="wallet"
                  title={activeMeta.label}
                  subtitle={`Total: ${formatCurrencyShort(filteredTotal)} Â· anggaran ${formatCurrencyShort(budget.income)}`}
                  actionLabel={canWrite ? 'Tambah' : undefined}
                  actionTone="accent"
                  actionIconOnly
                  onAction={() => openAdd('expenses')}
                  className="mb-0"
                />
              </>
            )}

            {/* Sub-tampilan Keuangan: Ringkasan | Pengeluaran | Pemasukan | Anggaran */}
            <div className="mb-5">
              <SlideTabs
                tabs={[
                  { id: "ringkasan", label: "Ringkasan", icon: "barChart" },
                  { id: "pengeluaran", label: "Pengeluaran", icon: "wallet" },
                  { id: "pemasukan", label: "Pemasukan", icon: "trendingUp" },
                  { id: "anggaran", label: "Anggaran", icon: "pieChart" },
                ]}
                active={financeMode}
                onChange={setFinanceMode}
              />
            </div>


            {/* Chip filter kategori pengeluaran â€” satu baris scroll horizontal */}
            {financeMode === 'pengeluaran' && (
              <div className="mb-5 flex flex-nowrap gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter kategori pengeluaran">
                {FINANCE_CATEGORIES.map((cat) => {
                  const active = financeFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFinanceFilter(cat.id)}
                      aria-pressed={active}
                      className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors ${
                        active
                          ? 'border-brand/25 bg-brandtint text-brandfg'
                          : 'border-line text-mutedfg hover:bg-muted hover:text-ink'
                      }`}
                    >
                      <Icon name={cat.icon} size={14} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Chip filter kategori pemasukan â€” satu baris scroll horizontal, sama dengan pengeluaran */}
            {financeMode === 'pemasukan' && (
              <div className="mb-5 flex flex-nowrap gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter kategori pemasukan">
                {INCOME_CATEGORIES.map((cat) => {
                  const active = incomeFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setIncomeFilter(cat.id)}
                      aria-pressed={active}
                      className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors ${
                        active
                          ? 'border-brand/25 bg-brandtint text-brandfg'
                          : 'border-line text-mutedfg hover:bg-muted hover:text-ink'
                      }`}
                    >
                      <Icon name={cat.icon} size={14} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            )}

            {financeMode === 'anggaran' ? (
              <Budgeting
                data={data}
                formatCurrency={formatCurrency}
                formatCurrencyShort={formatCurrencyShort}
                onSaveBudget={handleSaveBudget}
                onAddPos={(bucket) => openAdd('budgetPos', { bucket })}
                onEditPos={(bucket, pos) => openEdit('budgetPos', { ...pos, bucket })}
                readOnly={!canWrite}
              />
            ) : financeMode === 'ringkasan' ? (
              <>
                {/* Navigator bulan: mundur bebas, maju berhenti di bulan berjalan */}
                <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => shiftSummaryMonth(-1)}
                    aria-label="Bulan sebelumnya"
                    className="grid h-11 w-11 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-muted hover:text-ink"
                  >
                    <Icon name="chevronLeft" size={18} />
                  </button>
                  <p className="text-sm font-semibold text-ink">{monthNameLong(summaryMonth)}</p>
                  <button
                    type="button"
                    onClick={() => shiftSummaryMonth(1)}
                    disabled={atCurrentMonth}
                    aria-label="Bulan berikutnya"
                    className={`grid h-11 w-11 place-items-center rounded-lg transition-colors ${
                      atCurrentMonth ? 'cursor-not-allowed text-mutedfg/40' : 'text-mutedfg hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <Icon name="chevronRight" size={18} />
                  </button>
                </div>

                {/* Banner status anggaran ï¿½ ikon + teks + warna (bukan warna saja) */}
                {anggaranStatus.level === 'belum' ? (
                  <p className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-muted px-3 py-2.5 text-sm text-mutedfg">
                    <Icon name="target" size={16} className="shrink-0" />
                    Isi angka pemasukan rencana di tab Anggaran supaya perbandingan di sini aktif.
                  </p>
                ) : anggaranStatus.level === 'lewat' ? (
                  <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-tonerose/40 bg-tonerose/10 px-3 py-2.5 text-sm text-tonerosefg">
                    <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Pengeluaran {formatCurrency(expenseMonth)} melewati anggaran {formatCurrency(budget.income)} ({anggaranStatus.pct}%).
                    </span>
                  </div>
                ) : anggaranStatus.level === 'hati-hati' ? (
                  <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-toneamber/40 bg-toneamber/10 px-3 py-2.5 text-sm text-toneamberfg">
                    <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Pengeluaran sudah memakai {anggaranStatus.pct}% anggaran bulan ini. Hati-hati.
                    </span>
                  </div>
                ) : (
                  <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2.5 text-sm text-success">
                    <Icon name="circleCheck" size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Pengeluaran {anggaranStatus.pct}% dari anggaran. Masih aman.
                    </span>
                  </div>
                )}

                {/* Ringkasan bulan terpilih: satu baris ringkas */}
                <div className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
                  {[
                    { icon: 'trendingUp', tone: 'text-toneemeraldfg', label: 'Pemasukan', value: formatCurrencyShort(incomeMonth), title: formatCurrency(incomeMonth) },
                    { icon: 'wallet', tone: 'text-brandfg', label: 'Pengeluaran', value: formatCurrencyShort(expenseMonth), title: formatCurrency(expenseMonth) },
                    { icon: netMonth >= 0 ? 'arrowUpRight' : 'arrowDownRight', tone: netMonth >= 0 ? 'text-toneemeraldfg' : 'text-tonerosefg', label: 'Selisih', value: `${netMonth >= 0 ? '+' : '-'}${formatCurrencyShort(Math.abs(netMonth))}`, title: `${netMonth >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netMonth))}` },
                    { icon: 'target', tone: anggaranStatus.level === 'lewat' ? 'text-tonerosefg' : anggaranStatus.level === 'hati-hati' ? 'text-toneamberfg' : anggaranStatus.level === 'aman' ? 'text-toneemeraldfg' : 'text-brandfg', label: 'Terpakai', value: anggaranStatus.level === 'belum' ? '-' : `${anggaranStatus.pct}%`, title: anggaranStatus.level === 'belum' ? 'Anggaran belum diisi' : `dari ${formatCurrency(budget.income)}` },
                    { icon: anggaranStatus.sisa >= 0 ? 'circleCheck' : 'alertTriangle', tone: anggaranStatus.sisa >= 0 ? 'text-toneemeraldfg' : 'text-tonerosefg', label: anggaranStatus.sisa >= 0 ? 'Sisa' : 'Lewat', value: anggaranStatus.level === 'belum' ? '-' : formatCurrencyShort(Math.abs(anggaranStatus.sisa)), title: anggaranStatus.level === 'belum' ? undefined : formatCurrency(Math.abs(anggaranStatus.sisa)) },
                  ].map((it) => (
                    <div key={it.label} className="flex min-w-0 items-center gap-1.5 rounded-xl border border-line bg-canvas px-2 py-1.5 sm:px-3">
                      <Icon name={it.icon} size={13} className={`shrink-0 ${it.tone}`} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium leading-tight text-mutedfg">{it.label}</p>
                        <p className={`truncate font-mono text-[11px] font-bold leading-tight sm:text-xs ${it.tone}`} title={it.title}>{it.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart: tren 6 bulan pemasukan vs pengeluaran (batang berpasangan) */}
                <Card className="mb-4 p-4 sm:p-5 md:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon name="barChart" size={18} className="shrink-0 text-brandfg" />
                      <h2 className="truncate font-bold text-ink">Tren 6 Bulan</h2>
                    </div>
                    <span className="shrink-0 text-xs text-mutedfg">Pemasukan vs pengeluaran</span>
                  </div>
                  <GroupedBarChart data={pairedTrend} formatValue={formatCurrencyShort} />
                </Card>

                {/* Chart: komposisi kategori + distribusi mingguan (bulan terpilih) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card className="p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon name="pieChart" size={18} className="shrink-0 text-brandfg" />
                        <h2 className="truncate font-bold text-ink">Komposisi Pengeluaran</h2>
                      </div>
                      <span className="shrink-0 text-xs text-mutedfg">{monthNameLong(summaryMonth)}</span>
                    </div>
                    {monthCategories.length === 0 ? (
                      <p className="py-6 text-center text-sm text-mutedfg">Belum ada pengeluaran di bulan ini.</p>
                    ) : (
                      <DonutChart data={monthCategories} formatValue={formatCurrencyShort} centerLabel="Total" />
                    )}
                  </Card>
                  <Card className="p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon name="clock" size={18} className="shrink-0 text-brandfg" />
                        <h2 className="truncate font-bold text-ink">Distribusi Mingguan</h2>
                      </div>
                      <span className="shrink-0 text-xs text-mutedfg">per hari</span>
                    </div>
                    <BarChart data={monthWeekly} formatValue={formatCurrencyShort} color="rgb(var(--chart4))" />
                  </Card>
                </div>
              </>
            ) : financeMode === 'pemasukan' ? (
              filteredIncome.length === 0 ? (
                <EmptyState
                  icon="trendingUp"
                  title="Belum ada pemasukan"
                  message="Catat gaji, bonus, side job, atau pemasukan lain lewat tombol Tambah."
                />
              ) : (
                <HistoryTimeline
                  items={filteredIncome}
                  formatCurrency={formatCurrency}
                  onEdit={(it) => openEdit('income', it)}
                  readOnly={!canWrite}
                  tone="success"
                  categories={INCOME_CATEGORIES}
                  amountPrefix="+"
                  onRetry={(item) => retryOutboxOp(item.id)}
                  onDiscard={(item) => discardOutboxOp(item.id)}
                />
              )
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={financeFilter === 'semua' ? 'wallet' : (activeMeta?.icon || 'wallet')}
                title={financeFilter === 'semua' ? 'Belum ada pengeluaran' : `Belum ada pengeluaran ${activeMeta?.label || financeFilter}`}
                message={financeFilter === 'semua' ? 'Catat pengeluaran lewat tombol Tambah.' : `Tidak ada transaksi kategori ${activeMeta?.label || financeFilter}. Pilih kategori lain, atau catat pengeluaran baru.`}
              />
            ) : (
              <HistoryTimeline
                items={filtered}
                formatCurrency={formatCurrency}
                onEdit={(it) => openEdit('expenses', it)}
                readOnly={!canWrite}
                tone="brand"
                categories={FINANCE_CATEGORIES}
                onRetry={(item) => retryOutboxOp(item.id)}
                onDiscard={(item) => discardOutboxOp(item.id)}
              />
            )}
          </section>
        );
      }

export default KeuanganSection;
