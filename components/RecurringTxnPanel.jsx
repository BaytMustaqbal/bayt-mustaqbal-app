import React, { useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Badge, CTA_CLASS, EmptyState, CurrencyInput } from './ui';
import { useFocusTrap } from './useFocusTrap';

const inputCls =
  'min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand';

const TYPE_OPTIONS = [
  { value: 'pengeluaran', label: 'Pengeluaran' },
  { value: 'service', label: 'Service' },
];

const SERVICE_CATEGORIES = [
  { value: 'service', label: 'Service' },
  { value: 'ganti_part', label: 'Ganti Part' },
  { value: 'perbaikan', label: 'Perbaikan' },
  { value: 'lainnya', label: 'Lainnya' },
];

const EMPTY = {
  type: 'pengeluaran',
  nama: '',
  keyword: '',
  amount: 0,
  categoryId: '',
  accountId: '',
  vehicleId: '',
  serviceCategory: 'service',
  notes: '',
  active: true,
};

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
  if (diff < 0) return { tone: 'red', label: `Lewat ${Math.abs(diff)} hari`, hint: 'Sudah lewat perkiraan, segera lakukan.' };
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

function TxnForm({ initial, categories = [], accounts = [], vehicles = [], onCancel, onSave }) {
  const [f, setF] = useState(initial || EMPTY);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.nama.trim()) { setErr('Nama wajib diisi.'); return; }
    if (!f.keyword.trim()) { setErr('Keyword wajib diisi. Keyword dipakai untuk mencocokkan riwayat.'); return; }
    if (f.type === 'service' && !f.vehicleId) { setErr('Kendaraan wajib dipilih untuk tipe service.'); return; }
    setErr('');
    onSave({
      ...f,
      nama: f.nama.trim(),
      keyword: f.keyword.trim().toLowerCase(),
      amount: Math.abs(Number(f.amount) || 0),
      notes: (f.notes || '').trim(),
      categoryId: f.categoryId || '',
      accountId: f.accountId || '',
      vehicleId: f.type === 'service' ? f.vehicleId : '',
      serviceCategory: f.type === 'service' ? (f.serviceCategory || 'service') : '',
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
        <label className="mb-1 block text-xs font-semibold text-mutedfg">Tipe</label>
        <select value={f.type} onChange={set('type')} className={inputCls}>
          {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">Nama</label>
        <input type="text" value={f.nama} onChange={set('nama')} placeholder="cth. Token Listrik, Ganti Oli" className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">Keyword pencocok</label>
        <input type="text" value={f.keyword} onChange={set('keyword')} placeholder="cth. token, oli" className={inputCls} />
        <p className="mt-1 text-[11px] text-mutedfg">
          {f.type === 'service'
            ? 'Riwayat service yang item-nya memuat keyword ini dipakai untuk menghitung interval.'
            : 'Transaksi yang deskripsinya memuat keyword ini dianggap pembelian ulang.'}
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">
          {f.type === 'service' ? 'Biaya perkiraan (Rp)' : 'Nominal perkiraan (Rp)'}
        </label>
        <CurrencyInput value={Number(f.amount) || 0} onChange={(n) => setF((prev) => ({ ...prev, amount: String(n) }))} placeholder="Rp 0" className={inputCls} />
      </div>

      {f.type === 'service' && (
        <>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mutedfg">Kendaraan</label>
            <select value={f.vehicleId} onChange={set('vehicleId')} className={inputCls}>
              <option value="">Pilih kendaraan</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nama}{v.plat ? ` (${v.plat})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mutedfg">Kategori service</label>
            <select value={f.serviceCategory} onChange={set('serviceCategory')} className={inputCls}>
              {SERVICE_CATEGORIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-mutedfg">
            {f.type === 'service' ? 'Kategori biaya' : 'Kategori'}
          </label>
          <select value={f.categoryId} onChange={set('categoryId')} className={inputCls}>
            <option value="">Tanpa kategori</option>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-mutedfg">Dompet</label>
          <select value={f.accountId} onChange={set('accountId')} className={inputCls}>
            <option value="">Tanpa dompet</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.nama}{a.bank ? ` (${a.bank})` : ''}</option>)}
          </select>
        </div>
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
  const isService = item.type === 'service';
  const [amount, setAmount] = useState(item.amount || 0);
  const [date, setDate] = useState(todayKey());
  const [alsoExpense, setAlsoExpense] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!(Number(amount) > 0)) { setErr('Nominal wajib lebih dari 0.'); return; }
    setErr('');
    setBusy(true);
    try {
      await onSave(item, {
        amount: Math.abs(Number(amount)),
        date,
        ...(isService ? { alsoExpense } : {}),
      });
    } catch (e) {
      setErr(e?.message || 'Gagal menyimpan.');
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={isService ? 'Catat Service' : 'Catat Pembelian'}
      icon="repeat"
      onCancel={onCancel}
      footer={(
        <>
          <button type="button" onClick={onCancel} className="min-h-[48px] flex-1 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-mutedfg transition-colors hover:text-ink">
            Batal
          </button>
          <button type="button" onClick={submit} disabled={busy} className={`${CTA_CLASS} min-h-[48px] flex-[2] disabled:opacity-60`}>
            <Icon name="check" size={16} />
            {busy ? 'Menyimpan...' : (isService ? 'Sudah dilakukan' : 'Sudah beli')}
          </button>
        </>
      )}
    >
      <p className="text-sm text-ink">
        {item.nama}
        {item.intervalDays ? ` • pola tiap ${item.intervalDays} hari` : ''}
      </p>
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">{isService ? 'Biaya (Rp)' : 'Nominal (Rp)'}</label>
        <CurrencyInput value={Number(amount) || 0} onChange={(n) => setAmount(String(n))} className={inputCls} />
        <p className="mt-1 text-[11px] text-mutedfg">
          {isService ? 'Tercatat di riwayat service' : 'Tercatat sebagai pengeluaran'}
          {formatCurrency ? ` ${formatCurrency(Number(amount) || 0)}` : ''}.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-mutedfg">{isService ? 'Tanggal service' : 'Tanggal beli'}</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </div>
      {isService && (
        <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-canvas px-3.5">
          <input type="checkbox" checked={alsoExpense} onChange={(e) => setAlsoExpense(e.target.checked)} className="h-5 w-5 shrink-0 rounded accent-[#2563EB]" />
          <span className="text-sm text-ink">Catat juga sebagai pengeluaran</span>
        </label>
      )}
      {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
    </Sheet>
  );
}

export default function RecurringTxnPanel({
  items = [],
  canWrite = false,
  formatCurrency,
  categories = [],
  accounts = [],
  vehicles = [],
  onSave,
  onDelete,
  onPurchase,
}) {
  const [form, setForm] = useState(undefined);
  const [buying, setBuying] = useState(null);

  const aktif = useMemo(() => items.filter((i) => i.active), [items]);
  const terdekat = useMemo(() => {
    const sorted = aktif
      .filter((i) => i.nextDue)
      .sort((a, b) => (a.nextDue < b.nextDue ? -1 : a.nextDue > b.nextDue ? 1 : 0));
    return sorted[0] || null;
  }, [aktif]);
  const vehicleName = useMemo(() => {
    const map = new Map(vehicles.map((v) => [v.id, v.nama]));
    return (id) => map.get(id) || '';
  }, [vehicles]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-line bg-canvas p-3.5">
        <p className="text-[11px] text-mutedfg">Transaksi berulang aktif</p>
        <p className="font-mono text-xl font-bold text-ink">{aktif.length}</p>
        <p className="text-[11px] text-mutedfg">
          {terdekat
            ? `Paling dekat: ${terdekat.nama} (${terdekat.nextDue})`
            : 'Belum ada perkiraan habis. Catat minimal 2 pembelian per template.'}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="repeat"
          title="Belum ada transaksi berulang"
          message="Tambahkan misalnya Token Listrik atau Ganti Oli. Jadwal dihitung dari selisih 3 pembelian/riwayat terakhir."
        />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {items.map((item) => {
            const st = statusOf(item);
            const isService = item.type === 'service';
            return (
              <li key={item.id} className="px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
                    <Icon name={isService ? 'wrench' : 'repeat'} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{item.nama}</p>
                    <p className="text-[11px] text-mutedfg">
                      keyword: {item.keyword}
                      {isService ? ` • service${vehicleName(item.vehicleId) ? ` ${vehicleName(item.vehicleId)}` : ''}` : ''}
                      {item.intervalDays ? ` • tiap ${item.intervalDays} hari` : ''}
                    </p>
                    <p className="text-[11px] text-mutedfg">
                      {item.lastDate ? `terakhir ${item.lastDate}` : 'belum ada catatan'}
                      {item.nextDue ? ` • perkiraan habis ${item.nextDue}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold text-brandfg">
                      {formatCurrency ? formatCurrency(item.amount) : item.amount}
                    </p>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={isService ? 'brand' : 'gray'}>{isService ? 'Service' : 'Pengeluaran'}</Badge>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
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
                      <Icon name="check" size={13} /> {isService ? 'Sudah dilakukan' : 'Sudah beli'}
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
          categories={categories}
          accounts={accounts}
          vehicles={vehicles}
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
