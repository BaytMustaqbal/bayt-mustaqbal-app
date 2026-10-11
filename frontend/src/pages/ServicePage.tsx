import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatRupiah, formatDate, formatNumber } from '../utils/helpers';

interface Asset {
  asset_id: string;
  nama: string;
  grup: string;
  grup_icon: string;
  grup_color: string;
  merek: string;
  tipe: string;
  tahun: string;
  no_seri: string;
  lokasi: string;
  interval_hari: number;
  interval_km: number;
  formatted_interval_hari: string;
  formatted_interval_km: string;
}

interface ServiceLog {
  svc_id: string;
  asset_id: string;
  asset_nama: string;
  asset_grup: string;
  jenis: string;
  jenis_icon: string;
  tanggal: string;
  formatted_tanggal: string;
  kilometer: number;
  biaya: number;
  formatted_biaya: string;
  vendor: string;
  no_nota: string;
  parts: string;
  selesai: string;
  selesai_label: string;
  selesai_color: string;
  selesai_icon: string;
}

interface DueAsset {
  asset_id: string;
  nama: string;
  grup: string;
  grup_icon: string;
  last_service: string;
  last_km: number;
  days_left: number;
  km_left: number;
  status: string;
  color: string;
  icon: string;
  interval_hari: number;
  interval_km: number;
  overdue: boolean;
}

