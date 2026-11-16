import React, { useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Badge, CTA_CLASS, EmptyState } from './ui';
import { useFocusTrap } from './useFocusTrap';

const inputCls =
  'min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand';

const EMPTY = { nama: '', keyword: '', amount: 0, notes: '', active: true };

const todayKey = () => {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

const dayDiff = (iso) => {
  if (!iso) return null;
  const due = new Date(`${iso}T00:00:00`);
  const now = new Date(`${todayKey()}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((due.getTime() - now.getTime()) / 86400000);
};

function statusOf(item) {
  if (!item.active) return { tone: 'gray', label: 'Nonaktif', hint: '' };
  if (!item.intervalDays) {
    return { tone: 'gray', label: 'Belum bisa diperkirakan', hint: 'Butuh minimal 2 pembelian cocok keyword.' };
  }
  const diff = dayDiff(item.nextDue);
  if (diff === null) return { tone: 'gray', label: 'Belum ada jadwal', hint: '' };
  if (diff < 0) return { tone: 'red', label: `Lewat ${Math.abs(diff)} hari`, hint: 'Sudah habis, segera beli.' };
  if (diff === 0) return { tone: 'amber', label: 'Perkiraan habis hari ini', hint: '' };
  return { tone: diff <= 1 ? 'amber' : 'green', label: `H-${diff}`, hint: '' };
}

function Sheet({ title, icon, children, onCancel, footer }) {
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true);
  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      <button type="button" aria-label="Tutup" onClick={onCancel} className="sheet-backdrop absolute inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm" />
      <form ref={panelRef} onSubmit={(e) => e.preventDefault()} noValidate className="sheet-panel absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl border border-b-0 border-line bg-surface/95 p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] shadow-pop backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
              <Icon name={icon} size={16} />
            </span>
            {title}
          </h2>
          <button type="button" onClick={onCancel} aria-label="Tutup" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="max-h-[56vh] space-y-3.5 overflow-y-auto pr-1">{children}</div>
        <div className="mt-5 flex gap-2.5">{footer}</div>
      </form>
    </div>
  );
}

function TxnForm({ initial, onCancel, onSave }) {
  const [f, setF] = useState(initial || EMPTY);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.nama.trim()) { setErr('Nama wajib diisi.'); return; }
    if (!f.keyword.trim()) { setErr('Keyword wajib diisi. Keyword dipakai bot untuk mencocokkan transaksi.'); return; }
    setErr('');
    onSave({
      ...f,
      nama: f.nama.trim(),
      keyword: f.keyword.trim().toLowerCase(),
      amount: Math.abs(Number(f.amount) || 0),
      notes: f.notes.trim(),
    });
  };

  return (
    <Sheet
      title={initial ? 'Ubah Transaksi Berulang' : 'Tambah Transaksi Berulang'}
      icon="repeat"
      onCancel={onCancel}
      footer={(
        <>
          <button type="button" onClick={onCancel} className="min-h-[48px] flex-1 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-mutedfg transition-colors hover:text-ink">
            Batal
          </button>
          <button type="button" onClick={submit} className={`${CTA_CLASS} min-h-[48px] flex-[2]`}>
            <Icon name="check" size={16} />
            {initial ? 'Simpan Perubahan' : 'Tambah'}
          </button>
        </>
      )}
    >
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">Nama</label>
        <input type="text" value={f.nama} onChange={set('nama')} placeholder="cth. Token Listrik, Gas LPG 3kg" className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">Keyword pencocok</label>
        <input type="text" value={f.keyword} onChange={set('keyword')} placeholder="cth. token, gas" className={inputCls} />
        <p className="mt-1 text-[11px] text-mutedfg">Transaksi yang deskripsinya memuat keyword ini dianggap pembelian ulang.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">Nominal perkiraan (Rp)</label>
        <input type="number" inputMode="decimal" min="0" value={f.amount} onChange={set('amount')} placeholder="0" className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">Catatan</label>
        <input type="text" value={f.notes} onChange={set('notes')} placeholder="opsional" className={inputCls} />
      </div>
      <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-canvas px-3.5">
        <input type="checkbox" checked={f.active} onChange={(e) => setF((prev) => ({ ...prev, active: e.target.checked }))} className="h-5 w-5 shrink-0 rounded accent-[#2563EB]" />
        <span className="text-sm text-ink">Aktif (kirim pengingat)</span>
      </label>
      {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
    </Sheet>
  );
}

function PurchaseForm({ item, formatCurrency, onCancel, onSave }) {
  const [amount, setAmount] = useState(item.amount || 0);
  const [date, setDate] = useState(todayKey());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!(Number(amount) > 0)) { setErr('Nominal wajib lebih dari 0.'); return; }
    setErr('');
    setBusy(true);
    try {
      await onSave(item, { amount: Math.abs(Number(amount)), date });
    } catch (e) {
      setErr(e?.message || 'Gagal menyimpan pembelian.');
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Catat Pembelian"
      icon="repeat"
      onCancel={onCancel}
      footer={(
        <>
          <button type="button" onClick={onCancel} className="min-h-[48px] flex-1 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-mutedfg transition-colors hover:text-ink">
            Batal
          </button>
          <button type="button" onClick={submit} disabled={busy} className={`${CTA_CLASS} min-h-[48px] flex-[2] disabled:opacity-60`}>
            <Icon name="check" size={16} />
            {busy ? 'Menyimpan...' : 'Sudah beli'}
          </button>
        </>
      )}
    >
      <p className="text-sm text-ink">
        {item.nama}
        {item.intervalDays ? ` • pola tiap ${item.intervalDays} hari` : ''}
      </p>
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">Nominal (Rp)</label>
        <input type="number" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
        <p className="mt-1 text-[11px] text-mutedfg">Tercatat sebagai pengeluaran {formatCurrency ? formatCurrency(Number(amount) || 0) : ''}.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">Tanggal beli</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </div>
      {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
    </Sheet>
  );
}

export default function RecurringTxnPanel({ items = [], canWrite = false, formatCurrency, onSave, onDelete, onPurchase }) {
  const [form, setForm] = useState(undefined);
  const [buying, setBuying] = useState(null);

  const aktif = useMemo(() => items.filter((i) => i.active), [items]);
  const terdekat = useMemo(() => {
    const sorted = aktif
      .filter((i) => i.nextDue)
      .sort((a, b) => (a.nextDue < b.nextDue ? -1 : a.nextDue > b.nextDue ? 1 : 0));
    return sorted[0] || null;
  }, [aktif]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-line bg-canvas p-3.5">
        <p className="text-[11px] text-mutedfg">Transaksi berulang aktif</p>
        <p className="font-mono text-xl font-bold text-ink">{aktif.length}</p>
        <p className="text-[11px] text-mutedfg">
          {terdekat
            ? `Paling dekat habis: ${terdekat.nama} (${terdekat.nextDue})`
            : 'Belum ada perkiraan habis. Catat minimal 2 pembelian per template.'}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="repeat"
          title="Belum ada transaksi berulang"
          message="Tambahkan misalnya Token Listrik atau Gas LPG. Jadwal dihitung dari selisih 3 pembelian terakhir."
        />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {items.map((item) => {
            const st = statusOf(item);
            return (
              <li key={item.id} className="px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
                    <Icon name="repeat" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.nama}</p>
                    <p className="text-[11px] text-mutedfg">
                      keyword: {item.keyword}
                      {item.intervalDays ? ` • tiap ${item.intervalDays} hari` : ''}
                    </p>
                    <p className="text-[11px] text-mutedfg">
                      {item.lastDate ? `terakhir ${item.lastDate}` : 'belum ada pembelian'}
                      {item.nextDue ? ` • perkiraan habis ${item.nextDue}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold text-brandfg">
                      {formatCurrency ? formatCurrency(item.amount) : item.amount}
                    </p>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                </div>
                {st.hint && <p className="mt-1 text-[11px] text-mutedfg">{st.hint}</p>}
                {canWrite && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBuying(item)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-muted"
                    >
                      <Icon name="check" size={13} /> Sudah beli
                    </button>
                    <button type="button" onClick={() => setForm(item)} aria-label={`Edit ${item.nama}`} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-muted hover:text-ink">
                      <Icon name="edit" size={15} />
                    </button>
                    <button type="button" onClick={() => { if (window.confirm(`Hapus transaksi berulang "${item.nama}"?`)) onDelete(item.id); }} aria-label={`Hapus ${item.nama}`} className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-tonerose/10 hover:text-tonerosefg">
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
          <Icon name="plus" size={15} /> Tambah Transaksi Berulang
        </button>
      )}

      {form !== undefined && (
        <TxnForm
          initial={form}
          onCancel={() => setForm(undefined)}
          onSave={async (payload) => {
            await onSave(form ? { ...payload, id: form.id } : payload);
            setForm(undefined);
          }}
        />
      )}

      {buying && (
        <PurchaseForm
          item={buying}
          formatCurrency={formatCurrency}
          onCancel={() => setBuying(null)}
          onSave={async (item, payload) => {
            await onPurchase(item, payload);
            setBuying(null);
          }}
        />
      )}
    </div>
  );
}
