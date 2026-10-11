import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatRupiah, formatDate, formatPercent, getCurrentPeriod } from '../utils/helpers';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, ArcElement, PointElement, Title, Tooltip, Legend, Filler);

interface ReviewData {
  total_income: number;
  total_expense: number;
  net: number;
  by_category: Array<{
    kategori_id: string;
    nama: string;
    warna: string;
    budget: number;
    total: number;
    count: number;
    sisa: number;
    persen: number;
    status: string;
    color: string;
    icon: string;
  }>;
  by_scope: Record<string, { total: number; count: number; icon: string; color: string }>;
  by_method: Record<string, { total: number; count: number; icon: string }>;
  top5_expense: Array<{ txn_id: string; tanggal: string; kategori: string; jumlah: number; keterangan: string; formatted: string }>;
  busiest_day: { date: string; total: number; formatted: string };
  prediction: {
    avg_daily: number;
    remaining_days: number;
    predicted_total: number;
    total_budget: number;
    will_over_budget: boolean;
    daily_budget_left: number;
  };
}

export function ReviewPage() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState(getCurrentPeriod());

  useEffect(() => {
    loadReview();
  }, [periode]);

  const loadReview = async () => {
    setLoading(true);
    try {
      const res = await api.call(`review.monthly?periode=${periode}`);
      setData(res);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCompare = async () => {
    try {
      const res = await api.call(`review.compare?periode=${periode}`);
      // Show modal with comparison
      alert('Fitur bandingkan belum diimplementasikan');
    } catch (err: any) { alert(err.message); }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ position: 'relative', minHeight: '300px' }}>
        <div className="loading-spinner"></div>
        <div className="loading-text">Memuat analisis...</div>
      </div>
    );
  }

  if (!data) return null;

  const netColor = data.net >= 0 ? 'var(--success)' : 'var(--danger)';
  const willOver = data.prediction?.will_over_budget;

  return (
    <div>
      <div className="flex justify-between items-center mb-md">
        <div>
          <h1 className="card-title" style={{ margin: 0, fontSize: '22px' }}>Review Keuangan</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Analisis {new Date(periode + '-01').toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-sm">
          <input type="month" value={periode} onChange={e => setPeriode(e.target.value)} className="form-select" style={{ width: 'auto', padding: '8px 12px' }} />
          <button className="btn btn-secondary btn-sm" onClick={handleCompare}>Bandingkan</button>
        </div>
      </div>

      <div className="stats-grid mb-md">
        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm">
            <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>📈</div>
            <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>IN</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{formatRupiah(data.total_income)}</div>
          <div className="stat-label">Pemasukan</div>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm">
            <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>📉</div>
            <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>OUT</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatRupiah(data.total_expense)}</div>
          <div className="stat-label">Pengeluaran</div>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm">
            <div className="stat-icon" style={{ background: `${netColor}22`, color: netColor }}>💰</div>
            <span className="badge" style={{ fontSize: '10px', padding: '2px 6px', background: `${netColor}22`, color: netColor }}>{data.net >= 0 ? 'SURPLUS' : 'DEFISIT'}</span>
          </div>
          <div className="stat-value" style={{ color: netColor }}>{formatRupiah(data.net)}</div>
          <div className="stat-label">Selisih</div>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm">
            <div className="stat-icon" style={{ background: willOver ? 'var(--danger-light)' : 'var(--success-light)', color: willOver ? 'var(--danger)' : 'var(--success)' }}>📅</div>
            <span className="badge" style={{ fontSize: '10px', padding: '2px 6px', background: willOver ? 'var(--danger-light)' : 'var(--success-light)', color: willOver ? 'var(--danger)' : 'var(--success)' }}>
              {willOver ? 'OVER BUDGET' : 'AMAN'}
            </span>
          </div>
          <div className="stat-value" style={{ color: willOver ? 'var(--danger)' : 'var(--success)' }}>{formatRupiah(data.prediction?.daily_budget_left || 0)}</div>
          <div className="stat-label">Budget Harian</div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>{data.prediction?.remaining_days || 0} hari tersisa</div>
        </div>
      </div>

      <div className="flex gap-md mb-md" style={{ flexWrap: 'wrap' }}>
        <div className="card flex-1" style={{ minWidth: '320px', maxWidth: '500px' }}>
          <div className="card-header"><h3 className="card-title">Komposisi Pengeluaran</h3></div>
          <div className="card-body" style={{ height: '280px', padding: '16px' }}>
            <Doughnut
              data={{
                labels: data.by_category?.map(c => c.nama) || [],
                datasets: [{
                  data: data.by_category?.map(c => c.total) || [],
                  backgroundColor: data.by_category?.map(c => c.warna + 'CC') || [],
                  borderColor: data.by_category?.map(c => c.warna) || [],
                  borderWidth: 2
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { position: 'right', labels: { color: '#8b95a5', font: { size: 12 } } } }
              }}
            />
          </div>
        </div>

        <div className="card flex-1" style={{ minWidth: '320px', maxWidth: '500px' }}>
          <div className="card-header"><h3 className="card-title">Budget vs Realisasi</h3></div>
          <div className="card-body" style={{ height: '280px', padding: '16px' }}>
            <Bar
              data={{
                labels: data.by_category?.map(c => c.nama) || [],
                datasets: [
                  { label: 'Budget', data: data.by_category?.map(c => c.budget) || [], backgroundColor: '#2f81f7CC', borderColor: '#2f81f7' },
                  { label: 'Realisasi', data: data.by_category?.map(c => c.total) || [], backgroundColor: '#f85149CC', borderColor: '#f85149' }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': Rp ' + new Intl.NumberFormat('id-ID').format(ctx.parsed.x) } } },
                scales: { x: { ticks: { callback: v => 'Rp ' + new Intl.NumberFormat('id-ID').format(v) } } }
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-md mb-md" style={{ flexWrap: 'wrap' }}>
        <div className="card flex-1" style={{ minWidth: '320px' }}>
          <div className="card-header"><h3 className="card-title">Tren 12 Bulan</h3></div>
          <div className="card-body" style={{ height: '280px', padding: '16px' }}>
            <Line
              data={{
                labels: [], // Would need to call review.trend endpoint
                datasets: [
                  { label: 'Pemasukan', data: [], borderColor: '#3fb950', backgroundColor: '#3fb95033', fill: true, tension: 0.3 },
                  { label: 'Pengeluaran', data: [], borderColor: '#f85149', backgroundColor: '#f8514933', fill: true, tension: 0.3 },
                  { label: 'Selisih', data: [], borderColor: '#2f81f7', backgroundColor: '#2f81f733', fill: true, tension: 0.3, borderDash: [5, 5] }
                ]
              }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
            />
          </div>
        </div>

        <div className="card flex-1" style={{ minWidth: '320px' }}>
          <div className="card-header"><h3 className="card-title">Top 5 Pengeluaran</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.top5_expense?.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {data.top5_expense.map((t, i) => (
                  <div key={t.txn_id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-sm">
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{i + 1}</span>
                        <span style="font-weight: 500;">{t.kategori}</span>
                      </div>
                      <span style="font-weight: 600; color: var(--danger)">{t.formatted}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">{formatDate(t.tanggal)} • {t.keterangan || '-'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px', borderRadius: 0 }}>Belum ada pengeluaran</div>
            )}
          </div>
        </div>
      </div>

      <div className="card mb-md">
        <div className="card-header"><h3 className="card-title">Detail per Kategori</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead><tr><th>Kategori</th><th>Budget</th><th>Realisasi</th><th>Sisa</th><th>%</th><th>Status</th></tr></thead>
              <tbody>
                {data.by_category?.map(cat => {
                  const pct = Math.min(100, cat.persen);
                  return (
                    <tr key={cat.nama}>
                      <td><span className="chip" style={{ background: `${cat.warna}22`, color: cat.warna }}>{cat.icon || '📁'} {cat.nama}</span></td>
                      <td>{formatRupiah(cat.budget)}</td>
                      <td style={{ fontWeight: 600 }}>{formatRupiah(cat.total)}</td>
                      <td style={{ color: cat.sisa >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatRupiah(cat.sisa)}</td>
                      <td><span className="progress" style={{ width: '100px', height: '6px' }}><span className="progress-bar" style={{ width: `${pct}%`, background: cat.color }}></span></span> {pct}%</td>
                      <td><span className="badge" style={{ background: `${cat.color}22`, color: cat.color }}>{cat.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Prediksi Akhir Bulan</h3></div>
        <div className="card-body">
          <div className="flex flex-wrap gap-md items-center" style={{ alignItems: 'center' }}>
            <div className="flex-1">
              <div className="flex items-center gap-sm mb-sm">
                <span style="font-size: 24px;">{willOver ? '🔴' : '🟢'}</div>
                <div>
                  <div style="font-size: 16px; fontWeight: 700; color: {willOver ? 'var(--danger)' : 'var(--success)'}">{willOver ? 'Prediksi OVER BUDGET' : 'Prediksi dalam budget'}</div>
                  <div style="font-size: 12px; color: var(--text-muted)">Rata-rata harian: {formatRupiah(data.prediction?.avg_daily || 0)} • Sisa hari: {data.prediction?.remaining_days || 0}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
              <div className="stat-card" style={{ minWidth: '140px' }}>
                <div className="stat-label">Total Budget</div>
                <div className="stat-value">{formatRupiah(data.prediction?.total_budget || 0)}</div>
              </div>
              <div className="stat-card" style={{ minWidth: '140px' }}>
                <div className="stat-label">Prediksi Total</div>
                <div className="stat-value" style={{ color: willOver ? 'var(--danger)' : 'var(--success)' }}>{formatRupiah(data.prediction?.predicted_total || 0)}</div>
              </div>
              <div className="stat-card" style={{ minWidth: '140px' }}>
                <div className="stat-label">Budget Harian</div>
                <div className="stat-value">{formatRupiah(data.prediction?.daily_budget_left || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewPage;