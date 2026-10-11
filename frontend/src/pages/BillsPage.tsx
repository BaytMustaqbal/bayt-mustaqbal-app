import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatRupiah, formatDate, getToday, getTomorrow } from '../utils/helpers';

interface Bill {
  bill_id: string;
  nama: string;
  tipe: string;
  tipe_icon: string;
  jumlah: number;
  formatted_jumlah: string;
  jatuh_tempo: string;
  formatted_jatuh_tempo: string;
  days_left: number;
  is_late: boolean;
  status: string;
  status_label: string;
  status_color: string;
  status_icon: string;
  estimasi: string;
  estimasi_label: string;
  estimasi_color: string;
  prioritas: string;
  prioritas_icon: string;
  prioritas_color: string;
  remind_at: string;
  remind_at_formatted: string;
  remind_channel: string;
  remind_sent: string;
}

export function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [grouped, setGrouped] = useState<any>({});
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [payModal, setPayModal] = useState<{ open: boolean; bill?: Bill }>({ open: false });

  useEffect(() => { loadBills(); }, []);

  const loadBills = async () => {
    setLoading(true);
    try {
      const res = await api.call('bill.list');
      setBills(res.data?.all || []);
      setGrouped(res.data?.grouped || {});
      setSummary(res.data?.summary || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePay = (bill: Bill) => setPayModal({ open: true, bill });
  const handleClosePay = () => setPayModal({ open: false });
  const handleGenerate = async () => {
    try { await api.call('bill.generate', { force: true }); loadBills(); } catch (err: any) { alert(err.message); }
  };

  const handlePaySubmit = async (data: any) => {
    try { await api.call('bill.pay', data); handleClosePay(); loadBills(); } catch (err: any) { alert(err.message); }
  };

  const renderBillRow = (bill: Bill) => {
    const isLate = bill.is_late;
    const daysText = isLate ? `${bill.days_late} hari terlambat` : bill.days_left === 0 ? 'Hari ini' : `${bill.days_left} hari lagi`;
    const color = isLate ? 'var(--danger)' : bill.status === 'lunas' ? 'var(--success)' : 'var(--warning)';
    const canPay = bill.status === 'belum';

    return (
      <div key={bill.bill_id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex justify-between items-start mb-xs">
          <div className="flex items-center gap-sm flex-1 min-w-0">
            <span>{bill.tipe_icon || '📄'}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-sm flex-wrap">
                <span style={{ fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.nama}</span>
                {bill.estimasi === 'YA' && <span className="badge badge-warning" style={{ fontSize: '10px' }}>Estimasi</span>}
                {bill.remind_at && <span className="badge badge-info" style={{ fontSize: '10px' }}>🔔 {formatDateTime(bill.remind_at)}</span>}
                <span className="badge" style={{ background: `${bill.prioritas_color}22`, color: bill.prioritas_color, fontSize: '10px' }}>{bill.prioritas_icon} {bill.prioritas}</span>
              </div>
              {bill.kategori_nama && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{bill.kategori_nama}</div>}
            </div>
          </div>
          <div className="flex items-center gap-sm" style={{ flexShrink: 0 }}>
            <span style={{ fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: color, whiteSpace: 'nowrap' }}>{formatRupiah(bill.jumlah)}</span>
            <span className="badge" style={{ background: `${color}22`, color, fontSize: '10px' }}>{bill.status_icon} {bill.status_label}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-between items-center gap-sm mt-xs" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Tempo: {formatDate(bill.jatuh_tempo)}</span>
          <span style={{ color, fontWeight: 500 }}>{daysText}</span>
          <div className="flex gap-xs">
            {canPay && <button className="btn btn-primary btn-sm" onClick={() => handlePay(bill)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Bayar</button>}
            <button className="btn btn-ghost btn-sm btn-icon" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><line x1="18.5" y1="2.5" x2="21" y2="5"></line><line x1="15" y1="5" x2="9" y2="11"></line></svg></button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
        <div>
          <h1 className="card-title" style={{ margin: 0, fontSize: '22px' }}>Tagihan & Cicilan</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Kelola tagihan rutin, cicilan, dan iuran</p>
        </div>
        <div className="flex gap-sm flex-wrap">
          <button className="btn btn-primary" onClick={handleGenerate}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Generate Bulan Ini</button>
        </div>
      </div>

      <div className="stats-grid mb-md">
        <div className="stat-card"><div className="flex justify-between items-start mb-sm"><div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>📄</div><span className="badge badge-info" style={{ fontSize: '10px', padding: '2px 6px' }}>TOTAL</span></div><div className="stat-value">{summary.total || 0}</div><div className="stat-label">Total Tagihan</div><div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>Belum: {summary.total - summary.lunas} | Lunas: {summary.lunas}</div></div>
        <div className="stat-card"><div className="flex justify-between items-start mb-sm"><div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>🔴</div><span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>TERLAMBAT</span></div><div className="stat-value" style={{ color: 'var(--danger)' }}>{summary.terlambat || 0}</div><div className="stat-label">Terlambat</div></div>
        <div className="stat-card"><div className="flex justify-between items-start mb-sm"><div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>🟡</div><span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px' }}>MINGGU INI</span></div><div className="stat-value" style={{ color: 'var(--warning)' }}>{summary.minggu_ini || 0}</div><div className="stat-label">Jatuh tempo ≤ 7 hari</div></div>
        <div className="stat-card"><div className="flex justify-between items-start mb-sm"><div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>💰</div><span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>BELUM BAYAR</span></div><div className="stat-value" style={{ color: 'var(--danger)' }}>{formatRupiah(summary.total_belum_bayar || 0)}</div><div className="stat-label">Total Belum Bayar</div><div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>Lunas: {formatRupiah(summary.total_lunas || 0)}</div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Daftar Tagihan</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-screen" style={{ position: 'relative', minHeight: '200px' }}><div className="loading-spinner"></div><div className="loading-text">Memuat...</div></div>
          ) : (
            <div>
              {(() => {
                const groups = [
                  { key: 'terlambat', label: '🔴 TERLAMBAT', color: 'var(--danger)', icon: '🔴', items: grouped.terlambat || [] },
                  { key: 'minggu_ini', label: '🟡 MINGGU INI', color: 'var(--warning)', icon: '🟡', items: grouped.minggu_ini || [] },
                  { key: 'bulan_ini', label: '📆 BULAN INI', color: 'var(--primary)', icon: '📆', items: grouped.bulan_ini || [] },
                  { key: 'lunas', label: '✅ LUNAS BULAN INI', color: 'var(--success)', icon: '✅', items: grouped.lunas || [] }
                ];
                return (
                  <div>
                    {groups.map(g => {
                      if (g.items.length === 0) return null;
                      return (
                        <div key={g.key} style={{ borderBottom: '1px solid var(--border)' }}>
                          <div style={{ padding: '10px 16px', background: `${g.color}15`, fontWeight: 600, color: g.color, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>{g.icon} {g.label} ({g.items.length})</div>
                          {g.items.map(renderBillRow)}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Pay Modal */}
      {payModal.open && payModal.bill && (
        <div className="modal-overlay" onClick={() => setPayModal({ open: false })}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header"><h3 className="modal-title">Bayar Tagihan</h3><button className="modal-close" onClick={() => setPayModal({ open: false })}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); const payload = Object.fromEntries(data); payload.bill_id = payModal.bill!.bill_id; payload.jumlah = Number(payload.jumlah); await handlePaySubmit(payload); }}>
              <div className="modal-body">
                <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div className="flex justify-between mb-sm"><span style="font-weight: 500;">{payModal.bill!.nama}</span><span style="font-weight: 700; color: var(--danger); font-size: 18px;">{formatRupiah(payModal.bill!.jumlah)}</span></div>
                  <div style="font-size: 12px; color: var(--text-muted);">Tempo: {formatDate(payModal.bill!.jatuh_tempo)} • {payModal.bill!.tipe_label}</div>
                </div>
                <div className="form-group"><label>Jumlah Bayar <span style="color:var(--danger)">*</span></label><input type="number" name="jumlah" min="1000" max="9999999999" step="1000" required defaultValue={payModal.bill!.jumlah} /></div>
                <div className="form-group"><label>Rekening <span style="color:var(--danger)">*</span></label><select name="account_id" required><option value="">Pilih rekening</option></select></div>
                <div className="form-group"><label>Metode</label><select name="metode"><option value="tunai">Tunai</option><option value="transfer">Transfer</option><option value="debit">Debit</option><option value="kredit">Kredit</option><option value="ewallet">E-Wallet</option></select></div>
                <div className="form-group"><label>Tanggal</label><input type="date" name="tanggal" defaultValue={getToday()} max={getTomorrow()} /></div>
                <div className="form-group"><label>Keterangan</label><textarea name="keterangan" rows="2" maxLength="500" placeholder="Catatan tambahan..."></textarea></div>
              </form>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setPayModal({ open: false })}>Batal</button><button className="btn btn-primary" type="submit" form="pay-form">Bayar & Tandai Lunas</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillsPage;