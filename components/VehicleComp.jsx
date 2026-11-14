import React, { useCallback, useEffect, useState } from 'react';
import { vehicleApi } from '../services/client';
import { Card, SectionHeader, EmptyState, Badge, CTA_CLASS } from './ui';
import { Icon } from './Icon';

/** Kendaraan — mandiri (fetch + CRUD via vehicleApi). */
export default function VehicleComp({ vehicles = [], canWrite = true, formatCurrency, onAdd, onUpdate, onRemove }) {
  const [items, setItems] = useState(vehicles);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nama: '', jenis: '', merek: '', plat: '', odometer: '' });
  const [err, setErr] = useState('');

  useEffect(() => {
    setItems(vehicles);
    setLoading(false);
  }, [vehicles]);

  const reset = () => {
    setEditingId(null);
    setForm({ nama: '', jenis: '', merek: '', plat: '', odometer: '' });
    setErr('');
    setShowForm(false);
  };

  const openAdd = () => {
    reset();
    setShowForm(true);
  };

  const openEdit = (v) => {
    setEditingId(v.id);
    setForm({
      nama: v.nama || '',
      jenis: v.jenis || '',
      merek: v.merek || '',
      plat: v.plat || '',
      odometer: v.odometer != null ? String(v.odometer) : '',
    });
    setErr('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.nama.trim()) {
      setErr('Nama kendaraan wajib diisi.');
      return;
    }
    setErr('');
    const payload = {
      nama: form.nama.trim(),
      jenis: form.jenis.trim() || null,
      merek: form.merek.trim() || null,
      plat: form.plat.trim() || null,
      odometer: Number(form.odometer) || 0,
    };
    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onAdd(payload);
    }
    reset();
  };

  const remove = async (v) => {
    if (!window.confirm(`Hapus kendaraan "${v.nama}"? Inventaris/riwayat tetap tersimpan.`)) return;
    await onRemove(v.id);
  };

  return (
    <div>
      <SectionHeader icon="car" title="Kendaraan" subtitle={`${items.length} kendaraan`} actionLabel={canWrite ? 'Tambah' : undefined} onAction={canWrite ? openAdd : undefined} />

      {loading ? (
        <p className="text-sm text-mutedfg">Memuat…</p>
      ) : items.length === 0 ? (
        <EmptyState icon="car" title="Belum ada kendaraan" message="Tambahkan kendaraan pertama untuk memisahkan service & perawatannya." />
      ) : (
        <ul className="space-y-2">
          {items.map((v) => (
            <Card key={v.id} className="flex items-center gap-3 p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brandtint text-brandfg" aria-hidden="true">
                <Icon name={v.jenis === 'Motor' ? 'bike' : 'car'} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{v.nama}</p>
                <p className="text-[11px] text-mutedfg">
                  {v.jenis || 'Kendaraan'} {v.merek ? `· ${v.merek}` : ''} {v.plat ? `· ${v.plat}` : ''}
                </p>
                <p className="text-[11px] text-mutedfg">Odometer: {formatCurrency ? v.odometer.toLocaleString('id-ID') : v.odometer} km</p>
              </div>
              {canWrite && (
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => openEdit(v)} aria-label={`Ubah ${v.nama}`} className="grid h-9 w-9 place-items-center rounded-lg text-mutedfg hover:bg-muted hover:text-ink">
                    <Icon name="edit" size={14} />
                  </button>
                  <button type="button" onClick={() => remove(v)} aria-label={`Hapus ${v.nama}`} className="grid h-9 w-9 place-items-center rounded-lg text-mutedfg hover:bg-tonerose/15 hover:text-tonerosefg">
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              )}
            </Card>
          ))}
        </ul>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 p-4 sm:p-5">
            <h3 className="mb-4 text-lg font-bold text-ink">{editingId ? 'Ubah Kendaraan' : 'Tambah Kendaraan'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-mutedfg mb-1">Nama</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="mis. Motor Rezki" className="input-field w-full rounded-xl border border-line bg-canvas px-3" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-mutedfg mb-1">Jenis</label>
                  <div className="flex items-center gap-2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brandtint text-brandfg" aria-hidden="true">
                      <Icon name={form.jenis === 'Motor' ? 'bike' : form.jenis === 'Mobil' ? 'car' : 'car'} size={16} />
                    </span>
                    <select
                      value={form.jenis}
                      onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                      className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                    >
                      <option value="">Pilih jenis</option>
                      <option value="Motor">Motor</option>
                      <option value="Mobil">Mobil</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-mutedfg mb-1">Merek</label>
                  <input type="text" value={form.merek} onChange={(e) => setForm({ ...form, merek: e.target.value })} placeholder="Honda/Yamaha" className="input-field w-full rounded-xl border border-line bg-canvas px-3" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-mutedfg mb-1">Plat</label>
                  <input type="text" value={form.plat} onChange={(e) => setForm({ ...form, plat: e.target.value })} placeholder="B 1234 CD" className="input-field w-full rounded-xl border border-line bg-canvas px-3" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-mutedfg mb-1">Odometer (km)</label>
                  <input type="number" min="0" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} className="input-field w-full rounded-xl border border-line bg-canvas px-3" />
                </div>
              </div>
              {err && <p className="text-xs font-medium text-danger">{err}</p>}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button type="button" onClick={reset} className="rounded-lg px-3 py-1.5 text-sm font-medium text-mutedfg hover:bg-muted hover:text-ink">Batal</button>
              <button type="button" onClick={save} className={CTA_CLASS}>Simpan</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
