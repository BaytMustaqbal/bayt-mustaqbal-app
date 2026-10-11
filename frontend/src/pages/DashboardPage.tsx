import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatRupiah, formatDate } from '../utils/helpers';

interface DashboardData {
  total_saldo: number;
  total_income: number;
  total_expense: number;
  accounts: Array<{
    nama: string;
    saldo: number;
    tipe: string;
    icon: string;
  }>;
  budget_categories: Array<{
    nama: string;
    budget: number;
    realisasi: number;
    sisa: number;
    persen: number;
    color: string;
    icon: string;
    warna_kategori: string;
  }>;
  late_bills: Array<{
    nama: string;
    jumlah: number;
    jatuh_tempo: string;
    days_late: number;
    icon: string;
  }>;
  upcoming_bills: Array<{
    nama: string;
    jumlah: number;
    jatuh_tempo: string;
    days_left: number;
    icon: string;
  }>;
  events: Array<{
    judul: string;
    kategori: string;
    tanggal_mulai: string;
    icon: string;
  }>;
  attendance_today: {
    status: string;
    label: string;
    color: string;
    icon: string;
  };
  cuti_quota: {
    used: number;
    total: number;
    sisa: number;
    status: { label: string; color: string; icon: string };
  };
  service_due: Array<{
    nama: string;
    grup: string;
    days_left: number;
    color: string;
    icon: string;
  }>;
  user_nama: string;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await api.call('dash.summary');
        setData(res);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen" style={{ position: 'relative', minHeight: '300px' }}>
        <div className="loading-spinner"></div>
        <div className="loading-text">Memuat dashboard...</div>
      </div>
    );
  }

  if (!data) return null;

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-lg">
        <div>
          <h1 className="card-title" style={{ margin: 0, fontSize: '22px' }}>Dashboard</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            {data.user_nama} • {today}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid mb-lg">
        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm">
            <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>💰</div>
            <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>SALDO</span>
          </div>
          <div className="stat-value" style={{ color: data.total_saldo >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatRupiah(data.total_saldo)}
          </div>
          <div className="stat-label">Total Saldo</div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            {data.accounts?.map(a => `${a.nama}: ${formatRupiah(a.saldo)}`).join(' | ')}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm">
            <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>📈</div>
            <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }} >IN</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{formatRupiah(data.total_income)}</div>
          <div className="stat-label">Pemasukan</div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }>{data.accounts?.length || 0} rekening</div>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm">
            <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>📉</div>
            <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>OUT</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatRupiah(data.total_expense)}</div>
          <div className="stat-label">Pengeluaran</div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>Bulan ini</div>
        </div>

        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm">
            <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>📅</div>
            <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px' }}>HARIAN</span>
          </div>
          <div className="stat-value" style={{ color: data.daily_budget >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatRupiah(data.daily_budget)}</div>
          <div className="stat-label">Sisa Budget Harian</div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>{data.remaining_days} hari tersisa</div>
        </div>
      </div>

      {/* Row 1: Budget + Bills */}
      <div className="flex gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
        <div className="card flex-1" style={{ minWidth: '320px' }}>
          <div className="card-header">
            <h3 className="card-title">Budget vs Realisasi</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.budget_categories?.map(cat => (
              <div key={cat.nama} className="form-group" style={{ padding: '12px 16px', margin: 0, borderBottom: '1px solid var(--border)' }}>
                <div className="flex justify-between mb-xs">
                  <div className="flex items-center gap-sm">
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: cat.warna_kategori || cat.color }}></span>
                    <span style={{ fontWeight: 500, fontSize: '13px' }}>{cat.nama}</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: cat.color }}>{cat.persen}%</span>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${Math.min(100, cat.persen)}%`, background: cat.color }}></div>
                </div>
                <div className="flex justify-between mt-xs" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Realisasi: {formatRupiah(cat.realisasi)}</span>
                  <span>Sisa: {formatRupiah(cat.sisa)}</span>
                </div>
              </div>
            )) || (
              <div className="empty-state" style={{ padding: '24px', borderRadius: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                </svg>
                <h3 style="font-size: 14px; margin: 8px 0 4px">Belum ada budget</h3>
                <p style="font-size: 12px">Tambah budget di kategori pengeluaran</p>
              </div>
            )}
          </div>
        </div>

        <div className="card flex-1" style={{ minWidth: '320px', maxWidth: '400px' }}>
          <div className="card-header">
            <h3 className="card-title">Tagihan</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {(() => {
              let html = '';
              const groups = [
                { key: 'terlambat', label: '🔴 TERLAMBAT', color: 'var(--danger)', icon: '🔴', items: data.late_bills },
                { key: 'minggu_ini', label: '🟡 MINGGU INI', color: 'var(--warning)', icon: '🟡', items: data.upcoming_bills },
                { key: 'bulan_ini', label: '📆 BULAN INI', color: 'var(--primary)', icon: '📆', items: data.upcoming_bills.filter(b => b.days_left > 7 && b.days_left <= 30) }
              ];

              groups.forEach(g => {
                if (g.items.length === 0) return;
                html += `
                  <div style="border-bottom: 1px solid var(--border);">
                    <div style="padding: 10px 16px; background: ${g.color}15; font-weight: 600; color: ${g.color}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border);">
                      ${g.icon} ${g.label} (${g.items.length})
                    </div>
                  </div>
                `;
                g.items.forEach(b => {
                  const daysText = g.key === 'terlambat' ? `${b.days_late} hari terlambat` : b.days_left === 0 ? 'Hari ini' : `${b.days_left} hari lagi`;
                  const color = g.key === 'terlambat' ? 'var(--danger)' : 'var(--warning)';
                  html += `
                    <div style="padding: 12px 16px; border-bottom: 1px solid var(--border);">
                      <div class="flex justify-between items-start mb-xs">
                        <div class="flex items-center gap-sm">
                          <span>${b.icon || '📄'}</span>
                          <span style="font-weight: 500; font-size: 13px;">${b.nama}</span>
                        </div>
                        <span style="font-size: 14px; font-weight: 600; color: ${color}; white-space: nowrap;">${formatRupiah(b.jumlah)}</span>
                      </div>
                      <div class="flex justify-between" style="font-size: 11px; color: var(--text-muted);">
                        <span>Tempo: ${formatDate(b.jatuh_tempo)}</span>
                        <span style="color: ${color}; font-weight: 500;">${daysText}</span>
                      </div>
                    </div>
                  `;
                });
              });
              return <div dangerouslySetInnerHTML={{ __html: html }} />;
            })()}
          </div>
        </div>
      </div>

      {/* Row 2: Agenda + Absensi + Service */}
      <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
        <div className="card flex-1" style={{ minWidth: '300px' }}>
          <div className="card-header">
            <h3 className="card-title">Agenda 7 Hari</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.events?.length > 0 ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {data.events.map(e => (
                  <div key={e.judul} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-start mb-xs">
                      <div className="flex items-center gap-sm">
                        <span>{e.icon || '📅'}</span>
                        <span style={{ fontWeight: 500, fontSize: '13px' }}>{e.judul}</span>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: '10px' }}>{e.kategori}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(e.tanggal_mulai)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px', borderRadius: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
                <h3 style="font-size: 14px; margin: 8px 0 4px">Tidak ada agenda</h3>
              </div>
            )}
          </div>
        </div>

        <div className="card flex-1" style={{ minWidth: '280px', maxWidth: '350px' }}>
          <div className="card-header">
            <h3 className="card-title">Absensi Hari Ini</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: `${data.attendance_today.color}22`,
                border: `3px solid ${data.attendance_today.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '36px'
              }}>
                {data.attendance_today.icon}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                {data.attendance_today.label}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                {data.attendance_today.status === 'belum' ? 'Klik untuk isi absensi' : 'Status hari ini'}
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div className="flex gap-md">
                <div className="flex-1" style={{ textAlign: 'center', padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: data.cuti_quota.status.color }}>{data.cuti_quota.sisa}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sisa Cuti</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{data.cuti_quota.used}/{data.cuti_quota.total}</div>
                </div>
                <div className="flex-1" style={{ textAlign: 'center', padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>{data.izin_quota.sisa}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sisa Izin</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{data.izin_quota.used}/{data.izin_quota.total}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card flex-1" style={{ minWidth: '280px' }}>
          <div className="card-header">
            <h3 className="card-title">Service Mendatang</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data.service_due?.length > 0 ? (
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {data.service_due.map(s => (
                  <div key={s.nama} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-start mb-xs">
                      <div className="flex items-center gap-sm">
                        <span>{s.grup_icon || '🔧'}</span>
                        <span style={{ fontWeight: 500, fontSize: '13px' }}>{s.nama}</span>
                      </div>
                      <span className="badge" style={{ background: `${s.color}22`, color: s.color, fontSize: '10px' }}>{s.status}</span>
                    </div>
                    <div className="flex justify-between" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Terakhir: {formatDate(s.last_service)}</span>
                      <span>{s.days_left <= 0 ? 'OVERDUE' : s.days_left + ' hari'} • {s.km_left <= 0 ? 'OVERDUE' : s.km_left + ' km'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px', borderRadius: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
                <h3 style="font-size: 14px; margin: 8px 0 4px">Semua aman</h3>
                <p style="font-size: 12px">Tidak ada service mendatang 30 hari</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;