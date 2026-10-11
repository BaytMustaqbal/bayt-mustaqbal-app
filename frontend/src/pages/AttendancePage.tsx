import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatDate, monthName, getToday } from '../utils/helpers';

interface AttendanceData {
  grid: Array<{
    date: string;
    day: number;
    is_holiday: boolean;
    is_weekend: boolean;
    attendances: Array<{
      att_id: string;
      nama: string;
      status: string;
      label: string;
      color: string;
      icon: string;
      terjadwal: string;
    }>;
  }>;
  quota: {
    cuti: { total: number; used: number; sisa: number; status: { label: string; color: string; icon: string } };
    izin: { total: number; used: number; sisa: number };
    sakit: { used: number };
    hadir: number;
  };
  list: Array<{
    att_id: string;
    tanggal: string;
    formatted_tanggal: string;
    status: string;
    label: string;
    color: string;
    icon: string;
    alasan: string;
    dari_jam: string;
    sampai_jam: string;
    catatan: string;
  }>;
  month_label: string;
}

export function AttendancePage() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => { loadCalendar(); }, [year, month]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const res = await api.call(`att.calendar?tahun=${year}&bulan=${month}`);
      setData(res);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleQuickAbsen = async (status: string) => {
    try {
      await api.call('att.upsert', { tanggal: getToday(), status, catatan: 'Input cepat via dashboard' });
      loadCalendar();
    } catch (err: any) { alert(err.message); }
  };

  const handleAbsen = async (date: string, status: string) => {
    const alasan = status === 'izin' || status === 'cuti' || status === 'sakit' 
      ? prompt(`Alasan ${status}:`) : '';
    if ((status === 'izin' || status === 'cuti' || status === 'sakit') && !alasan) return;
    try {
      await api.call('att.upsert', { tanggal: date, status, alasan });
      loadCalendar();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (attId: string) => {
    if (!confirm('Hapus absensi ini?')) return;
    try {
      await api.call(`att.delete?att_id=${attId}&rev=1`, { method: 'DELETE' });
      loadCalendar();
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return <div className="loading-screen" style={{ position: 'relative', minHeight: '300px' }}><div className="loading-spinner"></div><div className="loading-text">Memuat...</div></div>;
  if (!data) return null;

  const today = getToday();
  const holidays = ['2026-01-01','2026-02-17','2026-03-29','2026-04-03','2026-05-01','2026-05-14','2026-05-25','2026-06-01','2026-07-30','2026-08-17','2026-09-05','2026-12-25'];

  return (
    <div>
      <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
        <div>
          <h1 className="card-title" style={{ margin: 0, fontSize: '22px' }}>Absensi</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Kelola kehadiran, cuti, izin & sakit</p>
        </div>
        <div className="flex gap-sm flex-wrap">
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 'auto', padding: '8px 12px' }}>
            {[year-2, year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ width: 'auto', padding: '8px 12px' }}>
            {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => handleQuickAbsen('hadir')}>✅ Hadir Sekarang</button>
        </div>
      </div>

      <div className="stats-grid mb-md">
        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm">
            <div className="stat-icon" style={{ background: data.cuti.status.color + '22', color: data.cuti.status.color }}>🏖️</div>
          </div>
          <div className="stat-value" style={{ color: data.cuti.status.color }}>{data.cuti.sisa}</div>
          <div className="stat-label">Sisa Cuti</div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>Dipakai {data.cuti.used} dari {data.cuti.total}</div>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm"><div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>📝</div></div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{data.izin.sisa}</div>
          <div className="stat-label">Sisa Izin</div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>Dipakai {data.izin.used} dari {data.izin.total}</div>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm"><div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>🤒</div></div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{data.sakit.used}</div>
          <div className="stat-label">Sakit</div>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-sm"><div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>✅</div></div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{data.hadir}</div>
          <div className="stat-label">Hadir</div>
        </div>
      </div>

      <div className="card mb-md">
        <div className="card-header">
          <h3 className="card-title" id="calendar-title">{data.month_label}</h3>
          <div className="flex gap-xs">
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { month--; if (month < 1) { month = 12; year--; } loadCalendar(); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { month++; if (month > 12) { month = 1; year++; } loadCalendar(); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="att-calendar-header">
            {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => <div key={d} className="att-calendar-day-header">{d}</div>)}
          </div>
          <div className="att-calendar-grid">
            {data.grid.map(day => {
              const isToday = day.date === getToday();
              const isHoliday = day.is_holiday;
              const isWeekend = day.is_weekend;
              const hasAtt = day.attendances.length > 0;
              let classes = 'att-calendar-day';
              if (isToday) classes += ' today';
              if (isHoliday) classes += ' holiday';
              if (isWeekend) classes += ' weekend';
              if (hasAtt) classes += ' has-att';
              let chips = '';
              day.attendances.forEach(a => {
                chips += `<span class="att-chip" style="background:${a.color}22; color:${a.color};" title="${a.nama}: ${a.label}${a.terjadwal === 'YA' ? ' (Terjadwal)' : ''}">${a.icon} ${a.status === 'hadir' ? '' : a.status}</span>`;
              });
              return (
                <div key={day.date} className={classes} onClick={() => { if (!hasAtt) handleAbsen(day.date, 'hadir'); }}>
                  <div className="att-day-number">{day.day}</div>
                  <div className="att-day-chips" dangerouslySetInnerHTML={{ __html: chips }} />
                  {isToday && <div className="att-today-ring"></div>}
                  {isHoliday && <div className="att-holiday-mark" title="Hari Libur">🎌</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card mt-md">
        <div className="card-header"><h3 className="card-title">Daftar Absensi Bulan Ini</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          {data.list.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px', borderRadius: 0 }}>Belum ada absensi bulan ini</div>
          ) : (
            <div className="table-container">
              <table><thead><tr><th>Tanggal</th><th>Status</th><th>Alasan</th><th>Jam</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>
                {data.list.map(row => (
                  <tr key={row.att_id}>
                    <td>{row.formatted_tanggal}</td>
                    <td><span className="badge" style={{ background: `${row.status_color}22`, color: row.status_color }}>{row.status_icon} {row.status_label}</span></td>
                    <td>{row.alasan || '-'}</td>
                    <td>{row.dari_jam || '-'}{row.sampai_jam ? ' - ' + row.sampai_jam : ''}</td>
                    <td>{row.catatan || '-'}</td>
                    <td><div className="flex gap-xs"><button className="btn btn-ghost btn-sm btn-icon" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><line x1="18.5" y1="2.5" x2="21" y2="5"></line><line x1="15" y1="5" x2="9" y2="11"></line></svg></button><button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(row.att_id)} title="Hapus"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div></td>
                  </tr>
                ))}
              </tbody></table></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendancePage;