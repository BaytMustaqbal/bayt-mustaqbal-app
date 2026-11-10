import React, { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { EmptyState, ProgressBar, CTA_CLASS, Badge, CurrencyInput } from './ui';

const CATEGORIES = [
  { id: 'dana_darurat', label: 'Dana Darurat', icon: 'shield' },
  { id: 'liburan', label: 'Liburan', icon: 'mapPin' },
  { id: 'renovasi', label: 'Renovasi', icon: 'home' },
  { id: 'kendaraan', label: 'Kendaraan', icon: 'car' },
  { id: 'pendidikan', label: 'Pendidikan', icon: 'book' },
  { id: 'lainnya', label: 'Lainnya', icon: 'sparkles' },
];
const catMeta = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const inputCls =
  'min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand';

const emptyGoal = () => ({
  id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  nama: '',
  targetAmount: 0,
  currentAmount: 0,
  targetDate: '',
  category: 'lainnya',
  monthly: 0,
  achieved: false,
  createdAt: new Date().toISOString(),
});

function GoalForm({ initial, onCancel, onSave }) {
  const [f, setF] = useState(initial || emptyGoal());
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = () => {
    if (!f.nama.trim() || !(Number(f.targetAmount) > 0)) {
      setErr('Nama dan target nominal wajib diisi.');
      return;
    }
    onSave({
      ...f,
      nama: f.nama.trim(),
      targetAmount: Number(f.targetAmount),
      currentAmount: Number(f.currentAmount) || 0,
      monthly: Number(f.monthly) || 0,
      targetDate: f.targetDate || null,
      achieved: Number(f.currentAmount) >= Number(f.targetAmount),
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-line bg-canvas p-3.5">
      <input value={f.nama} onChange={set('nama')} placeholder="Nama target (mis. Renovasi dapur)" className={inputCls} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-mutedfg">Target (Rp)</label>
          <CurrencyInput value={f.targetAmount} onChange={(n) => setF((prev) => ({ ...prev, targetAmount: n }))} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mutedfg">Terkumpul (Rp)</label>
          <CurrencyInput value={f.currentAmount} onChange={(n) => setF((prev) => ({ ...prev, currentAmount: n }))} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-mutedfg">Tabungan/bulan (Rp)</label>
          <CurrencyInput value={f.monthly} onChange={(n) => setF((prev) => ({ ...prev, monthly: n }))} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mutedfg">Kategori</label>
          <select value={f.category} onChange={set('category')} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-mutedfg">Target tanggal (opsional)</label>
        <input type="date" value={f.targetDate} onChange={set('targetDate')} className={inputCls} />
      </div>
      {err && <p className="text-xs font-medium text-danger">{err}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="min-h-[44px] flex-1 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-mutedfg hover:text-ink">Batal</button>
        <button type="button" onClick={submit} className={`${CTA_CLASS} min-h-[44px] flex-[2]`}>
          <Icon name="check" size={15} /> Simpan
        </button>
      </div>
    </div>
  );
}

function TxnForm({ onSubmit, onCancel }) {
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState('in');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!(Number(amount) > 0)) { setErr('Nominal wajib > 0.'); return; }
    onSubmit({ amount: Number(amount), type, note: note.trim() || null });
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-brand/25 bg-surface p-3.5">
      <div className="flex gap-2">
        <button type="button" onClick={() => setType('in')} className={`min-h-[40px] flex-1 rounded-lg text-xs font-semibold ${type === 'in' ? 'bg-toneemerald/15 text-toneemeraldfg' : 'bg-muted text-mutedfg'}`}>Tambah</button>
        <button type="button" onClick={() => setType('out')} className={`min-h-[40px] flex-1 rounded-lg text-xs font-semibold ${type === 'out' ? 'bg-tonerose/15 text-tonerosefg' : 'bg-muted text-mutedfg'}`}>Tarik</button>
      </div>
      <CurrencyInput value={amount} onChange={setAmount} className={inputCls} />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" className={inputCls} />
      {err && <p className="text-xs font-medium text-danger">{err}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="min-h-[40px] flex-1 rounded-lg border border-line text-xs font-semibold text-mutedfg hover:text-ink">Batal</button>
        <button type="button" onClick={submit} className={`${CTA_CLASS} min-h-[40px] flex-[2] text-xs`}>Simpan</button>
      </div>
    </div>
  );
}

export function TargetTabunganComp({ goals = [], canWrite = false, onAdd, onUpdate, onDelete, onTransaction, formatCurrency }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('semua');
  const [txnGoal, setTxnGoal] = useState(null);
  const [txns, setTxns] = useState({});

  const filtered = useMemo(() => filter === 'semua' ? goals : goals.filter((g) => g.category === filter), [goals, filter]);

  const yearSave = (goal) => {
    if (editing) onUpdate(goal.id, goal);
    else onAdd(goal);
    setEditing(null);
    setCreating(false);
  };

  const handleTxn = async (payload) => {
    const res = await onTransaction(txnGoal.id, payload);
    if (res?.goal) onUpdate(txnGoal.id, res.goal);
    setTxnGoal(null);
  };

  const toggleTxns = async (g) => {
    if (txnGoal?.id === g.id) { setTxnGoal(null); return; }
    setTxnGoal(g);
    try {
      const rows = await (await import('../services/client')).goalsApi.transactions(g.id);
      setTxns((prev) => ({ ...prev, [g.id]: rows }));
    } catch { /* abaikan */ }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-muted/50 p-1">
        {[{ id: 'semua', label: 'Semua' }, ...CATEGORIES].map((c) => (
          <button key={c.id} type="button" onClick={() => setFilter(c.id)} className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${filter === c.id ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:bg-muted hover:text-ink'}`}>
            {c.id !== 'semua' && <Icon name={c.icon} size={13} />}
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && !creating ? (
        <EmptyState icon="piggyBank" title="Belum ada target" message="Buat target tabungan untuk memantau impian keluarga." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((g) => {
            const pct = Number(g.targetAmount) > 0 ? Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)) : 0;
            const remaining = Math.max(0, Number(g.targetAmount) - Number(g.currentAmount));
            const monthly = Number(g.monthly) || 0;
            const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : null;
            const meta = catMeta(g.category);
            return (
              <div key={g.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brandtint text-brandfg" aria-hidden="true">
                      <Icon name={meta.icon} size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{g.nama}</p>
                      <p className="text-[11px] text-mutedfg">{meta.label}{g.targetDate ? ` • ${g.targetDate}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {g.achieved && <Badge tone="green">Tercapai</Badge>}
                    {canWrite && (
                      <>
                        <button type="button" onClick={() => setEditing(g)} aria-label="Ubah target" className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg hover:bg-muted hover:text-ink">
                          <Icon name="edit" size={15} />
                        </button>
                        <button type="button" onClick={() => { if (window.confirm(`Hapus target "${g.nama}"?`)) onDelete(g.id); }} aria-label="Hapus target" className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg hover:bg-tonerose/10 hover:text-tonerosefg">
                          <Icon name="trash" size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <p className="font-mono text-sm font-bold text-ink">{formatCurrency(g.currentAmount)}</p>
                  <p className="text-[11px] text-mutedfg">dari {formatCurrency(g.targetAmount)}</p>
                </div>
                <ProgressBar value={Number(g.currentAmount)} max={Number(g.targetAmount) || 1} className="mt-1.5" />
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-brandfg">{pct}%</p>
                  {monthsLeft != null && (
                    <p className="text-[11px] text-mutedfg">~{monthsLeft} bulan lagi</p>
                  )}
                </div>

                {canWrite && (
                  <button type="button" onClick={() => toggleTxns(g)} className="mt-2.5 inline-flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-canvas text-xs font-semibold text-mutedfg hover:text-ink">
                    <Icon name={txnGoal?.id === g.id ? 'chevronDown' : 'plus'} size={14} />
                    {txnGoal?.id === g.id ? 'Tutup' : 'Catat transaksi'}
                  </button>
                )}

                {txnGoal?.id === g.id && (
                  <div className="mt-2.5 space-y-2.5">
                    <TxnForm onCancel={() => setTxnGoal(null)} onSubmit={handleTxn} />
                    {(txns[g.id] || []).length > 0 && (
                      <ul className="space-y-1.5 rounded-lg border border-line bg-canvas p-2.5">
                        {(txns[g.id] || []).slice(0, 5).map((t) => (
                          <li key={t.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-mutedfg">{t.note || (t.type === 'in' ? 'Tambahan' : 'Penarikan')} • {t.created_at.slice(0, 10)}</span>
                            <span className={`font-mono font-semibold ${t.type === 'in' ? 'text-toneemeraldfg' : 'text-tonerosefg'}`}>
                              {t.type === 'in' ? '+' : '-'}{formatCurrency(t.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {creating && <GoalForm onCancel={() => setCreating(false)} onSave={handleSave} />}
      {editing && <GoalForm initial={editing} onCancel={() => setEditing(null)} onSave={handleSave} />}

      {canWrite && !creating && !editing && (
        <button type="button" onClick={() => setCreating(true)} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-canvas px-3 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink">
          <Icon name="plus" size={15} /> Tambah Target
        </button>
      )}
    </div>
  );
}

export default TargetTabunganComp;
