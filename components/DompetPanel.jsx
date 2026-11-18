import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS, CurrencyInput } from './ui';
import { accountApi } from '../services/client';

const fmt = (n) => 'Rp ' + (Math.round(Number(n) || 0)).toLocaleString('id-ID');

const inputCls =
  'min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand';

/* Panel Dompet/Rekening keluarga — lihat semua dompet grup, tambah/ubah/hapus,
   transfer antar dompet. canWrite=false (anak/cucu) hanya boleh melihat. */
export function DompetPanel({ accounts = [], users = [], canWrite = true, onChanged, currentUserId = null, isKepalaKeluarga = false }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [nama, setNama] = useState('');
  const [bank, setBank] = useState('');
  const [noRek, setNoRek] = useState('');
  const [saldo, setSaldo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferMsg, setTransferMsg] = useState('');

  // Default pilihan transfer = dompet pertama & kedua
  useEffect(() => {
    if (accounts.length > 0 && !fromId) setFromId(accounts[0].id);
    if (accounts.length > 1 && !toId) setToId(accounts[1].id);
  }, [accounts, fromId, toId]);

  const ownerName = (userId) => {
    const u = users.find((x) => x.id === userId);
    return u ? (u.nickname || u.nama || u.name || u.username) : 'Anggota';
  };

  const totalSaldo = accounts.reduce((sum, a) => sum + (Number(a.saldo) || 0), 0);
  // Edit/hapus hanya pemilik dompet atau kepala keluarga
  const canManage = (a) => canWrite && (a.user_id === currentUserId || isKepalaKeluarga);

  const resetForm = () => {
    setFormOpen(false);
    setEditId(null);
    setNama(''); setBank(''); setNoRek(''); setSaldo('');
    setError('');
  };

  const startEdit = (a) => {
    setEditId(a.id);
    setNama(a.nama || '');
    setBank(a.bank || '');
    setNoRek(a.no_rek || '');
    setSaldo(String(a.saldo ?? 0));
    setFormOpen(true);
    setError('');
  };

  const save = async () => {
    if (!nama.trim()) { setError('Nama dompet wajib diisi'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { nama: nama.trim(), bank: bank.trim() || null, noRek: noRek.trim() || null, saldo: Number(saldo) || 0 };
      if (editId) {
        await accountApi.update(editId, payload);
      } else {
        await accountApi.create(payload);
      }
      resetForm();
      await onChanged?.();
    } catch (e) {
      setError('Gagal menyimpan: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Hapus dompet "${a.nama}"? Saldo ${fmt(a.saldo)} akan ikut hilang dari daftar.`)) return;
    try {
      await accountApi.remove(a.id);
      await onChanged?.();
    } catch (e) {
      window.alert('Gagal menghapus: ' + e.message);
    }
  };

  const doTransfer = async () => {
    const amt = Number(amount) || 0;
    setTransferMsg('');
    if (!fromId || !toId) { setTransferMsg('Pilih dompet asal & tujuan'); return; }
    if (fromId === toId) { setTransferMsg('Dompet asal & tujuan harus berbeda'); return; }
    if (amt <= 0) { setTransferMsg('Nominal harus lebih dari 0'); return; }
    setTransferring(true);
    try {
      await accountApi.transfer({ fromAccountId: fromId, toAccountId: toId, amount: amt, note: note.trim() || null });
      setAmount(''); setNote('');
      setTransferMsg('Transfer berhasil');
      await onChanged?.();
    } catch (e) {
      setTransferMsg('Gagal: ' + e.message);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Total saldo */}
      <div className="rounded-2xl border border-line bg-canvas px-4 py-3">
        <p className="text-[10px] font-semibold uppercase text-mutedfg">Total saldo semua dompet</p>
        <p className="mt-0.5 text-xl font-bold text-ink">{fmt(totalSaldo)}</p>
        <p className="mt-0.5 text-[10px] text-mutedfg">{accounts.length} dompet di keluarga</p>
      </div>

      {/* Daftar dompet */}
      <div className="rounded-2xl border border-line bg-canvas p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-mutedfg">Dompet keluarga</p>
          {canWrite && (
            <button
              type="button"
              onClick={() => { resetForm(); setFormOpen(true); }}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-brandtint px-2.5 text-[11px] font-semibold text-brandfg transition-colors hover:bg-brand/10"
            >
              <Icon name="plus" size={13} />
              Tambah
            </button>
          )}
        </div>

        {accounts.length === 0 ? (
          <p className="text-xs text-mutedfg">Belum ada dompet.{canWrite ? ' Tambah dompet pertama, mis. "BCA Eki" atau "Kas Keluarga".' : ''}</p>
        ) : (
          <ul className="divide-y divide-line">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-2.5 py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brandtint text-brandfg" aria-hidden="true">
                  <Icon name="wallet" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{a.nama}</p>
                  <p className="truncate text-[11px] text-mutedfg">
                    {[a.bank, a.no_rek].filter(Boolean).join(' · ') || 'Tunai/lainnya'} · {ownerName(a.user_id)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-ink">{fmt(a.saldo)}</p>
                  {canManage(a) && (
                    <div className="mt-0.5 flex items-center justify-end gap-1">
                      <button type="button" onClick={() => startEdit(a)} aria-label={`Edit ${a.nama}`} className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-muted hover:text-ink">
                        <Icon name="edit" size={14} />
                      </button>
                      <button type="button" onClick={() => remove(a)} aria-label={`Hapus ${a.nama}`} className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-muted hover:text-danger">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Form tambah/edit dompet */}
      {canWrite && formOpen && (
        <div className="rounded-2xl border border-brand/30 bg-brandtint/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-ink">{editId ? 'Edit dompet' : 'Dompet baru'}</p>
          <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama dompet, mis. BCA Eki" className={inputCls} aria-label="Nama dompet" />
          <div className="grid grid-cols-2 gap-2">
            <input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Bank (mis. BCA)" className={inputCls} aria-label="Bank" />
            <input value={noRek} onChange={(e) => setNoRek(e.target.value)} placeholder="No. rekening" className={inputCls} inputMode="numeric" aria-label="No. rekening" />
          </div>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase text-mutedfg">Saldo {editId ? '(koreksi manual)' : 'awal'}</span>
            <CurrencyInput value={Number(saldo) || 0} onChange={(n) => setSaldo(String(n))} placeholder="0" className={inputCls} aria-label="Saldo" />
          </label>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-mutedfg hover:bg-muted hover:text-ink">Batal</button>
            <button type="button" onClick={save} disabled={saving} className={CTA_CLASS}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </div>
      )}

      {/* Transfer antar dompet */}
      {canWrite && accounts.length >= 2 && (
        <div className="rounded-2xl border border-line bg-canvas p-3 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-mutedfg"><Icon name="repeat" size={13} />Transfer antar dompet</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={inputCls} aria-label="Dari dompet">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.nama} · {ownerName(a.user_id)}</option>)}
            </select>
            <Icon name="repeat" size={16} className="text-mutedfg" aria-hidden="true" />
            <select value={toId} onChange={(e) => setToId(e.target.value)} className={inputCls} aria-label="Ke dompet">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.nama} · {ownerName(a.user_id)}</option>)}
            </select>
          </div>
          <CurrencyInput value={Number(amount) || 0} onChange={(n) => setAmount(String(n))} placeholder="Nominal (Rp)" className={inputCls} aria-label="Nominal transfer" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" className={inputCls} aria-label="Catatan transfer" />
          {transferMsg && <p className={`text-xs font-medium ${transferMsg === 'Transfer berhasil' ? 'text-green' : 'text-danger'}`}>{transferMsg}</p>}
          <div className="flex justify-end">
            <button type="button" onClick={doTransfer} disabled={transferring} className={CTA_CLASS}>{transferring ? 'Memproses…' : 'Transfer'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
export default DompetPanel;
