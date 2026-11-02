import React from 'react';
import { Icon } from './Icon';
import { SectionHeader, EmptyState, Badge, ProgressBar, CTA_CLASS } from './ui';

const BUCKET_LABEL = { needs: 'Kebutuhan', wants: 'Keinginan', savings: 'Tabungan' };
const BUCKET_ICON = { needs: 'home', wants: 'sparkles', savings: 'trendingUp' };

export function InsightComp({ insight, budget, goals = [], formatCurrency, formatCurrencyShort }) {
  const income = budget?.income || 0;
  const sisa = income - (insight?.totalExpense || 0);

  return (
    <section className="app-fade-in">
      <SectionHeader
        icon="barChart"
        title="Wawasan"
        subtitle="Pola keuangan & saran keluarga"
      />

      {!insight ? (
        <EmptyState icon="barChart" title="Belum ada data" message="Tambahkan pengeluaran/pemasukan untuk melihat wawasan." />
      ) : (
        <div className="space-y-4">
          {/* Ringkasan bulan ini */}
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <Icon name="wallet" size={18} className="text-brandfg" />
              <h2 className="text-sm font-bold text-ink">Pengeluaran {insight.month}</h2>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold text-ink">
              {formatCurrency(insight.totalExpense)}
            </p>
            {insight.changePct != null && (
              <p className="mt-1 text-xs text-mutedfg">
                {insight.changePct >= 0 ? 'Naik' : 'Turun'}{' '}
                <span className={`font-semibold ${insight.changePct >= 0 ? 'text-tonerosefg' : 'text-toneemeraldfg'}`}>
                  {Math.abs(insight.changePct)}%
                </span>{' '}
                dibanding bulan lalu (Rp {formatCurrencyShort(insight.prevTotalExpense)})
              </p>
            )}
          </div>

          {/* Bucket realisasi vs anggaran */}
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Realisasi Anggaran</h2>
            <div className="space-y-3">
              {insight.buckets.map((b) => {
                const over = b.pct > 100;
                const warn = !over && b.pct >= 80;
                return (
                  <div key={b.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-mutedfg">
                        <Icon name={BUCKET_ICON[b.id]} size={13} />
                        {BUCKET_LABEL[b.id]}
                      </span>
                      <span className={`font-mono font-semibold ${over ? 'text-tonerosefg' : warn ? 'text-toneamberfg' : 'text-brandfg'}`}>
                        {b.pct}% · Rp {formatCurrencyShort(b.realisasi)}
                      </span>
                    </div>
                    <ProgressBar value={b.realisasi} max={b.alokasi || 1} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kategori dominan */}
          {insight.topCategories.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">Kategori Dominan</h2>
              <ul className="divide-y divide-line">
                {insight.topCategories.map((c) => (
                  <li key={c.category} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm font-medium text-ink">{c.label}</span>
                    <span className="font-mono text-sm font-semibold text-brandfg">{formatCurrency(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Anomali */}
          {insight.anomalies.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
                <Icon name="alertTriangle" size={16} className="text-toneamberfg" />
                Transaksi Tidak Biasa
              </h2>
              <ul className="divide-y divide-line">
                {insight.anomalies.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{a.description || a.category}</p>
                      <p className="text-[11px] text-mutedfg">{a.date}</p>
                    </div>
                    <span className="font-mono text-sm font-bold text-tonerosefg">{formatCurrency(a.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Proyeksi tabungan */}
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Proyeksi Tabungan</h2>
            {goals.length === 0 ? (
              <p className="text-xs text-mutedfg">Belum ada target tabungan.</p>
            ) : sisa <= 0 ? (
              <p className="text-xs text-mutedfg">
                Pengeluaran bulan ini sudah melebihi pemasukan. Belum ada sisa untuk menabung.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {goals.map((g) => {
                  const target = Number(g.targetAmount) || 0;
                  const cur = Number(g.currentAmount) || 0;
                  const remain = Math.max(target - cur, 0);
                  const months = remain > 0 ? Math.ceil(remain / sisa) : 0;
                  return (
                    <li key={g.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-ink">{g.nama}</span>
                        <span className="text-xs text-mutedfg">
                          {formatCurrencyShort(cur)} / {formatCurrencyShort(target)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-mutedfg">
                        {remain === 0
                          ? 'Tercapai ✅'
                          : `Sisa ${formatCurrencyShort(remain)} — ±${months} bulan (sisihkan ${formatCurrencyShort(sisa)}/bln)`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default InsightComp;