export function ServicePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [due, setDue] = useState<DueAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetModal, setAssetModal] = useState<{ open: boolean; asset?: Asset }>({ open: false });
  const [logModal, setLogModal] = useState<{ open: boolean; assetId?: string }>({ open: false });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsRes, logsRes, dueRes] = await Promise.all([
        api.call('svc.asset.list'),
        api.call('svc.list'),
        api.call('svc.due', { daysAhead: 30, kmAhead: 500 })
      ]);
      setAssets(assetsRes.data || []);
      setLogs(logsRes.data || []);
      setDue(dueRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAssetSubmit = async (data: any) => {
    try {
      await api.call('svc.asset.create', data);
      setAssetModal({ open: false });
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const handleLogSubmit = async (data: any) => {
    try {
      await api.call('svc.create', data);
      setLogModal({ open: false });
      loadData();
    } catch (err: any) { alert(err.message); }
  };

  const openAssetModal = (asset?: Asset) => setAssetModal({ open: true, asset });
  const closeAssetModal = () => setAssetModal({ open: false });
  const openLogModal = (assetId?: string) => setLogModal({ open: true, assetId });
  const closeLogModal = () => setLogModal({ open: false });

  if (loading) return <div className="loading-screen" style={{ position: 'relative', minHeight: '300px' }}><div className="loading-spinner"></div><div className="loading-text">Memuat...</div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
        <div>
          <h1 className="card-title" style={{ margin: 0, fontSize: '22px' }}>Service Motor & Rumah</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Riwayat & jadwal perawatan aset</p>
        </div>
        <div className="flex gap-sm flex-wrap">
          <button className="btn btn-primary" onClick={() => openAssetModal()}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Tambah Aset</button>
          <button className="btn btn-secondary" onClick={() => openLogModal()}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Catat Service</button>
        </div>
      </div>

      <div className="stats-grid mb-md">
        {due.map(d => (
          <div key={d.asset_id} className="stat-card" style={{ borderLeft: `4px solid ${d.color}` }}>
            <div className="flex justify-between items-start mb-sm">
              <div className="stat-icon" style={{ background: `${d.color}22`, color: d.color }}>{d.grup_icon || '🔧'}</div>
              <span className="badge" style={{ background: `${d.color}22`, color: d.color, fontSize: '10px' }}>{d.icon} {d.status}</span>
            </div>
            <div className="stat-value" style={{ color: d.color, fontSize: '18px' }}>{d.nama}</div>
            <div className="stat-label">{d.grup}</div>
            <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
              {d.days_left <= 0 ? 'OVERDUE ' + Math.abs(d.days_left) + ' hari' : d.days_left + ' hari lagi'} • 
              {d.km_left <= 0 ? 'OVERDUE ' + Math.abs(d.km_left) + ' km' : d.km_left + ' km lagi'}
            </div>
          </div>
        ))}
        {due.length === 0 && (
          <div className="stat-card" style={{ background: 'var(--success-light)', border: '1px solid var(--success)' }}>
            <div className="flex justify-between items-start mb-sm"><div className="stat-icon" style={{ background: 'var(--success)', color: 'white' }}>✅</div></div>
            <div className="stat-value" style={{ color: 'var(--success)', fontSize: '28px' }}>Aman</div>
            <div className="stat-label">Semua aset</div>
            <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>Tidak ada service mendatang 30 hari</div>
          </div>
        )}
      </div>

      <div className="card mb-md">
        <div className="card-header"><h3 className="card-title">Daftar Aset</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          {assets.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px', borderRadius: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px' }}><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>
              <h3 style="margin: 8px 0 4px">Belum ada aset</h3>
              <p style="font-size: 12px">Tambah motor, AC, pompa air, dll</p>
            </div>
          ) : (
            <div className="table-container">
              <table><thead><tr><th>Aset</th><th>Grup</th><th>Merek / Tipe</th><th>Interval</th><th>Last Service</th><th>Next Due</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
                {assets.map(a => (
                  <tr key={a.asset_id}>
                    <td><strong>{a.nama}</strong></td>
                    <td><span className="badge" style={{ background: a.grup_color + '22', color: a.grup_color }}>{a.grup_icon} {a.grup}</span></td>
                    <td>{a.merek || ''} {a.tipe || ''} {a.tahun ? '(' + a.tahun + ')' : ''}</td>
                    <td>{a.formatted_interval_hari} {a.formatted_interval_km ? ' / ' + a.formatted_interval_km : ''}</td>
                    <td>{a._logs?.[0] ? formatDate(a._logs[0].tanggal) : 'Belum pernah'}</td>
                    <td>-</td>
                    <td><span className="badge" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>Aman</span></td>
                    <td>
                      <div className="flex gap-xs">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openAssetModal(a)} title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><line x1="18.5" y1="2.5" x2="21" y2="5"></line><line x1="15" y1="5" x2="9" y2="11"></line></svg></button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openLogModal(a.asset_id)} title="Catat Service"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Hapus"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">Riwayat Service</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          {logs.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px', borderRadius: 0 }}>Belum ada riwayat service</div>
          ) : (
            <div className="table-container">
              <table><thead><tr><th>Tanggal</th><th>Aset</th><th>Jenis</th><th>KM</th><th>Biaya</th><th>Vendor</th><th>Parts</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
                {logs.map(l => (
                  <tr key={l.svc_id}>
                    <td>{l.formatted_tanggal}</td>
                    <td>{l.asset_nama} <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{l.asset_grup}</span></td>
                    <td><span className="chip" style={{ background: ({servis:'#2f81f7',ganti:'#f85149',perbaikan:'#fbbc04',rutin:'#34a853',claim_asuransi:'#9c27b0'}[l.jenis] || '#757575') + '22', color: ({servis:'#2f81f7',ganti:'#f85149',perbaikan:'#fbbc04',rutin:'#34a853',claim_asuransi:'#9c27b0'}[l.jenis] || '#757575') }}>{l.jenis_icon} {l.jenis}</span></td>
                    <td>{l.kilometer ? formatNumber(l.kilometer) + ' km' : '-'}</td>
                    <td>{l.formatted_biaya}</td>
                    <td>{l.vendor || '-'}</td>
                    <td>{l.parts || '-'}</td>
                    <td><span className="badge" style={{ background: `${l.selesai_color}22`, color: l.selesai_color }}>{l.selesai_icon} {l.selesai_label}</span></td>
                    <td><div className="flex gap-xs"><button className="btn btn-ghost btn-sm btn-icon" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><line x1="18.5" y1="2.5" x2="21" y2="5"></line><line x1="15" y1="5" x2="9" y2="11"></line></svg></button><button className="btn btn-ghost btn-sm btn-icon" title="Hapus"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div></td>
                  </tr>
                ))}
              </tbody></table></div>
          )}
        </div>
      </div>

      {/* Asset Modal */}
      {assetModal.open && (
        <div className="modal-overlay" onClick={closeAssetModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header"><h3 className="modal-title">{assetModal.asset ? '✏️ Edit Aset' : '🏍️ Aset Baru'}</h3><button className="modal-close" onClick={closeAssetModal}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); const payload = Object.fromEntries(data); try { await api.call('svc.asset.create', payload); closeAssetModal(); loadData(); } catch (err: any) { alert(err.message); } }}>
              <div className="modal-body">
                <div className="form-group"><label>Nama <span style="color:var(--danger)">*</span></label><input type="text" name="nama" maxLength="100" required placeholder="Motor Beat, AC Ruang Tamu, dll"></div>
                <div className="form-row">
                  <div className="form-group"><label>Grup <span style="color:var(--danger)">*</span></label><select name="grup" required><option value="motor">🏍️ Motor</option><option value="rumah">🏠 Rumah</option><option value="elektronik">📺 Elektronik</option><option value="perabot">🪑 Perabot</option><option value="lainnya">🔧 Lainnya</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Merek</label><input type="text" name="merek" maxLength="50" placeholder="Honda, Samsung, dll"></div>
                  <div className="form-group"><label>Tipe</label><input type="text" name="tipe" maxLength="50" placeholder="Beat, Vario, 1 PK, dll"></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Tahun</label><input type="text" name="tahun" maxLength="4" placeholder="2020"></div>
                  <div className="form-group"><label>No Seri / Plat</label><input type="text" name="no_seri" maxLength="50" placeholder="B 1234 ABC"></div>
                </div>
                <div className="form-group"><label>Lokasi</label><input type="text" name="lokasi" maxLength="100" placeholder="Garasi, Ruang Tamu, dll"></div>
                <div className="form-row">
                  <div className="form-group"><label>Interval Hari</label><input type="number" name="interval_hari" min="1" max="3650" placeholder="90"></div>
                  <div className="form-group"><label>Interval KM</label><input type="number" name="interval_km" min="1" max="999999" placeholder="5000"></div>
                </div>
                <div className="form-group"><label>Keterangan</label><textarea name="keterangan" rows="2" maxLength="500" placeholder="Catatan tambahan..."></textarea></div>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={closeAssetModal}>Batal</button><button className="btn btn-primary" type="submit">{assetModal.asset ? 'Update' : 'Simpan'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Log Modal */}
      {logModal.open && (
        <div className="modal-overlay" onClick={closeLogModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header"><h3 className="modal-title">📝 Catat Service</h3><button className="modal-close" onClick={closeLogModal}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); const payload = Object.fromEntries(data); try { await api.call('svc.create', payload); closeLogModal(); loadData(); } catch (err: any) { alert(err.message); } }}>
              <div className="modal-body">
                <div className="form-group"><label>Aset <span style="color:var(--danger)">*</span></label><select name="asset_id" required><option value="">Pilih aset</option>{assets.map(a => <option key={a.asset_id} value={a.asset_id}>{a.nama} ({a.grup})</option>)}</select></div>
                <div className="form-row">
                  <div className="form-group"><label>Jenis <span style="color:var(--danger)">*</span></label><select name="jenis" required><option value="servis">🔧 Servis</option><option value="ganti">🔄 Ganti Part</option><option value="perbaikan">🛠️ Perbaikan</option><option value="rutin">📅 Rutin</option><option value="claim_asuransi">📋 Klaim Asuransi</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Tanggal <span style="color:var(--danger)">*</span></label><input type="date" name="tanggal" required max={getTomorrow()} defaultValue={getToday()}></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>KM</label><input type="number" name="kilometer" min="0" max="999999" placeholder="15000"></div>
                  <div className="form-group"><label>Biaya</label><input type="number" name="biaya" min="0" max="9999999999" step="1000" placeholder="50000"></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Vendor</label><input type="text" name="vendor" maxLength="100" placeholder="Bengkel resmi, Tukang AC, dll"></div>
                  <div className="form-group"><label>No Nota</label><input type="text" name="no_nota" maxLength="50" placeholder="Nomor struk/nota"></div>
                </div>
                <div className="form-group"><label>Parts</label><input type="text" name="parts" maxLength="500" placeholder="oli 1L, filter udara, ban, dll"></div>
                <div className="form-group"><label>Catatan</label><textarea name="catatan" rows="2" maxLength="500" placeholder="Detail service..."></textarea></div>
                <div className="form-group"><label className="checkbox-label"><input type="checkbox" name="selesai" value="YA" defaultChecked><span>✅ Selesai</span></label></div>
              </form>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={closeLogModal}>Batal</button><button className="btn btn-primary" type="submit">Simpan</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServicePage;