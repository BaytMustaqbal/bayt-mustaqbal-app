// Halaman Anggaran (sub-tab Keuangan) — pembagian 50/30/20 vs realisasi.
//
// Semua angka di sini TURUNAN dari `budget.income`, `budget.ratios`, dan daftar
// pengeluaran (lihat components/budget.js). Tidak ada angka anggaran yang
// disimpan, jadi tidak ada dua sumber yang bisa berbeda.

import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { DonutChart } from './charts';
import { Badge, Card, CTA_CLASS, ProgressBar, StatCard } from './ui';
import { BUCKETS } from './categories';
import { allocate, DEFAULT_RATIOS, getBudget, ratiosValid, summarize } from './budget';

// Warna irisan donat alokasi — memakai token chart yang sudah ada di App.css.
const BUCKET_COLOR = {
  needs: 'rgb(var(--chart1))',
  wants: 'rgb(var(--chart4))',
  savings: 'rgb(var(--chart5))',
};

// Status keranjang — selalu IKON + TEKS, jangan andalkan warna saja
// (aman ≤80%, hati-hati 80–100%, lebih >100%).
const STATUS_META = {
  aman: { label: 'Aman', icon: 'circleCheck', tone: 'green' },
  'hati-hati': { label: 'Hati-hati', icon: 'alertTriangle', tone: 'amber' },
  lebih: { label: 'Lebih', icon: 'trendingUp', tone: 'red' },
};

