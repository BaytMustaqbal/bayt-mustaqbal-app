import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Badge, CTA_CLASS, CurrencyInput } from './ui';
import { settingsApi } from '../services/client';

const RULE_TYPES = [
  { id: 'category_threshold', label: 'Ambang Kategori' },
  { id: 'large_txn', label: 'Transaksi Besar' },
  { id: 'total_threshold', label: 'Ambang Total Bulanan' },
  { id: 'bill_due', label: 'Tagihan Mendekat' },
];

const EXPENSE_CATS = [
  { id: 'belanja', label: 'Belanja' },
  { id: 'utilitas', label: 'Utilitas' },
  { id: 'pendidikan', label: 'Pendidikan' },
  { id: 'transportasi', label: 'Transportasi' },
  { id: 'kesehatan', label: 'Kesehatan' },
  { id: 'ibadah', label: 'Ibadah & Sosial' },
  { id: 'rumah', label: 'Rumah & Cicilan' },
  { id: 'hiburan', label: 'Hiburan & Liburan' },
  { id: 'tabungan', label: 'Tabungan & Utang' },
];

const labelOf = (id) => RULE_TYPES.find((t) => t.id === id)?.label || id;
const catLabel = (id) => EXPENSE_CATS.find((c) => c.id === id)?.label || id;

const inputCls =
  'min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand';

const emptyRule = () => ({
  id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  type: 'category_threshold',
  category: 'hiburan',
  threshold: 500000,
  pct: 90,
  days: 7,
  enabled: true,
});

export function RulesComp() {
  const [rules, setRules] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyRule());
  const [saved, setSaved] = useState(false);

  const load = async () => {
    try {
      const rows = await settingsApi.fetchAll();
      const row = (rows || []).find((s) => s.key === 'rules');
      if (row?.value) {
        try {
          const arr = JSON.parse(row.value);
          if (Array.isArray(arr)) setRules(arr);
        } catch { /* default */ }
      }
    } catch { /* biarkan */ } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { load(); }, []);

  const persist = async (next) => {
    setRules(next);
    setSaved(false);
    try {
      await settingsApi.upsert('rules', JSON.stringify(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.warn('Gagal simpan aturan:', e.message);
    }
  };

  const addRule = () => {
    if (!draft.name.trim()) return;
    persist([...rules, { ...draft, name: draft.name.trim() }]);
    setCreating(false);
    setDraft(emptyRule());
  };

  const toggleRule = (id) => {
    persist(rules.map((r) => (r.id === id ? { ...r, enabled: r.enabled === false } : r)));
  };

  const removeRule = (id) => {
    persist(rules.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3">
      {saved && <Badge tone="green">Tersimpan</Badge>}

      {!loaded ? (
        <p className="text-xs text-mutedfg">Memuat…</p>
      ) : rules.length === 0 && !creating ? (
        <p className="text-xs text-mutedfg">Belum ada aturan. Tambah untuk otomasi pengingat.</p>
      ) : null}

      {/* Daftar aturan */}
      {rules.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line bg-canvas">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{r.name}</p>
                <p className="truncate text-[11px] text-mutedfg">
                  {labelOf(r.type)}
                  {r.type === 'category_threshold' ? ` · ${catLabel(r.category)} ≥ Rp ${(r.threshold || 0).toLocaleString('id-ID')}` : ''}
                  {r.type === 'large_txn' ? ` · ≥ Rp ${(r.threshold || 0).toLocaleString('id-ID')}` : ''}
                  {r.type === 'total_threshold' ? ` · ${r.pct}% pendapatan` : ''}
                  {r.type === 'bill_due' ? ` · ${r.days} hari` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleRule(r.id)}
                aria-pressed={r.enabled !== false}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${r.enabled === false ? 'bg-muted' : 'bg-brand'}`}
                aria-label={r.enabled === false ? 'Aktifkan aturan' : 'Nonaktifkan aturan'}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${r.enabled === false ? 'left-0.5' : 'left-[22px]'}`} />
              </button>
              <button
                type="button"
                onClick={() => removeRule(r.id)}
                aria-label="Hapus aturan"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-tonerose/10 hover:text-tonerosefg"
              >
                <Icon name="trash" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Form tambah */}
      {creating ? (
        <div className="space-y-3 rounded-xl border border-line bg-canvas p-3.5">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Nama aturan (mis. Batas hiburan)"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-mutedfg">Jenis</label>
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={inputCls}>
                {RULE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            {draft.type === 'category_threshold' && (
              <div>
                <label className="mb-1 block text-[11px] text-mutedfg">Kategori</label>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={inputCls}>
                  {EXPENSE_CATS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {(draft.type === 'category_threshold' || draft.type === 'large_txn') && (
            <div>
              <label className="mb-1 block text-[11px] text-mutedfg">Ambang nominal (Rp)</label>
              <CurrencyInput
                value={draft.threshold}
                onChange={(n) => setDraft({ ...draft, threshold: n })}
                className={inputCls}
              />
            </div>
          )}
          {draft.type === 'total_threshold' && (
            <div>
              <label className="mb-1 block text-[11px] text-mutedfg">Persentase pendapatan (%)</label>
              <input
                type="number"
                min="1"
                max="200"
                value={draft.pct}
                onChange={(e) => setDraft({ ...draft, pct: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
          )}
          {draft.type === 'bill_due' && (
            <div>
              <label className="mb-1 block text-[11px] text-mutedfg">Jatuh tempo dalam (hari)</label>
              <input
                type="number"
                min="1"
                value={draft.days}
                onChange={(e) => setDraft({ ...draft, days: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setCreating(false)} className="min-h-[44px] flex-1 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-mutedfg hover:text-ink">
              Batal
            </button>
            <button type="button" onClick={addRule} className={`${CTA_CLASS} min-h-[44px] flex-[2]`}>
              <Icon name="check" size={15} />
              Simpan Aturan
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-canvas px-3 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink"
        >
          <Icon name="plus" size={15} />
          Tambah Aturan
        </button>
      )}
    </div>
  );
}

export default RulesComp;
