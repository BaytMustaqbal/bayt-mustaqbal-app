import React, { useState } from 'react';
import { Icon } from './Icon';
import { Badge, Card, CTA_CLASS, ProgressBar } from './ui';
import { sumServiceItems } from './service';

/* Komponen Service - inventory dan riwayat service motor */
export function Service({
  inventory,
  history,
  formatCurrency,
  canWrite,
  onAddSparepart,
  onUpdateSparepart,
  onRemoveSparepart,
  onAddService,
  activeTab = 'inventory',
  onTabChange,
}) {
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    odometer: '',
    items: [],
    technician: '',
    notes: '',
  });

  const handleAddServiceItem = (sparepartId, sparepartNama) => {
    setServiceForm((prev) => ({
      ...prev,
      items: [...prev.items, { sparepartId, sparepartNama, qty: 1, price: 0 }],
    }));
  };

  const handleItemChange = (index, field, value) => {
    setServiceForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleRemoveItem = (index) => {
    setServiceForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const saveService = () => {
    const total = sumServiceItems(serviceForm.items);
    onAddService({ ...serviceForm, total });
    setShowServiceForm(false);
    setServiceForm({
      date: new Date().toISOString().split('T')[0],
      odometer: '',
      items: [],
      technician: '',
      notes: '',
    });
  };

  const totalService = sumServiceItems(history);

  return (
    <div className="space-y-4">
      {/* Tab navigasi */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onTabChange?.('inventory')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'inventory'
              ? 'bg-brandtint text-brandfg'
              : 'bg-muted text-mutedfg hover:bg-canvas hover:text-ink'
          }`}
        >
          Inventaris Perawatan
        </button>
        <button
          type="button"
          onClick={() => onTabChange?.('history')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-brandtint text-brandfg'
              : 'bg-muted text-mutedfg hover:bg-canvas hover:text-ink'
          }`}
        >
          Riwayat Service
        </button>
      </div>

      {/* Inventory tab */}
      {activeTab === 'inventory' && (
        <>
          {canWrite && (
            <Card className="p-4 sm:p-5">
              <button
                type="button"
                onClick={() => {
                  const newSp = inventory.reduce((max, i) => Math.max(max, parseInt(i.id.split('-').pop()) || 0), 0) + 1;
                  onAddSparepart({
                    id: `sparepart-${Date.now()}-${newSp}`,
                    nama: '',
                    jenis: '',
                    intervalType: 'km',
                    intervalValue: 3000,
                  });
                }}
                className={`${CTA_CLASS} w-full sm:w-auto`}
              >
                <Icon name="plus" size={16} />
                Tambah Perawatan
              </button>
            </Card>
          )}

          {inventory.length === 0 ? (
            <Card className="px-5 py-10 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
                <Icon name="wrench" size={24} />
              </span>
              <p className="mt-4 font-semibold text-ink">Belum ada inventaris perawatan</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-mutedfg">
                Tambahkan item perawatan rutin (ganti oli, filter, dll). Setiap service akan memperbarui odometer terakhir.
              </p>
            </Card>
          ) : (
            <ul className="stagger space-y-2">
              {inventory.map((it) => (
                <li key={it.id}>
                  <Card className="flex items-start justify-between gap-3 p-2.5 sm:p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{it.nama || '-'}</p>
                      <p className="text-xs text-mutedfg">
                        Next: {it.nextDue || 'belum ditentukan'}
                      </p>
                    </div>
                    {canWrite && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdateSparepart(it.id)}
                          aria-label="Update service terakhir"
                          className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg hover:bg-muted hover:text-ink"
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveSparepart(it.id)}
                          aria-label="Hapus"
                          className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg hover:bg-tonerose/15 hover:text-tonerosefg"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <>
          {canWrite && (
            <Card className="p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setShowServiceForm(true)}
                className={`${CTA_CLASS} w-full sm:w-auto`}
              >
                <Icon name="plus" size={16} />
                Catat Service Baru
              </button>
            </Card>
          )}

          {history.length === 0 ? (
            <Card className="px-5 py-10 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
                <Icon name="activity" size={24} />
              </span>
              <p className="mt-4 font-semibold text-ink">Belum ada riwayat service</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-mutedfg">
                Catat service pertama Anda untuk melihat riwayat di sini.
              </p>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Total service: {formatCurrency(totalService)}</p>
                <Badge tone="brand">{history.length} catatan</Badge>
              </div>
              <ul className="stagger space-y-2">
                {history.map((it) => (
                  <li key={it.id}>
                    <Card className="p-4 sm:p-5">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-ink">{it.date}</p>
                            <p className="text-xs text-mutedfg">
                              {it.odometer} km • {it.technician}
                            </p>
                          </div>
                          <p className="font-mono text-sm font-bold text-brandfg">{formatCurrency(it.total)}</p>
                        </div>
                        {it.items.length > 0 && (
                          <ul className="text-xs space-y-1">
                            {it.items.map((item, idx) => (
                              <li key={idx} className="text-mutedfg">
                                {item.sparepartNama} × {item.qty} @ {formatCurrency(item.price)}
                              </li>
                            ))}
                          </ul>
                        )}
                        {it.notes && <p className="text-sm text-mutedfg">{it.notes}</p>}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {/* Modal tambah service */}
      {showServiceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 p-4 sm:p-5">
            <h3 className="mb-4 text-lg font-bold text-ink">Catat Service Baru</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-mutedfg mb-1">Tanggal</label>
                <input
                  type="date"
                  value={serviceForm.date}
                  onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value })}
                  className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mutedfg mb-1">Odometer (km)</label>
                <input
                  type="number"
                  value={serviceForm.odometer}
                  onChange={(e) => setServiceForm({ ...serviceForm, odometer: e.target.value })}
                  placeholder="misal: 15000"
                  className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mutedfg mb-1">Teknisi</label>
                <input
                  type="text"
                  value={serviceForm.technician}
                  onChange={(e) => setServiceForm({ ...serviceForm, technician: e.target.value })}
                  placeholder="nama teknisi"
                  className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mutedfg mb-1">Item (harga per unit)</label>
                {serviceForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <select
                      value={item.sparepartId}
                      onChange={(e) => handleItemChange(idx, 'sparepartId', e.target.value)}
                      className="flex-1 rounded-xl border border-line bg-canvas px-2 text-sm"
                    >
                      <option value="">Pilih sparepart</option>
                      {inventory.map((sp) => (
                        <option key={sp.id} value={sp.id}>{sp.nama}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                      placeholder="Harga"
                      className="w-20 rounded-xl border border-line bg-canvas px-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg hover:bg-tonerose/15 hover:text-tonerosefg"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
                <select
                  value=""
                  onChange={(e) => handleAddServiceItem(e.target.value, inventory.find(i => i.id === e.target.value)?.nama || '')}
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
                >
                  <option value="">Tambah item...</option>
                  {inventory.length > 0 ? (
                    inventory.map((sp) => (
                      <option key={sp.id} value={sp.id}>{sp.nama}</option>
                    ))
                  ) : (
                    <option value="" disabled>Belum ada inventaris</option>
                  )}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowServiceForm(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-mutedfg hover:bg-muted hover:text-ink"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveService}
                className={CTA_CLASS}
              >
                Simpan
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default Service;