import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatDateTime, truncate, escapeHtml } from '../utils/helpers';

interface Note {
  note_id: string;
  judul: string;
  isi: string;
  kategori: string;
  kategori_icon: string;
  kategori_color: string;
  pin: string;
  pin_label: string;
  pin_color: string;
  pin_icon: string;
  formatted_dibuat: string;
  isi_preview: string;
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ kategori: '', pin: '', search: '' });
  const [addModal, setAddModal] = useState<{ open: boolean; note?: Note }>({ open: false });

  useEffect(() => { loadNotes(); }, [filters]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await api.call(`note.list?kategori=${filters.kategori}&pin=${filters.pin}&search=${filters.search}`);
      setNotes(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (addModal.note) {
        await api.call('note.update', { ...data, note_id: addModal.note!.note_id, rev: 1 });
      } else {
        await api.call('note.create', data);
      }
      setAddModal({ open: false });
      loadNotes();
    } catch (err: any) { alert(err.message); }
  };

  const togglePin = async (note: Note) => {
    try {
      await api.call('note.update', { note_id: note.note_id, rev: 1, pin: note.pin === 'YA' ? 'TIDAK' : 'YA' });
      loadNotes();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (noteId: string, rev: number) => {
    if (!confirm('Hapus catatan ini?')) return;
    try {
      await api.call(`note.delete?note_id=${noteId}&rev=${rev}`, { method: 'DELETE' });
      loadNotes();
    } catch (err: any) { alert(err.message); }
  };

  const openModal = (note?: Note) => setAddModal({ open: true, note });
  const closeModal = () => setAddModal({ open: false });

  const catColors: Record<string, string> = { ide: '#4CAF50', resep: '#FF9800', referensi: '#2196F3', lainnya: '#9C27B0' };
  const catIcons: Record<string, string> = { ide: '💡', resep: '📖', referensi: '🔗', lainnya: '📝' };

  return (
    <div>
      <div className="flex justify-between items-center mb-md flex-wrap gap-sm">
        <div>
          <h1 className="card-title" style={{ margin: 0, fontSize: '22px' }}>Catatan</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Catatan bebas: ide, resep, referensi, dll</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddModal({ open: true })}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Tambah Catatan</button>
      </div>

      <div className="card mb-md">
        <div className="card-body" style={{ padding: '0 16px 16px' }}>
          <div className="flex flex-wrap gap-sm" style={{ alignItems: 'flex-end' }}>
            <div className="form-group flex-1" style={{ minWidth: '200px', margin: 0 }}>
              <label>Kategori</label>
              <select value={filters.kategori} onChange={e => setFilters({...filters, kategori: e.target.value})}>
                <option value="">Semua</option>
                <option value="ide">💡 Ide</option>
                <option value="resep">📖 Resep</option>
                <option value="referensi">🔗 Referensi</option>
                <option value="lainnya">📝 Lainnya</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Filter</label>
              <select value={filters.pin} onChange={e => setFilters({...filters, pin: e.target.value})}>
                <option value="">Semua</option>
                <option value="YA">📌 Pinned</option>
                <option value="TIDAK">Biasa</option>
              </select>
            </div>
            <div className="form-group flex-1" style={{ minWidth: '200px', margin: 0 }}>
              <label>Cari</label>
              <div className="search-input"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><input type="text" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} placeholder="Cari judul/isi..."></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-screen" style={{ position: 'relative', minHeight: '300px', padding: '24px' }}>
              <div className="loading-spinner"></div>
              <div className="loading-text">Memuat catatan...</div>
            </div>
          ) : notes.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px', borderRadius: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <h3 style="margin: 8px 0 4px">Belum ada catatan</h3>
              <p style="font-size: 12px">Klik tombol "Tambah Catatan" untuk mulai</p>
            </div>
          ) : (
            <div className="notes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', padding: '16px' }}>
              {notes.map(n => {
                const catColor = n.kategori_color || '#757575';
                const catIcon = n.kategori_icon || '📝';
                const pinBadge = n.pin === 'YA' ? { label: '📌 Pinned', color: 'var(--danger)' } : { label: '', color: '' };
                return (
                  <div key={n.note_id} className="note-card" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', background: 'var(--surface)', ...(n.pin === 'YA' ? { borderColor: 'var(--danger)', background: 'var(--danger-light)' } : {}) }}>
                    <div className="flex justify-between items-start mb-sm">
                      <div className="flex items-center gap-sm">
                        <span className="chip" style={{ background: `${catColor}22`, color: catColor }}>{n.kategori_icon} {n.kategori}</span>
                        {n.pin === 'YA' && <span className="badge badge-danger" style={{ fontSize: '10px' }}>📌 Pinned</span>}
                      </div>
                      <div className="flex gap-xs">
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => togglePin(note as any)} title={n.pin === 'YA' ? 'Unpin' : 'Pin'}>
                          {n.pin === 'YA' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 17v5"></path><path d="M9 12v7"></path><path d="M15 12v7"></path><path d="M8 14a6 6 0 0 1 8 0"></path></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 17v5"></path><path d="M9 12v7"></path><path d="M15 12v7"></path><path d="M8 14a6 6 0 0 1 8 0"></path></svg>'}
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openModal(note as any)} title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><line x1="18.5" y1="2.5" x2="21" y2="5"></line><line x1="15" y1="5" x2="9" y2="11"></line></svg></button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteNote(note.note_id, 1)} title="Hapus"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                      </div>
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>{escapeHtml(note.judul)}</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{escapeHtml(note.isi_preview)}</p>
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>{note.formatted_dibuat}</span>
                      <span>{escapeHtml(note.dibuat_oleh)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {addModal.open && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header"><h3 className="modal-title">{addModal.note ? '✏️ Edit Catatan' : '📝 Catatan Baru'}</h3><button className="modal-close" onClick={closeModal}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); const payload = Object.fromEntries(data); payload.pin = payload.pin || 'TIDAK'; try { if (addModal.note) { await api.call('note.update', { ...payload, note_id: addModal.note.note_id, rev: 1 }); } else { await api.call('note.create', payload); } closeModal(); loadNotes(); } catch (err: any) { alert(err.message); } }}>
              <div className="modal-body">
                <div className="form-group"><label>Judul <span style="color:var(--danger)">*</span></label><input type="text" name="judul" maxLength="100" required value={addModal.note?.judul || ''} placeholder="Judul catatan..."></div>
                <div className="form-group"><label>Kategori</label><select name="kategori"><option value="ide">💡 Ide</option><option value="resep">📖 Resep</option><option value="referensi">🔗 Referensi</option><option value="lainnya">📝 Lainnya</option></select></div>
                <div className="form-group"><label>Isi</label><textarea name="isi" rows="6" maxLength="5000" placeholder="Tulis catatan di sini...">{addModal.note?.isi || ''}</textarea></div>
                <div className="form-group"><label className="checkbox-label"><input type="checkbox" name="pin" value="YA" defaultChecked={addModal.note?.pin === 'YA'}><span>📌 Pin ke atas</span></label></div>
              </form>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={closeModal}>Batal</button><button className="btn btn-primary" type="submit">{addModal.note ? 'Update' : 'Simpan'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotesPage;