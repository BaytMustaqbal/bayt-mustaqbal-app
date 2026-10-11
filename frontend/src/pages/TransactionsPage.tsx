import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatRupiah, formatDate, getToday, getTomorrow } from '../utils/helpers';

interface Transaction {
  txn_id: string;
  tanggal: string;
  periode: string;
  tipe: 'income' | 'expense';
  kategori_id: string;
  kategori_nama: string;
  kategori_warna: string;
  kategori_icon: string;
  jumlah: number;
  account_id: string;
  account_nama: string;
  account_icon: string;
  scope: string;
  metode: string;
  method_icon: string;
  keterangan: string;
  tags: string;
  formatted_jumlah: string;
  formatted_tanggal: string;
  can_edit: boolean;
}

interface Category {
  category_id: string;
  nama: string;
  tipe: 'income' | 'expense';
  scope: string;
  warna: string;
  ikon: string;
  budget_bulanan: number;
}

interface Account {
  account_id: string;
  nama: string;
  tipe: string;
  icon: string;
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Filters
  const [filters, setFilters] = useState({
    periode: new Date().toISOString().slice(0, 7),
    tipe: '',
    kategori_id: '',
    scope: '',
    metode: '',
    startDate: '',
    endDate: ''
  });

  // Quick input modal
  const [quickInput, setQuickInput] = useState<{
    open: boolean;
    category?: Category;
    tipe?: 'income' | 'expense';
  }>({ open: false });

  useEffect(() => {
    loadCategories();
    loadAccounts();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page, filters]);

  const loadCategories = async () => {
    try {
      const res = await api.call('categories.list');
      setCategories(res.data || []);
    } catch (err) { console.error(err); }
  };

