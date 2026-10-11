import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatRupiah, formatDateTime } from '../utils/helpers';

interface SettingsData {
  settings: Record<string, string>;
}

interface Category {
  category_id: string;
  nama: string;
  tipe: string;
  scope: string;
  warna: string;
  ikon: string;
  budget_bulanan: number;
  aktif: string;
  urutan: number;
}

interface User {
  user_id: string;
  email: string;
  nama: string;
  role: string;
  aktif: string;
  dibuat_pada: string;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'umum' | 'kategori' | 'users' | 'notif' | 'maintenance'>('umum');
  const [saving, setSaving] = useState(false);
  const [catModal, setCatModal] = useState<{ open: boolean; cat?: Category }>({ open: false });
  const [userModal, setUserModal] = useState<{ open: boolean; user?: User }>({ open: false });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, c, u] = await Promise.all([
        api.call('settings.get'),
        api.call('categories.list'),
        api.call('auth.users')
      ]);
      setSettings(s.data?.settings || {});
      setCategories(c.data?.data || []);
      setUsers(u.data?.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      await api.call('settings.set', { key, value });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleTestWA = async () => {
    try { await api.call('settings.test-wa'); alert('Test WA terkirim!'); } catch (err: any) { alert('Test gagal: ' + err.message); }
  };

  const handleRegenerateBills = async () => {
    if (!confirm('Generate ulang tagihan bulan ini?')) return;
    try { await api.call('settings.regenerate-bills', { force: true }); alert('Selesai'); } catch (err: any) { alert(err.message); }
  };

  const openCatModal = (cat?: Category) => setCatModal({ open: true, cat });
  const closeCatModal = () => setCatModal({ open: false });

  const handleCatSubmit = async (data: any) => {
    try {
      if (catModal.cat) { await api.call('categories.update', { ...data, category_id: catModal.cat!.category_id, rev: 1 }); }
      else { await api.call('categories.create', data); }
      closeCatModal();
      loadAll();
    } catch (err: any) { alert(err.message); }
  };

  const handleCatDelete = async (id: string, rev: number) => {
    if (!confirm('Hapus kategori ini?')) return;
    try { await api.call(`categories.delete?category_id=${id}&rev=${rev}`, { method: 'DELETE' }); loadAll(); } catch (err: any) { alert(err.message); }
  };

  const openUserModal = (user?: User) => setUserModal({ open: true, user });
  const closeUserModal = () => setUserModal({ open: false });

  const handleUserSubmit = async (data: any) => {
    try {
      if (userModal.user) { await api.call('auth.users', { ...data, user_id: userModal.user!.user_id, rev: 1 }, { method: 'PUT' }); }
      else { await api.call('auth.register', data); }
      closeUserModal();
      loadAll();
    } catch (err: any) { alert(err.message); }
  };

  const handleUserDelete = async (id: string, rev: number) => {
    if (!confirm('Nonaktifkan pengguna ini?')) return;
    try { await api.call(`auth.users/${id}?rev=${rev}`, { method: 'DELETE' }); loadAll(); } catch (err: any) { alert(err.message); }
  };

  const tabs = [
    { id: 'umum', label: '⚙️ Umum', roles: ['admin'] },
    { id: 'kategori', label: '📁 Kategori', roles: ['admin'] },
    { id: 'users', label: '👥 Pengguna', roles: ['admin'] },
    { id: 'notif', label: '💬 Notifikasi WA', roles: ['admin'] },
    { id: 'maintenance', label: '🔧 Pemeliharaan', roles: ['admin'] }
  ];

  const statusOptions = { YA: '✅ Aktif', TIDAK: '❌ Nonaktif' };
  const roleLabels = { admin: '👑 Admin', user: '👤 User' };

  if (loading) return <div className="loading-screen" style={{ position: 'relative', minHeight: '300px' }}><div className="loading-spinner"></div><div className="loading-text">Memuat...</div></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-md">
        <div>
          <h1 className="card-title" style={{ margin: 0, fontSize: '22px' }}>Settings</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Pengaturan aplikasi</p>
        </div>
      </div>

      <div className="tabs mb-md" role="tablist">
        {tabs.map(t => (
          <button key={t.id} role="tab" className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id as any)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'umum' && (
        <div className="card mb-md">
          <div className="card-header"><h3 className="card-title">Pengaturan Umum</h3></div>
          <div className="card-body">
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); for (const [k, v] of data.entries()) { if (k !== 'fonnte_token' && k !== 'fonnte_target' && k !== 'fonnte_device' && k !== 'notifikasi_channel' && k !== 'jam_notifikasi') await handleSaveSetting(k, v); } }}>
              <div className="form-group"><label>Nama Keluarga</label><input type="text" name="nama_keluarga" value={settings.nama_keluarga || ''} placeholder="Keluarga Triana"></div>
              <div className="form-row">
                <div className="form-group"><label>Tanggal Mulai Data</label><input type="date" name="mulai_data" value={settings.mulai_data || ''}></div>
                <div className="form-group"><label>Tanggal Gaji</label><input type="number" name="bulan_angsuran_gaji" min="1" max="31" value={settings.bulan_angsuran_gaji || '25'} placeholder="25"></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Scope Default</label><select name="default_scope"><option value="pribadi" {settings.default_scope === 'pribadi' ? 'selected' : ''}>Pribadi</option><option value="keluarga" {settings.default_scope === 'keluarga' ? 'selected' : ''}>Keluarga</option><option value="usaha" {settings.default_scope === 'usaha' ? 'selected' : ''}>Usaha</option></select></div>
                <div className="form-group"><label>Mata Uang</label><input type="text" name="mata_uang" value={settings.mata_uang || 'IDR'} placeholder="IDR"></div>
              </div>
              <div className="form-group"><label>Jatah Cuti Tahunan Default</label><input type="number" name="cuti_tahunan" min="0" max="60" value={settings.cuti_tahunan || '12'}></div>
              <div className="form-group"><label>Hari Libur Nasional (CSV YYYY-MM-DD)</label><textarea name="hari_libur" rows="3" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{settings.hari_libur || ''}</textarea><div className="form-help">Pisahkan dengan koma. Contoh: 2026-01-01,2026-02-17</div></div>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Umum'}</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'notif' && (
        <div className="card mb-md">
          <div className="card-header"><h3 className="card-title">💬 Notifikasi WhatsApp (Fonnte)</h3></div>
          <div className="card-body">
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); for (const [k, v] of data.entries()) { await handleSaveSetting(k, v); } alert('Pengaturan WA disimpan'); }}>
              <div className="form-group"><label>API Token Fonnte <span style="color:var(--danger)">*</span></label><input type="password" name="fonnte_token" placeholder="Token dari dashboard Fonnte" autoComplete="off"><div className="form-help">Dapatkan di <a href="https://fonnte.com" target="_blank">fonnte.com</a> → Pengaturan → API Token</div></div>
              <div className="form-group"><label>Target Group ID <span style="color:var(--danger)">*</span></label><input type="text" name="fonnte_target" placeholder="628xxxxxxxxxx@g.us" autoComplete="off"><div className="form-help">Format: 628xxxxxxxxxx@g.us (dapat dari WhatsApp Web URL grup)</div></div>
              <div className="form-row">
                <div className="form-group"><label>Device ID</label><input type="text" name="fonnte_device" value={settings.fonnte_device || 'default'} placeholder="default"></div>
                <div className="form-group"><label>Channel Notifikasi</label><select name="notifikasi_channel"><option value="WA" {settings.notifikasi_channel === 'WA' ? 'selected' : ''}>WhatsApp Only</option><option value="EMAIL" {settings.notifikasi_channel === 'EMAIL' ? 'selected' : ''}>Email Only</option><option value="BOTH" {settings.notifikasi_channel === 'BOTH' ? 'selected' : ''}>Keduanya</option><option value="NONE" {settings.notifikasi_channel === 'NONE' ? 'selected' : ''}>Nonaktif</option></select></div>
              </div>
              <div className="form-group"><label>Jam Digest Harian</label><input type="time" name="jam_notifikasi" value={settings.jam_notifikasi || '07:00'}></div>
              <div className="flex gap-sm">
                <button className="btn btn-primary" type="submit">Simpan WA</button>
                <button className="btn btn-secondary" type="button" onClick={handleTestWA}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Test Kirim WA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'kategori' && (
        <div className="card mb-md">
          <div className="card-header"><div className="flex justify-between items-center"><h3 className="card-title" style={{ margin: 0 }}>📁 Kategori</h3><button className="btn btn-primary btn-sm" onClick={() => openCatModal()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Tambah</button></div></div>
          <div className="card-body" style={{ padding: 0 }}>
            {categories.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>Belum ada kategori</div>
            ) : (
              <div className="table-container"><table><thead><tr><th>Nama</th><th>Tipe</th><th>Scope</th><th>Budget</th><th>Warna</th><th>Aktif</th><th>Urutan</th><th>Aksi</th></tr></thead><tbody>
                {categories.map(c => (
                  <tr key={c.category_id}>
                    <td><span className="chip" style={{ background: `${c.warna}22`, color: c.warna }}>{c.ikon} {c.nama}</span></td>
                    <td><span className="badge" style={{ background: `${c.tipe === 'income' ? 'var(--success)' : 'var(--danger)'}22`, color: c.tipe === 'income' ? 'var(--success)' : 'var(--danger)' }}>{c.tipe === 'income' ? '📈' : '📉'} {c.tipe}</span></td>
                    <td><span className="badge badge-info">{c.scope}</span></td>
                    <td>{c.budget_bulanan > 0 ? formatRupiah(c.budget_bulanan) : '-'}</td>
                    <td><span style={{ width: '20px', height: '20px', borderRadius: '4px', background: c.warna, display: 'inline-block', border: '1px solid var(--border)' }}></span> {c.warna}</td>
                    <td><span className="badge" style={{ background: `${c.aktif === 'YA' ? 'var(--success)' : 'var(--danger)'}22`, color: c.aktif === 'YA' ? 'var(--success)' : 'var(--danger)' }}>{c.aktif === 'YA' ? '✅' : '❌'} {c.aktif}</span></td>
                    <td>{c.urutan}</td>
                    <td><div className="flex gap-xs"><button className="btn btn-ghost btn-sm btn-icon" onClick={() => openCatModal(c)} title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><line x1="18.5" y1="2.5" x2="21" y2="5"></line><line x1="15" y1="5" x2="9" y2="11"></line></svg></button><button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleCatDelete(c.category_id, c.rev)} title="Hapus"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card mb-md">
          <div className="card-header"><div className="flex justify-between items-center"><h3 className="card-title" style={{ margin: 0 }}>👥 Pengguna</h3><button className="btn btn-primary btn-sm" onClick={() => openUserModal()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Tambah</button></div></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container"><table><thead><tr><th>Email</th><th>Nama</th><th>Role</th><th>Aktif</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>
              {users.map(u => (
                <tr key={u.user_id}>
                  <td>{u.email}</td>
                  <td>{u.nama}</td>
                  <td><span className="badge" style={{ background: `${u.role === 'admin' ? 'var(--danger)' : 'var(--primary)'}22`, color: u.role === 'admin' ? 'var(--danger)' : 'var(--primary)' }}>{u.role === 'admin' ? '👑' : '👤'} {u.role}</span></td>
                  <td><span className="badge" style={{ background: `${u.aktif === 'YA' ? 'var(--success)' : 'var(--danger)'}22`, color: u.aktif === 'YA' ? 'var(--success)' : 'var(--danger)' }}>{u.aktif === 'YA' ? '✅' : '❌'} {u.aktif}</span></td>
                  <td>{formatDateTime(u.dibuat_pada)}</td>
                  <td><div className="flex gap-xs">{u.email !== 'kakang@email.com' ? `<button className="btn btn-ghost btn-sm btn-icon" onClick={() => openUserModal(u)} title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><line x1="18.5" y1="2.5" x2="21" y2="5"></line><line x1="15" y1="5" x2="9" y2="11"></line></svg></button>` : ''}<button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleUserDelete(u.user_id, u.rev)} title="Nonaktifkan"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div></td>
                </tr>
              ))}
            </tbody></table></div>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">🔧 Pemeliharaan</h3></div>
          <div className="card-body">
            <div className="flex flex-wrap gap-sm mb-md">
              <button className="btn btn-secondary" onClick={handleRegenerateBills}>🔄 Generate Ulang Tagihan Bulan Ini</button>
              <button className="btn btn-secondary" onClick={() => { if (confirm('Arsip log lama?')) api.call('settings.archive-logs').then(() => alert('Selesai')).catch((e: any) => alert(e.message)); }}>📦 Arsip Log Lama</button>
              <button className="btn btn-secondary" onClick={() => { localStorage.clear(); sessionStorage.clear(); alert('Cache dibersihkan. Silakan refresh.'); }}>🗑️ Reset Cache Client</button>
            </div>
            <div className="card mb-md">
              <div className="card-header"><h3 className="card-title">Status Trigger</h3></div>
              <div className="card-body">
                <div className="table-container"><table><thead><tr><th>Fungsi</th><th>Jadwal</th></tr></thead><tbody>
                  <tr><td>Daily Digest</td><td>{settings.jam_notifikasi || '07:00'} harian</td></tr>
                  <tr><td>Bill Reminder</td><td>Setiap jam</td></tr>
                  <tr><td>Monthly Generate</td><td>Tgl 1 jam 00:30</td></tr>
                </tbody></table></div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Statistik Database</h3></div>
              <div className="card-body">
                <button className="btn btn-secondary" onClick={async () => { const res = await api.call('settings.stats'); alert(JSON.stringify(res.data?.stats, null, 2)); }}>📊 Lihat Statistik</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModal.open && (
        <div className="modal-overlay" onClick={closeCatModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header"><h3 className="modal-title">{catModal.cat ? '✏️ Edit Kategori' : '📁 Kategori Baru'}</h3><button className="modal-close" onClick={closeCatModal}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); try { await handleCatSubmit(Object.fromEntries(data)); } catch (err: any) { alert(err.message); } }}>
              <div className="modal-body">
                <input type="hidden" name="category_id" value={catModal.cat?.category_id || ''}>
                <div className="form-group"><label>Nama <span style="color:var(--danger)">*</span></label><input type="text" name="nama" maxLength="100" required value={catModal.cat?.nama || ''}></div>
                <div className="form-row">
                  <div className="form-group"><label>Tipe <span style="color:var(--danger)">*</span></label><select name="tipe" required><option value="income" {catModal.cat?.tipe === 'income' ? 'selected' : ''}>Pemasukan</option><option value="expense" {catModal.cat?.tipe === 'expense' ? 'selected' : ''}>Pengeluaran</option></select></div>
                  <div className="form-group"><label>Scope <span style="color:var(--danger)">*</span></label><select name="scope" required><option value="pribadi" {catModal.cat?.scope === 'pribadi' ? 'selected' : ''}>Pribadi</option><option value="keluarga" {catModal.cat?.scope === 'keluarga' ? 'selected' : ''}>Keluarga</option><option value="usaha" {catModal.cat?.scope === 'usaha' ? 'selected' : ''}>Usaha</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Warna</label><input type="color" name="warna" value={catModal.cat?.warna || '#757575'}></div>
                  <div className="form-group"><label>Ikon</label><input type="text" name="ikon" maxLength="10" value={catModal.cat?.ikon || '📁'} placeholder="📁"></div>
                </div>
                <div className="form-group"><label>Budget Bulanan</label><input type="number" name="budget_bulanan" min="0" max="9999999999" step="10000" value={catModal.cat?.budget_bulanan || 0} placeholder="0 = tanpa budget"></div>
                <div className="form-row"><div className="form-group"><label className="checkbox-label"><input type="checkbox" name="aktif" value="YA" {catModal.cat?.aktif !== 'TIDAK' ? 'checked' : ''}><span>Aktif</span></label></div></div>
              </form>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={closeCatModal}>Batal</button><button className="btn btn-primary" type="submit" form="cat-form">{catModal.cat ? 'Update' : 'Simpan'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {userModal.open && (
        <div className="modal-overlay" onClick={closeUserModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header"><h3 className="modal-title">{userModal.user ? '✏️ Edit Pengguna' : '👤 Pengguna Baru'}</h3><button className="modal-close" onClick={closeUserModal}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); try { if (userModal.user) { await api.call('auth.users', { ...Object.fromEntries(data), user_id: userModal.user.user_id, rev: 1 }, { method: 'PUT' }); } else { await api.call('auth.register', Object.fromEntries(data)); } closeUserModal(); loadAll(); } catch (err: any) { alert(err.message); } }}>
              <div className="modal-body">
                <input type="hidden" name="user_id" value={userModal.user?.user_id || ''}>
                <div className="form-group"><label>Email <span style="color:var(--danger)">*</span></label><input type="email" name="email" required value={userModal.user?.email || ''} {userModal.user ? 'readOnly' : ''}></div>
                <div className="form-group"><label>Nama <span style="color:var(--danger)">*</span></label><input type="text" name="nama" required value={userModal.user?.nama || ''}></div>
                <div className="form-group"><label>Role <span style="color:var(--danger)">*</span></label><select name="role" required><option value="admin" {userModal.user?.role === 'admin' ? 'selected' : ''}>Admin</option><option value="user" {userModal.user?.role === 'user' ? 'selected' : ''}>User</option></select></div>
                {!userModal.user && <div className="form-group"><label className="checkbox-label"><input type="checkbox" name="aktif" value="YA" checked><span>Aktif</span></label></div>}
              </form>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={closeUserModal}>Batal</button><button className="btn btn-primary" type="submit" form="user-form">{userModal.user ? 'Update' : 'Simpan'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;