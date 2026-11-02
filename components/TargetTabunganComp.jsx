import React, { useState } from 'react';
import { Icon } from './Icon';
import { EmptyState, ProgressBar, CTA_CLASS, Badge } from './ui';

const inputCls =
  'min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand';

const emptyGoal = () => ({
  id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  nama: '',
  targetAmount: 0,
  currentAmount: 0,
  targetDate: '',
  achieved: false,
  createdAt: new Date().toISOString(),
});

function GoalForm({ initial, onCancel, onSave }) {
  const [nama, setNama] = useState(initial?.nama || '');
  const [targetAmount, setTargetAmount] = useState(initial?.targetAmount || 0);
  const [currentAmount, setCurrentAmount] = useState(initial?.currentAmount || 0);
  const [targetDate, setTargetDate] = useState(initial?.targetDate || '');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!nama.trim() || !(Number(targetAmount) > 0)) {
      setErr('Nama dan target nominal wajib diisi.');
      return;
    }
    onSave({
      ...(initial || emptyGoal()),
      nama: nama.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount) || 0,
      targetDate: targetDate || null,
      achieved: Number(currentAmount) >= Number(targetAmount),
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-line bg-canvas p-3.5">
      <input value={nama} onChange={(e) => { setNama(e.target.value); setErr(''); }} placeholder="Nama target (mis. Renovasi dapur)" className={inputCls} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-mutedfg">Target (Rp)</label>
          <input type="number" min="0" value={targetAmount} onChange={(e) => setTargetAmount(Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-mutedfg">Terkumpul (Rp)</label>
          <input type="number" min="0" value={currentAmount} onChange={(e) => setCurrentAmount(Number(e.target.value))} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-mutedfg">Target tanggal (opsional)</label>
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputCls} />
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

export function TargetTabunganComp({ goals = [], canWrite = false, onAdd, onUpdate, onDelete, formatCurrency }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const handleSave = (goal) => {
    if (editing) onUpdate(goal.id, goal);
    else onAdd(goal);
    setEditing(null);
    setCreating(false);
  };

  return (
    <div className="space-y-3">
      {goals.length === 0 && !creating ? (
        <EmptyState icon="piggyBank" title="Belum ada target" message="Buat target tabungan untuk memantau impian keluarga." />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-canvas">
          {goals.map((g) => {
            const pct = Number(g.targetAmount) > 0
              ? Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100))
              : 0;
            return (
              <li key={g.id} className="px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{g.nama}</p>
                    <p className="text-[11px] text-mutedfg">
                      {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                      {g.targetDate ? ` • ${g.targetDate}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {g.achieved && <Badge tone="green">Tercapai</Badge>}
                    {canWrite && (
                      <>
                        <button type="button" onClick={() => setEditing(g)} aria-label="Ubah target" className="grid h-9 w-9 place-items-center rounded-lg text-mutedfg hover:bg-muted hover:text-ink">
                          <Icon name="edit" size={15} />
                        </button>
                        <button type="button" onClick={() => onDelete(g.id)} aria-label="Hapus target" className="grid h-9 w-9 place-items-center rounded-lg text-mutedfg hover:bg-tonerose/10 hover:text-tonerosefg">
                          <Icon name="trash" size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <ProgressBar value={Number(g.currentAmount)} max={Number(g.targetAmount) || 1} className="mt-2" />
                <p className="mt-1 text-right text-[11px] font-semibold text-brandfg">{pct}%</p>
              </li>
            );
          })}
        </ul>
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
