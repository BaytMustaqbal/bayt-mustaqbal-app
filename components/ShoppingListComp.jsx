import React, { useState } from 'react';
import { Icon } from './Icon';
import { Badge, Card, CTA_CLASS, ProgressBar } from './ui';
import { itemSubtotal, progressOf, sumItems } from './shoppingList';

/* Daftar Belanja bulanan.
   Komponen ini hanya mengurus tampilan + input; penyimpanan (catatan backend)
   dan pencatatan pengeluaran ditangani App lewat callback. */
export function ShoppingList({
  state,
  formatCurrency,
  canWrite,
  onAddItem,
  onToggle,
  onRemove,
  onSaveTemplate,
  onFinish,
}) {
  const [nama, setNama] = useState('');
  const [qty, setQty] = useState('1');
  const [harga, setHarga] = useState('');
  const [confirming, setConfirming] = useState(false);

  const items = state.items || [];
  const { done, total, pct } = progressOf(items);
  const totalEstimasi = sumItems(items);
  const totalTercentang = sumItems(items, true);
  const sudahDicatat = !!state.expenseId;

  const submitItem = (e) => {
    e.preventDefault();
    if (!nama.trim()) return;
    onAddItem({ nama, qty, harga });
    setNama('');
    setQty('1');
    setHarga('');
  };

  const konfirmasi = () => {
    setConfirming(false);
    onFinish();
  };

  return (
    <div className="space-y-4">
      {/* Ringkasan progres + total */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">
            {done} dari {total} item selesai
          </p>
          <span className="font-mono text-xs text-mutedfg">{pct}%</span>
        </div>
        <ProgressBar value={done} max={total || 1} className="mt-2.5" />
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-mutedfg">Estimasi</p>
            <p className="mt-0.5 truncate font-mono text-sm font-bold text-ink">{formatCurrency(totalEstimasi)}</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[11px] font-medium uppercase tracking-wide text-mutedfg">Tercentang</p>
            <p className="mt-0.5 truncate font-mono text-sm font-bold text-brandfg">{formatCurrency(totalTercentang)}</p>
          </div>
        </div>
      </Card>

      {/* Form tambah item */}
      {canWrite ? (
        <Card className="p-4 sm:p-5">
          <form onSubmit={submitItem} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="block flex-1">
                <span className="mb-1 block text-xs font-medium text-mutedfg">Nama item</span>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="mis. Beras 5 kg"
                  className="input-field min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand"
                />
              </label>
              <div className="flex gap-3">
                <label className="block w-20 shrink-0">
                  <span className="mb-1 block text-xs font-medium text-mutedfg">Qty</span>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="input-field min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 font-mono text-sm text-ink outline-none transition-colors focus:border-brand"
                  />
                </label>
                <label className="block min-w-0 flex-1 sm:w-36 sm:flex-none">
                  <span className="mb-1 block text-xs font-medium text-mutedfg">Estimasi harga</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={harga}
                    onChange={(e) => setHarga(e.target.value)}
                    placeholder="0"
                    className="input-field min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 font-mono text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand"
                  />
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={!nama.trim()}
              className={`${CTA_CLASS} w-full sm:w-auto`}
            >
              <Icon name="plus" size={16} />
              Tambah item
            </button>
          </form>
        </Card>
      ) : (
        <p className="rounded-xl border border-line bg-muted/40 px-4 py-3 text-xs text-mutedfg">
          Mode baca-saja: daftar belanja hanya bisa dilihat.
        </p>
      )}

      {/* Daftar item */}
      {items.length === 0 ? (
        <Card className="px-5 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
            <Icon name="shoppingBag" size={24} />
          </span>
          <p className="mt-4 font-semibold text-ink">Daftar belanja bulan ini masih kosong</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-mutedfg">
            Tambahkan item di atas. Kalau sudah punya daftar rutin, simpan sebagai template supaya bulan depan terisi otomatis.
          </p>
        </Card>
      ) : (
        <ul className="stagger space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <Card className={`flex items-center gap-2 p-2.5 sm:p-3 ${it.checked ? 'opacity-60' : ''}`}>
                <button
                  type="button"
                  onClick={() => canWrite && onToggle(it.id)}
                  aria-pressed={it.checked}
                  aria-label={`${it.checked ? 'Batalkan centang' : 'Centang'} ${it.nama}`}
                  disabled={!canWrite}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition-colors ${it.checked ? 'border-success/40 bg-success/15 text-success' : 'border-line bg-canvas text-mutedfg hover:border-brand/50 hover:text-brandfg'}`}
                >
                  <Icon name="check" size={17} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium text-ink ${it.checked ? 'line-through' : ''}`}>{it.nama}</p>
                  <p className="truncate text-xs text-mutedfg">
                    {it.qty} × {formatCurrency(it.harga)}
                  </p>
                </div>
                <p className="shrink-0 text-right font-mono text-sm font-semibold text-ink">
                  {formatCurrency(itemSubtotal(it))}
                </p>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => onRemove(it.id)}
                    aria-label={`Hapus ${it.nama}`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-tonerose/15 hover:text-tonerosefg"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Aksi bawah: template + selesai belanja */}
      {canWrite && (
        <Card className="p-4 sm:p-5">
          {sudahDicatat ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="green">
                <Icon name="circleCheck" size={13} className="mr-1" />
                Sudah dicatat ke pengeluaran
              </Badge>
              <p className="text-xs text-mutedfg">Item tercentang tidak dicatat dua kali.</p>
            </div>
          ) : confirming ? (
            <div className="space-y-3">
              <p className="text-sm text-ink">
                Catat pengeluaran <span className="font-mono font-bold text-brandfg">{formatCurrency(totalTercentang)}</span> untuk {done} item tercentang?
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={konfirmasi} className={CTA_CLASS}>
                  <Icon name="check" size={16} />
                  Ya, catat
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onSaveTemplate}
                disabled={items.length === 0}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink disabled:opacity-50"
              >
                <Icon name="repeat" size={16} />
                Simpan sebagai template
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={done === 0}
                className={`${CTA_CLASS} disabled:cursor-not-allowed`}
              >
                <Icon name="receipt" size={16} />
                Selesai belanja
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default ShoppingList;