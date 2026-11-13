import React, { useCallback, useEffect, useState } from 'react';
import { debtApi } from '../services/client';
import { Card, SectionHeader, EmptyState, Badge, CTA_CLASS } from './ui';
import { Icon } from './Icon';

/** Utang-Piutang keluarga — mandiri (fetch + CRUD via debtApi). */
export default function DebtComp({ users = [], canWrite = true, formatCurrency }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [lenderId, setLenderId] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const rows = await debtApi.fetch();
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!title.trim()) {
      setError('Keterangan wajib diisi.');
      return;
    }
    if (!(Number(amount) > 0)) {
      setError('Jumlah harus angka positif.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const created = await debtApi.create({
        title: title.trim(),
        amount: Number(amount),
        lenderId: lenderId || null,
        borrowerId: borrowerId || null,
      });
      setItems((prev) => [...prev, created]);
      setTitle(''); setAmount(''); setLenderId(''); setBorrowerId('');
    } catch (e) {
      setError('Gagal menambah: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const settle = async (item) => {
    const nextStatus = item.status === 'settled' ? 'open' : 'settled';
    const updated = await debtApi.update(item.id, { status: nextStatus });
    setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)));
  };

  const remove = async (item) => {
    if (!window.confirm(`Hapus catatan utang "${item.title}"?`)) return;
    await debtApi.remove(item.id);
    setItems((prev) => prev.filter((it) => it.id !== item.id));
  };

  const userName = (id) => {
    const u = users.find((x) => x.id === id);
    return u ? u.name : '';
  };

  const open = items.filter((i) => i.status === 'open');
  const closed = items.filter((i) => i.status === 'settled');
  const totalOpen = open.reduce((s, i) => s + i.amount, 0);

  const memberOptions = (exclude) =>
    users
      .filter((u) => u.id !== exclude)
      .map((u) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ));

  const row = (item, settled) => (
    <Card key={item.id} className={`flex items-center gap-3 p-3.5 ${settled ? 'opacity-70' : ''}`}>
      <button
        type="button"
        onClick={() => settle(item)}
        aria-label={settled ? 'Buka lagi' : 'Tandai lunas'}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${settled ? 'border-brand bg-brandtint text-brandfg' : 'border-line text-mutedfg hover:border-brand hover:text-brandfg'}`}
      >
        <Icon name="check" size={15} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium text-ink ${settled ? 'line-through' : ''}`}>{item.title}</p>
        <p className="text-[11px] text-mutedfg">
          {userName(item.lenderId) ? `${userName(item.lenderId)} → ${userName(item.borrowerId) || 'keluarga'}` : 'Internal keluarga'}
        </p>
      </div>
      <span className={`shrink-0 font-mono text-sm font-bold ${settled ? 'text-mutedfg' : 'text-brandfg'}`}>
        {formatCurrency(item.amount)}
      </span>
      <button type="button" onClick={() => remove(item)} aria-label="Hapus" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mutedfg hover:bg-muted hover:text-danger">
        <Icon name="trash" size={15} />
      </button>
    </Card>
  );

  return (
    <div>
      <SectionHeader icon="handCoins" title="Utang-Piutang" subtitle="Catat pinjaman antar anggota" />

      {canWrite && (
        <Card className="mb-4 p-4">
          <div className="space-y-2.5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="mis. Belanja dapur bareng"
              className="input-field min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none focus:border-brand"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Jumlah"
                className="input-field min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand"
              />
              <select value={lenderId} onChange={(e) => setLenderId(e.target.value)} className="input-field min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand">
                <option value="">Memberi (opsional)</option>
                {memberOptions(borrowerId)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <select value={borrowerId} onChange={(e) => setBorrowerId(e.target.value)} className="input-field min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand">
                <option value="">Penerima (opsional)</option>
                {memberOptions(lenderId)}
              </select>
              <div />
            </div>
            {error && <p className="text-xs font-medium text-danger">{error}</p>}
            <button type="button" onClick={add} disabled={saving} className={`${CTA_CLASS} min-h-[44px] w-full`}>
              <Icon name="plus" size={16} />
              {saving ? 'Menyimpan…' : 'Tambah Utang'}
            </button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-mutedfg">Memuat…</p>
      ) : items.length === 0 ? (
        <EmptyState icon="handCoins" title="Belum ada catatan utang" message="Catat pinjaman pertama antar anggota." />
      ) : (
        <div className="space-y-3">
          {open.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-mutedfg">Belum lunas ({open.length})</p>
                <Badge tone="amber">{formatCurrency(totalOpen)}</Badge>
              </div>
              <div className="space-y-2">{open.map((i) => row(i, false))}</div>
            </>
          )}
          {closed.length > 0 && (
            <>
              <p className="text-xs font-semibold text-mutedfg">Lunas ({closed.length})</p>
              <div className="space-y-2">{closed.map((i) => row(i, true))}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
