import React, { useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Badge, CTA_CLASS, EmptyState } from './ui';
import { useFocusTrap } from './useFocusTrap';

const CATEGORIES = [
  { id: 'listrik', label: 'Listrik', icon: 'zap' },
  { id: 'air', label: 'Air', icon: 'activity' },
  { id: 'internet', label: 'Internet', icon: 'monitor' },
  { id: 'streaming', label: 'Streaming', icon: 'sparkles' },
  { id: 'asuransi', label: 'Asuransi', icon: 'shield' },
  { id: 'lainnya', label: 'Lainnya', icon: 'sparkles' },
];
const catMeta = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const inputCls =
  'min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand';

const EMPTY = { name: '', category: 'lainnya', amount: 0, billing_day: 1, active: true };

function SubForm({ initial, onCancel, onSave }) {
  const [f, setF] = useState(initial || EMPTY);
  const [err, setErr] = useState('');
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true);
  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) { setErr('Nama wajib diisi.'); return; }
    const day = Number(f.billing_day);
    if (!(day >= 1 && day <= 31)) { setErr('Tanggal tagih harus 1-31.'); return; }
    setErr('');
    onSave({ ...f, name: f.name.trim(), amount: Number(f.amount) || 0, billing_day: day });
  };

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      <button type="button" aria-label="Tutup" onClick={onCancel} className="sheet-backdrop absolute inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm" />
      <form ref={panelRef} onSubmit={submit} noValidate className="sheet-panel absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl border border-b-0 border-line bg-surface/95 p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] shadow-pop backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
              <Icon name="repeat" size={16} />
            </span>
            {initial ? 'Ubah Langganan' : 'Tambah Langganan'}
          </h2>
          <button type="button" onClick={onCancel} aria-label="Tutup" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="max-h-[56vh] space-y-3.5 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-xs font-semibold text-mutedfg">Nama</label>
            <input type="text" value={f.name} onChange={set('name')} placeholder="cth. Listrik PLN, Wi-Fi, Spotify" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mutedfg">Kategori</label>
            <select value={f.category} onChange={set('category')} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-mutedfg">Nominal (Rp)</label>
              <input type="number" inputMode="decimal" min="0" value={f.amount} onChange={set('amount')} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-mutedfg">Tanggal tagih</label>
              <input type="number" inputMode="numeric" min="1" max="31" value={f.billing_day} onChange={set('billing_day')} placeholder="1-31" className={inputCls} />
            </div>
          </div>
          <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-canvas px-3.5">
            <input type="checkbox" checked={f.active} onChange={(e) => setF((prev) => ({ ...prev, active: e.target.checked }))} className="h-5 w-5 shrink-0 rounded accent-[#2563EB]" />
            <span className="text-sm text-ink">Aktif</span>
          </label>
          {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
        </div>

        <div className="mt-5 flex gap-2.5">
          <button type="button" onClick={onCancel} className="min-h-[48px] flex-1 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-mutedfg transition-colors hover:text-ink">
            Batal
          </button>
          <button type="submit" className={`${CTA_CLASS} min-h-[48px] flex-[2]`}>
            <Icon name="check" size={16} />
            {initial ? 'Simpan Perubahan' : 'Tambah'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SubscriptionsComp({ subs = [], canWrite = false, formatCurrency, onSave, onDelete }) {
  const [form, setForm] = useState(null);
  const monthlyTotal = useMemo(() => subs.filter((s) => s.active).reduce((sum, s) => sum + (Number(s.amount) || 0), 0), [subs]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-line bg-canvas p-3.5">
        <p className="text-[11px] text-mutedfg">Total biaya bulanan (aktif)</p>
        <p className="font-mono text-xl font-bold text-ink">{formatCurrency(monthlyTotal)}</p>
        <p className="text-[11px] text-mutedfg">{subs.filter((s) => s.active).length} langganan aktif</p>
      </div>

      {subs.length === 0 ? (
        <EmptyState icon="repeat" title="Belum ada langganan" message="Tambahkan langganan/utilitas berkala di sini." />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {subs.map((s) => {
            const meta = catMeta(s.category);
            return (
              <li key={s.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
                  <Icon name={meta.icon} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                  <p className="text-[11px] text-mutedfg">
                    {meta.label} • tagih tgl {s.billing_day}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold text-brandfg">{formatCurrency(s.amount)}</p>
                  {s.active ? <Badge tone="green">Aktif</Badge> : <Badge tone="gray">Nonaktif</Badge>}
                </div>
                {canWrite && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => setForm(s)} aria-label={`Edit ${s.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-muted hover:text-ink">
                      <Icon name="edit" size={15} />
                    </button>
                    <button type="button" onClick={() => { if (window.confirm(`Hapus langganan "${s.name}"?`)) onDelete(s.id); }} aria-label={`Hapus ${s.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-tonerose/10 hover:text-tonerosefg">
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canWrite && (
        <button type="button" onClick={() => setForm(null)} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-canvas px-3 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink">
          <Icon name="plus" size={15} /> Tambah Langganan
        </button>
      )}

      {form !== undefined && (
        <SubForm
          initial={form}
          onCancel={() => setForm(undefined)}
          onSave={async (item) => {
            await onSave(item);
            setForm(undefined);
          }}
        />
      )}
    </div>
  );
}