export function Budgeting({
  data,
  formatCurrency,
  formatCurrencyShort,
  onSaveBudget,
  onAddPos,
  onEditPos,
  onDeletePos,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ income: '', needs: '', wants: '', savings: '' });
  const [error, setError] = useState('');

  const budget = useMemo(() => getBudget(data), [data]);
  const alokasi = useMemo(() => allocate(budget.income, budget.ratios), [budget]);
  const ringkas = useMemo(() => summarize(data.expenses, budget), [data.expenses, budget]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const openEditor = () => {
    setDraft({
      income: String(budget.income),
      needs: String(budget.ratios.needs),
      wants: String(budget.ratios.wants),
      savings: String(budget.ratios.savings),
    });
    setError('');
    setEditing(true);
  };

  // Jumlah rasio yang sedang diketik — dipakai untuk pesan galat & petunjuk.
  // Kolom kosong dihitung 0 di sini; yang menentukan sah/tidak tetap
  // `ratiosValid(draft)` (kolom kosong ditolak, jadi "0" tidak lolos diam-diam).
  const totalRasio = ['needs', 'wants', 'savings'].reduce((sum, key) => sum + (Number(draft[key]) || 0), 0);

  const simpan = () => {
    const income = Number(draft.income);
    if (!Number.isFinite(income) || income < 0) {
      setError('Pemasukan harus 0 atau lebih.');
      return;
    }
    if (!ratiosValid(draft)) {
      setError(`Jumlah rasio harus 100% (sekarang ${totalRasio}%)`);
      return;
    }
    setError('');
    onSaveBudget({
      income,
      ratios: {
        needs: Number(draft.needs),
        wants: Number(draft.wants),
        savings: Number(draft.savings),
      },
    });
    setEditing(false);
  };

  const pakaiBawaan = () =>
    setDraft((prev) => ({
      ...prev,
      needs: String(DEFAULT_RATIOS.needs),
      wants: String(DEFAULT_RATIOS.wants),
      savings: String(DEFAULT_RATIOS.savings),
    }));

  const FIELD_CLASS =
    'min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 font-mono text-sm text-ink focus:border-brand focus:outline-none';

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Kartu pemasukan + editor gaji/rasio */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-mutedfg">
              Pemasukan {budget.month}
            </p>
            <p className="mt-1 font-mono text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {formatCurrency(budget.income)}
            </p>
            <p className="mt-1 text-xs leading-snug text-mutedfg sm:text-sm">
              Dibagi {budget.ratios.needs}% Kebutuhan · {budget.ratios.wants}% Keinginan ·{' '}
              {budget.ratios.savings}% Tabungan &amp; Utang
            </p>
          </div>
          <button
            type="button"
            onClick={openEditor}
            aria-expanded={editing}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-brandfg transition-colors hover:bg-brandtint"
          >
            <Icon name="edit" size={16} />
            Ubah
          </button>
        </div>

        {budget.income === 0 && !editing && (
          <p className="mt-3 rounded-xl border border-line bg-muted px-3 py-2 text-sm text-mutedfg">
            Isi pemasukan bulan ini supaya pembagian 50/30/20 bisa dihitung.
          </p>
        )}

        {editing && (
          <div className="mt-4 border-t border-line pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-mutedfg">
                  Pemasukan bulan ini (Rp)
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={draft.income}
                  onChange={(e) => setField('income', e.target.value)}
                  data-budget-input="income"
                  className={FIELD_CLASS}
                />
              </label>
              {BUCKETS.map((bucket) => (
                <label key={bucket.id} className="block">
                  <span className="mb-1 block text-xs font-medium text-mutedfg">
                    {bucket.label} (%)
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    inputMode="numeric"
                    value={draft[bucket.id]}
                    onChange={(e) => setField(bucket.id, e.target.value)}
                    data-budget-input={bucket.id}
                    className={FIELD_CLASS}
                  />
                </label>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={simpan} data-budget-action="save" className={CTA_CLASS}>
                Simpan
              </button>
              <button
                type="button"
                onClick={pakaiBawaan}
                data-budget-action="reset"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-brandfg transition-colors hover:bg-brandtint"
              >
                <Icon name="target" size={16} />
                Pakai 50/30/20
              </button>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setEditing(false);
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink"
              >
                Batal
              </button>
            </div>

            <p className="mt-2 text-xs text-mutedfg" aria-live="polite">
              Jumlah rasio saat ini: <span className="font-mono font-semibold">{totalRasio}%</span>{' '}
              — harus tepat 100%.
            </p>

            {error && (
              <p
                data-budget="error"
                className="mt-2 inline-flex items-start gap-2 rounded-xl border border-tonerose/40 bg-tonerose/10 px-3 py-2 text-sm text-tonerosefg"
              >
                <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Donat alokasi per keranjang — visualisasi pembagian 50/30/20 */}
      {budget.income > 0 && (
        <Card className="p-4 sm:p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-mutedfg">
            Alokasi per keranjang
          </p>
          <DonutChart
            data={BUCKETS.map((b) => ({
              label: b.label,
              value: alokasi[b.id],
              color: BUCKET_COLOR[b.id],
            }))}
            formatValue={formatCurrencyShort}
            centerLabel={budget.month}
          />
        </Card>
      )}

      {/* Tiga keranjang */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        {BUCKETS.map((bucket) => {
          const status = STATUS_META[ringkas.status[bucket.id]] || STATUS_META.aman;
          const realisasi = ringkas.realisasi[bucket.id];
          const target = alokasi[bucket.id];
          const selisih = ringkas.selisih[bucket.id];
          const persen =
            target > 0 ? Math.round((realisasi / target) * 100) : realisasi > 0 ? 100 : 0;
          const pos = budget.pos[bucket.id] || [];

          return (
            <Card key={bucket.id} className="flex h-full flex-col p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brandtint text-brandfg"
                  aria-hidden="true"
                >
                  <Icon name={bucket.icon} size={19} />
                </span>
                <Badge tone={status.tone}>
                  <span className="inline-flex items-center gap-1">
                    <Icon name={status.icon} size={13} />
                    {status.label}
                  </span>
                </Badge>
              </div>

              <p className="mt-3 text-sm font-semibold text-ink">{bucket.label}</p>

              <p className="mt-1 font-mono text-base font-bold tracking-tight text-ink">
                <span data-budget={`realisasi-${bucket.id}`}>{formatCurrency(realisasi)}</span>
                <span className="text-xs font-medium text-mutedfg sm:text-sm"> dari </span>
                <span data-budget={`alokasi-${bucket.id}`} className="text-mutedfg">
                  {formatCurrency(target)}
                </span>
              </p>

              <ProgressBar value={realisasi} max={target} className="mt-2" />
              <p className="mt-2 text-xs text-mutedfg">
                {persen}% terpakai · {ringkas.jumlah[bucket.id]} pengeluaran
              </p>
              <p
                data-budget={`selisih-${bucket.id}`}
                className={`mt-1 text-sm font-medium ${
                  selisih < 0 ? 'text-tonerosefg' : 'text-mutedfg'
                }`}
              >
                {selisih >= 0
                  ? `Sisa ${formatCurrency(selisih)}`
                  : `Lebih ${formatCurrency(-selisih)}`}
              </p>

              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mutedfg">
                  Pos saran
                </p>
                <ul className="space-y-1">
                  {pos.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-1">
                      <span className="flex min-w-0 items-start gap-2 text-sm text-mutedfg">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/60"
                          aria-hidden="true"
                        />
                        <span className="min-w-0">{item.label}</span>
                      </span>
                      {/* Tombol 44px seperti ItemActions, ditulis lokal karena baris
                          pos lebih rapat (bukan kartu) dan perlu penanda data-pos. */}
                      <span className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          data-pos="edit"
                          onClick={() => onEditPos(bucket.id, item)}
                          aria-label={`Ubah pos ${item.label}`}
                          className="grid h-11 w-11 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-brandtint hover:text-brandfg"
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          type="button"
                          data-pos="delete"
                          onClick={() => onDeletePos(bucket.id, item)}
                          aria-label={`Hapus pos ${item.label}`}
                          className="grid h-11 w-11 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-tonerose/15 hover:text-tonerosefg"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  data-pos="add"
                  onClick={() => onAddPos(bucket.id)}
                  className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-semibold text-brandfg transition-colors hover:bg-brandtint"
                >
                  <Icon name="plus" size={16} />
                  Tambah pos
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Ringkasan bulan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          icon="wallet"
          label="Alokasi bulan ini"
          value={formatCurrencyShort(ringkas.total.alokasi)}
          hint={`dari gaji ${formatCurrency(budget.income)}`}
          tone="blue"
        />
        <StatCard
          icon="trendingUp"
          label="Realisasi"
          value={formatCurrencyShort(ringkas.total.realisasi)}
          hint="pengeluaran yang sudah tercatat"
          tone="amber"
        />
        <StatCard
          icon="target"
          label={ringkas.total.selisih >= 0 ? 'Sisa anggaran' : 'Lebih dari anggaran'}
          value={formatCurrencyShort(Math.abs(ringkas.total.selisih))}
          hint={
            ringkas.total.selisih >= 0
              ? 'masih bisa dipakai sampai akhir bulan'
              : 'pengeluaran melebihi gaji bulan ini'
          }
          tone={ringkas.total.selisih >= 0 ? 'emerald' : 'rose'}
        />
      </div>
    </div>
  );
}