  const loadAccounts = async () => {
    // Could add dedicated endpoint, for now get from bootstrap or settings
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      const res = await api.call(`txn/list?${params.toString()}`);
      setTransactions(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openQuickInput = (cat: Category, tipe: 'income' | 'expense') => {
    setQuickInput({ open: true, category: cat, tipe });
  };

  const closeQuickInput = () => setQuickInput({ open: false });

  const handleQuickSubmit = async (data: any) => {
    try {
      await api.createTransaction(data);
      closeQuickInput();
      loadTransactions();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (txn: Transaction) => {
    if (!confirm('Hapus transaksi ini?')) return;
    try {
      await api.deleteTransaction(txn.txn_id, txn.rev || 1);
      loadTransactions();
    } catch (err: any) { alert(err.message); }
  };

  const incomeCats = categories.filter(c => c.tipe === 'income' && c.aktif === 'YA');
  const expenseCats = categories.filter(c => c.tipe === 'expense' && c.aktif === 'YA');
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-md">
        <div>
          <h1 className="card-title" style={{ margin: 0, fontSize: '22px' }}>Keuangan</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Catat pemasukan & pengeluaran
          </p>
        </div>
      </div>

      {/* Quick Input Grid */}
      <div className="card mb-md">
        <div className="card-header">
          <h3 className="card-title">Input Cepat</h3>
        </div>
        <div className="card-body">
          <div className="tabs mb-md" role="tablist">
            <button role="tab" className={`tab ${activeTab === 'expense' ? 'active' : ''}`} onClick={() => setActiveTab('expense')}>📉 Pengeluaran</button>
            <button role="tab" className={`tab ${activeTab === 'income' ? 'active' : ''}`} onClick={() => setActiveTab('income')}>📈 Pemasukan</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
            {(activeTab === 'expense' ? expenseCats : incomeCats).map(cat => (
              <button
                key={cat.category_id}
                className="quick-cat-btn"
                onClick={() => openQuickInput(cat, activeTab)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '12px 8px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', background: 'var(--surface)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  color: cat.warna, fontSize: '12px', fontWeight: 500
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
              >
                <span style="font-size: 24px; margin-bottom: 4px;">{cat.ikon}</span>
                <span>{cat.nama}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-md">
        <div className="card-body" style={{ padding: '0 16px 16px' }}>
          <div className="flex flex-wrap gap-sm" style={{ alignItems: 'flex-end' }}>
            <div className="form-group flex-1" style={{ minWidth: '180px', margin: 0 }}>
              <label>Periode</label>
              <input type="month" value={filters.periode} onChange={e => setFilters({...filters, periode: e.target.value})} />
            </div>
            <div className="form-group flex-1" style={{ minWidth: '180px', margin: 0 }}>
              <label>Tipe</label>
              <select value={filters.tipe} onChange={e => setFilters({...filters, tipe: e.target.value})}>
                <option value="">Semua</option>
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>
            </div>
            <div className="form-group flex-1" style={{ minWidth: '180px', margin: 0 }}>
              <label>Kategori</label>
              <select value={filters.kategori_id} onChange={e => setFilters({...filters, kategori_id: e.target.value})}>
                <option value="">Semua</option>
                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.nama}</option>)}
              </select>
            </div>
            <div className="form-group flex-1" style={{ minWidth: '180px', margin: 0 }}>
              <label>Scope</label>
              <select value={filters.scope} onChange={e => setFilters({...filters, scope: e.target.value})}>
                <option value="">Semua</option>
                <option value="pribadi">Pribadi</option>
                <option value="keluarga">Keluarga</option>
                <option value="usaha">Usaha</option>
              </select>
            </div>
            <button className="btn btn-secondary" onClick={() => { setFilters({ periode: filters.periode, tipe: '', kategori_id: '', scope: '', metode: '', startDate: '', endDate: '' }); setPage(1); }}>Reset</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Daftar Transaksi</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-screen" style={{ position: 'relative', minHeight: '200px' }}>
              <div className="loading-spinner"></div>
              <div className="loading-text">Memuat...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px', borderRadius: 0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '48px', height: '48px' }}>
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              </svg>
              <h3 style="margin: 8px 0 4px">Belum ada transaksi</h3>
              <p style="font-size: 12px">Klik kategori di atas untuk input cepat</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Kategori</th>
                    <th>Keterangan</th>
                    <th className="text-right">Jumlah</th>
                    <th>Metode</th>
                    <th>Sumber</th>
                    <th style={{ width: '80px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(txn => (
                    <tr key={txn.txn_id}>
                      <td>{txn.formatted_tanggal}</td>
                      <td>
                        <span className="chip" style={{ background: `${txn.kategori_warna}22`, color: txn.kategori_warna }}>
                          {txn.kategori_icon} {txn.kategori_nama}
                        </span>
                      </td>
                      <td>{txn.keterangan || '-'}</td>
                      <td className="text-right" style={{ color: txn.tipe === 'income' ? 'var(--success)' : 'var(--danger)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {txn.tipe === 'income' ? '+' : '-'} {txn.formatted_jumlah}
                      </td>
                      <td><span className="chip">{txn.method_icon} {txn.metode}</span></td>
                      <td><span className="chip">{txn.account_icon} {txn.account_nama}</span></td>
                      <td>
                        <div className="flex gap-xs">
                          {txn.can_edit && (
                            <button className="btn btn-ghost btn-sm btn-icon" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><line x1="18.5" y1="2.5" x2="21" y2="5"></line><line x1="15" y1="5" x2="9" y2="11"></line></svg></button>
                          )}
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(txn)} title="Hapus"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
        <div className="card-footer">
          <div className="flex justify-center gap-sm">
            {page > 1 && <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p - 1)}>← Sebelumnya</button>}
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: 'var(--text-secondary)' }}>Halaman {page} dari {Math.ceil(total / pageSize)}</span>
            {page < Math.ceil(total / pageSize) && <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => p + 1)}>Selanjutnya →</button>}
          </div>
        </div>
      </div>

      {/* Quick Input Modal */}
      {quickInput.open && quickInput.category && (
        <div className="modal-overlay" onClick={closeQuickInput}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{quickInput.tipe === 'income' ? '📈' : '📉'} {quickInput.category.nama}</h3>
              <button className="modal-close" onClick={closeQuickInput}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <form onSubmit={async (e) => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); const payload = Object.fromEntries(data); payload.kategori_id = quickInput.category!.category_id; payload.tipe = quickInput.tipe!; payload.kategori_nama = quickInput.category.nama; await handleQuickSubmit(payload); }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Jumlah <span style="color:var(--danger)">*</span></label>
                  <input type="number" name="jumlah" min="1000" max="9999999999" step="1000" required autoFocus placeholder="Contoh: 50000" />
                </div>
                <div className="form-group">
                  <label>Tanggal <span style="color:var(--danger)">*</span></label>
                  <input type="date" name="tanggal" value={getToday()} required max={getTomorrow()} />
                </div>
                <div className="form-group">
                  <label>Rekening <span style="color:var(--danger)">*</span></label>
                  <select name="account_id" required>
                    {accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.nama} ({a.tipe})</option>)}
                    {accounts.length === 0 && <option value="" disabled>Belum ada rekening</option>}
                  </select>
                </div>
                <div className="form-group">
                  <label>Scope</label>
                  <select name="scope">
                    <option value="pribadi" {quickInput.category?.scope === 'pribadi' ? 'selected' : ''}>Pribadi</option>
                    <option value="keluarga" {quickInput.category?.scope === 'keluarga' ? 'selected' : ''}>Keluarga</option>
                    <option value="usaha" {quickInput.category?.scope === 'usaha' ? 'selected' : ''}>Usaha</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Metode</label>
                  <select name="metode">
                    <option value="tunai">Tunai</option>
                    <option value="transfer">Transfer</option>
                    <option value="debit">Debit</option>
                    <option value="kredit">Kredit</option>
                    <option value="ewallet">E-Wallet</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Keterangan (opsional)</label>
                  <textarea name="keterangan" rows="2" maxLength="500" placeholder="Catatan tambahan..."></textarea>
                </div>
                <div className="form-group">
                  <label>Tags (opsional)</label>
                  <input type="text" name="tags" placeholder="urgent, rutin, dll (pisah koma)" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeQuickInput}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionsPage;