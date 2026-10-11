import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatDate, formatDateTime, monthName, truncate, getCurrentMonthStart, getCurrentMonthEnd } from '../utils/helpers';

interface CalendarEvent {
  event_id: string;
  judul: string;
  kategori: string;
  kategori_icon: string;
  kategori_color: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai: string;
  jam_selesai: string;
  lokasi: string;
  deskripsi: string;
  biaya_rencana: number;
  all_day: string;
  selesai: string;
  formatted_mulai: string;
  formatted_selesai: string;
  duration_days: number;
  is_multi_day: boolean;
  is_past: boolean;
  is_today: boolean;
  is_upcoming: boolean;
  selesai_label: string;
  selesai_color: string;
  selesai_icon: string;
  prioritas: string;
  prioritas_icon: string;
  formatted_biaya: string;
}

export function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [byDate, setByDate] = useState<Record<string, CalendarEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({
    kategori: ['keluarga','liburan','rencana','kerja','spiritual','ultah'],
    startDate: getCurrentMonthStart(),
    endDate: getCurrentMonthEnd(),
    selesai: ''
  });
  const [addModal, setAddModal] = useState(false);

  useEffect(() => { loadEvents(); }, [view, currentDate, filters]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.call(`cal.list?startDate=${filters.startDate}&endDate=${filters.endDate}&selesai=${filters.selesai}`);
      const filtered = res.data?.data?.filter((e: CalendarEvent) => filters.kategori.includes(e.kategori)) || [];
      setEvents(filtered);
      // Group by date
      const grouped: Record<string, CalendarEvent[]> = {};
      filtered.forEach((e: CalendarEvent) => {
        const start = new Date(e.tanggal_mulai);
        const end = new Date(e.tanggal_selesai);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().split('T')[0];
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(e);
        }
      });
      setByDate(grouped);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddEvent = () => setAddModal(true);
  const handleCloseModal = () => setAddModal(false);

  const handleToggleDone = async (eventId: string, currentStatus: string) => {
    try {
      await api.call('cal.toggle_done', { event_id: eventId, selesai: currentStatus !== 'YA' });
      loadEvents();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (eventId: string, rev: string) => {
    if (!confirm('Hapus acara ini?')) return;
    try {
      await api.call(`cal.delete?event_id=${eventId}&rev=${rev}`, { method: 'DELETE' });
      loadEvents();
    } catch (err: any) { alert(err.message); }
  };

  if (loading) return <div className="loading-screen" style={{ position: 'relative', minHeight: '300px' }}><div className="loading-spinner"></div><div className="loading-text">Memuat...</div></div>;

  const today = new Date().toISOString().split('T')[0];
  const holidays = ['2026-01-01','2026-02-17','2026-03-29','2026-04-03','2026-05-01','2026-05-14','2026-05-25','2026-06-01','2026-07-30','2026-08-17','2026-09-05','2026-12-25'];

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthLabel = monthName(month) + ' ' + year;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return (
      <div>
        <div className="card mb-md">
          <div className="card-header">
            <h3 className="card-title" id="cal-month-title">{monthLabel}</h3>
            <div className="flex gap-xs">
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { currentDate.setMonth(currentDate.getMonth() - 1); loadEvents(); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { currentDate.setMonth(currentDate.getMonth() + 1); loadEvents(); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { currentDate = new Date(); loadEvents(); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg></button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="att-calendar-header">
              {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => <div key={d} className="att-calendar-day-header">{d}</div>)}
            </div>
            <div className="att-calendar-grid">
              {[...Array(firstDay)].map((_, i) => <div key={i} className="att-calendar-day empty"></div>)}
              {[...Array(daysInMonth)].map((_, d) => {
                const day = d + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const isHoliday = holidays.includes(dateStr);
                const isWeekend = [0, 6].includes(new Date(year, month, day).getDay());
                const dayEvents = byDate[dateStr] || [];
                let classes = 'att-calendar-day';
                if (isToday) classes += ' today';
                if (isHoliday) classes += ' holiday';
                if (isWeekend) classes += ' weekend';
                if (dayEvents.length > 0) classes += ' has-event';
                let chips = '';
                dayEvents.slice(0, 3).forEach(e => {
                  chips += `<span class="att-chip" style="background:${e.kategori_color}22; color:${e.kategori_color};" title="${e.judul}">${e.kategori_icon} ${truncate(e.judul, 15)}</span>`;
                });
                if (dayEvents.length > 3) chips += `<span class="att-chip more">+${dayEvents.length - 3}</span>`;
                return (
                  <div key={dateStr} className={classes} onClick={() => openDayEvents(dateStr)}>
                    <div className="att-day-number">{day}</div>
                    <div className="att-day-chips" dangerouslySetInnerHTML={{ __html: chips }} />
                    {isToday && <div className="att-today-ring"></div>}
                    {isHoliday && <div className="att-holiday-mark" title="Hari Libur">🎌</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    };

  const renderAgendaView = () => {
    if (!events.length) return <div className="empty-state" style={{ padding: '40px 20px', borderRadius: 0 }}>Tidak ada acara</div>;
    const sortedDates = Object.keys(byDate).sort();
    return (
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {sortedDates.map(date => {
            const dayEvents = byDate[date];
            const isToday = date === new Date().toISOString().split('T')[0];
            const isPast = date < today;
            return (
              <div key={date} style={{ borderBottom: '1px solid var(--border)', ...(isToday ? { background: 'var(--primary-light)' } : {}) }}>
                <div style={{ padding: '12px 16px', fontWeight: 600, ...(isToday ? { color: 'var(--primary)' } : {}) }}>
                  {formatDate(date)} {isToday && '<span class="badge badge-primary" style="font-size:10px;margin-left:8px;">HARI INI</span>'}
                </div>
                {dayEvents.map(e => (
                  <div key={e.event_id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${e.kategori_color}22`, color: e.kategori_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{e.kategori_icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm flex-wrap mb-xs">
                        <span style={{ fontWeight: 500, fontSize: '13px' }}>{e.judul}</span>
                        <span className="badge" style={{ background: `${e.kategori_color}22`, color: e.kategori_color, fontSize: '10px' }}>{e.kategori_icon} {e.kategori}</span>
                        {e.selesai === 'YA' ? '<span class="badge badge-success" style="font-size:10px;">✅ Selesai</span>' : '<span class="badge badge-warning" style="font-size:10px;">⏳ Belum</span>'}
                        {e.prioritas_icon && `<span class="badge" style="background:${e.prioritas_color}22; color:${e.prioritas_color}; font-size:10px;">${e.prioritas_icon} ${e.prioritas}</span>`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {e.jam_mulai ? '🕐 ' + e.jam_mulai + (e.jam_selesai ? ' - ' + e.jam_selesai : '') + ' • ' : ''}
                        {e.lokasi ? '📍 ' + e.lokasi + ' • ' : ''}
                        {e.biaya_rencana > 0 ? '💰 ' + e.formatted_biaya : ''}
                      </div>
                      {e.deskripsi && `<div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${e.deskripsi}</div>`}
                      <div className="flex flex-col items-end gap-xs" style={{ flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => toggleDone(e.event_id, e.selesai)}>{e.selesai === 'YA' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"></path></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg>'}</button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteEvent(e.event_id, e.rev)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    };

  return (
    <div>
      <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
        <div>
          <h1 className="card-title" style={{ margin: 0, fontSize: '22px' }}>Kalender</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Acara keluarga, liburan, & rencana</p>
        </div>
        <div className="flex gap-sm flex-wrap">
          <div className="tabs" role="tablist">
            <button role="tab" className={`tab ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>📅 Bulan</button>
            <button role="tab" className={`tab ${view === 'agenda' ? 'active' : ''}`} onClick={() => setView('agenda')}>📋 Agenda</button>
          </div>
          <button className="btn btn-primary" onClick={handleAddEvent}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Tambah Acara</button>
        </div>
      </div>

      <div className="card mb-md">
        <div className="card-body" style={{ padding: '0 16px 16px' }}>
          <div className="flex flex-wrap gap-sm" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Kategori</label>
              <select multiple value={filters.kategori} onChange={e => { const vals = Array.from(e.target.selectedOptions).map(o => o.value); setFilters({...filters, kategori: vals}); }}>
                <option value="keluarga" selected>👨‍👩‍👧 Keluarga</option>
                <option value="liburan" selected>✈️ Liburan</option>
                <option value="rencana" selected>📝 Rencana</option>
                <option value="kerja" selected>💼 Kerja</option>
                <option value="spiritual" selected>🕌 Spiritual</option>
                <option value="ultah" selected>🎂 Ulang Tahun</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
              <label>Dari</label>
              <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
              <label>Sampai</label>
              <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
              <label>Status</label>
              <select value={filters.selesai} onChange={e => setFilters({...filters, selesai: e.target.value})}>
                <option value="">Semua</option>
                <option value="TIDAK">Belum Selesai</option>
                <option value="YA">Selesai</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {view === 'month' ? renderMonthView() : renderAgendaView()}

      {/* Add Event Modal */}
      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header"><h3 className="modal-title">📝 Acara Baru</h3><button className="modal-close" onClick={handleCloseModal}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); const payload = Object.fromEntries(data); try { await api.call('cal.create', payload); handleCloseModal(); loadEvents(); } catch (err: any) { alert(err.message); } }}>
              <div className="modal-body">
                <div className="form-group"><label>Judul <span style="color:var(--danger)">*</span></label><input type="text" name="judul" maxLength="100" required placeholder="Judul acara"></div>
                <div className="form-row">
                  <div className="form-group"><label>Kategori <span style="color:var(--danger)">*</span></label><select name="kategori" required><option value="keluarga">👨‍👩‍👧 Keluarga</option><option value="liburan">✈️ Liburan</option><option value="rencana">📝 Rencana</option><option value="kerja">💼 Kerja</option><option value="spiritual">🕌 Spiritual</option><option value="ultah">🎂 Ulang Tahun</option></select></div>
                  <div className="form-group"><label>Prioritas</label><select name="prioritas"><option value="normal">🟡 Normal</option><option value="tinggi">🔴 Tinggi</option><option value="rendah">🟢 Rendah</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Tanggal Mulai <span style="color:var(--danger)">*</span></label><input type="date" name="tanggal_mulai" required></div>
                  <div className="form-group"><label>Tanggal Selesai</label><input type="date" name="tanggal_selesai"></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Jam Mulai</label><input type="time" name="jam_mulai"></div>
                  <div className="form-group"><label>Jam Selesai</label><input type="time" name="jam_selesai"></div>
                </div>
                <div className="form-group"><label>Lokasi</label><input type="text" name="lokasi" maxLength="100" placeholder="Tempat acara"></div>
                <div className="form-group"><label>Deskripsi</label><textarea name="deskripsi" rows="3" maxLength="500" placeholder="Detail acara..."></textarea></div>
                <div className="form-row">
                  <div className="form-group"><label>Biaya Rencana</label><input type="number" name="biaya_rencana" min="0" step="1000" placeholder="0"></div>
                  <div className="form-group"><label className="checkbox-label"><input type="checkbox" name="all_day" value="YA" defaultChecked><span>Sepanjang hari</span></label></div>
                </div>
                <div className="form-group"><label>Pengingat (hari sebelum)</label><input type="number" name="reminder_hari" min="0" max="30" defaultValue="1"></div>
              </form>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setAddModal(false)}>Batal</button><button className="btn btn-primary" type="submit">Simpan</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPage;