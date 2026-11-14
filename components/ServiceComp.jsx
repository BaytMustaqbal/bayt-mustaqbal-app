import React, { useState } from 'react';
import { Icon } from './Icon';
import { Badge, Card, CTA_CLASS, ProgressBar, CurrencyInput } from './ui';
import { sumServiceItems } from './service';
import VehicleComp from './VehicleComp';

/* Komponen Service - kendaraan, inventaris perawatan, riwayat service motor */
export function Service({
  inventory,
  history,
  vehicles = [],
  formatCurrency,
  canWrite,
  onAddSparepart,
  onUpdateSparepart,
  onRemoveSparepart,
  onAddService,
  onUpdateService,
  onAddVehicle,
  onUpdateVehicle,
  onRemoveVehicle,
  activeTab = 'inventory',
  onTabChange,
}) {
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    odometer: '',
    items: [],
    technician: '',
    notes: '',
    vehicleId: '',
    kategori: 'service',
  });

  const [activeVehicle, setActiveVehicle] = useState('all');

  const [showInvForm, setShowInvForm] = useState(false);
  const [invErr, setInvErr] = useState('');
  const [invForm, setInvForm] = useState({
    id: null,
    nama: '',
    jenis: '',
    intervalType: 'km',
    intervalValue: 3000,
    vehicleId: '',
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
    const payload = { ...serviceForm, total, kategori: serviceForm.kategori || 'service' };
    if (editingRecord) {
      onUpdateService?.(editingRecord, payload, serviceForm.vehicleId || null);
    } else {
      onAddService(payload, serviceForm.vehicleId || null);
    }
    setShowServiceForm(false);
    setEditingRecord(null);
    setServiceForm({
      date: new Date().toISOString().split('T')[0],
      odometer: '',
      items: [],
      technician: '',
      notes: '',
      vehicleId: activeVehicle === 'all' ? (vehicles[0]?.id || '') : activeVehicle,
      kategori: 'service',
    });
  };

  const openEditRecord = (rec) => {
    setEditingRecord(rec.id);
    setServiceForm({
      date: rec.date || new Date().toISOString().split('T')[0],
      odometer: rec.odometer != null ? String(rec.odometer) : '',
      items: rec.items || [],
      technician: rec.technician || '',
      notes: rec.notes || '',
      vehicleId: rec.vehicleId || '',
      kategori: rec.kategori || 'service',
    });
    setShowServiceForm(true);
  };

  const openAddInv = () => {
    setInvErr('');
    setInvForm({ id: null, nama: '', jenis: '', intervalType: 'km', intervalValue: 3000, vehicleId: activeVehicle === 'all' ? (vehicles[0]?.id || '') : activeVehicle });
    setShowInvForm(true);
  };

  const openEditInv = (it) => {
    setInvErr('');
    setInvForm({
      id: it.id,
      nama: it.nama || '',
      jenis: it.jenis || '',
      intervalType: it.intervalType || 'km',
      intervalValue: it.intervalValue || 3000,
      vehicleId: it.vehicleId || '',
    });
    setShowInvForm(true);
  };

  const saveInv = () => {
    if (!invForm.nama.trim()) {
      setInvErr('Nama perawatan wajib diisi.');
      return;
    }
    setInvErr('');
    const vals = {
      nama: invForm.nama,
      jenis: invForm.jenis,
      intervalType: invForm.intervalType,
      intervalValue: invForm.intervalValue,
      vehicleId: invForm.vehicleId || null,
    };
    if (invForm.id) {
      onUpdateSparepart(invForm.id, vals);
    } else {
      onAddSparepart(vals, invForm.vehicleId || null);
    }
    setShowInvForm(false);
  };

  const filteredInventory = activeVehicle === 'all'
    ? inventory
    : inventory.filter((i) => (i.vehicleId || '') === activeVehicle);

  const filteredHistory = activeVehicle === 'all'
    ? history
    : history.filter((h) => (h.vehicleId || '') === activeVehicle);

  const tabs = [
    { id: 'inventory', label: 'Inventaris', icon: 'wrench' },
    { id: 'history', label: 'Riwayat', icon: 'activity' },
    { id: 'kendaraan', label: 'Kendaraan', icon: 'car' },
  ];

  const vehicleName = (id) => (vehicles.find((v) => v.id === id)?.nama || '');

  const vehicleSelector = (
    <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-muted/50 p-1" role="tablist" aria-label="Pilih kendaraan">
      <button
        type="button"
        onClick={() => setActiveVehicle('all')}
        className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${activeVehicle === 'all' ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:bg-muted hover:text-ink'}`}
      >
        Semua
      </button>
      {vehicles.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => setActiveVehicle(v.id)}
          className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${activeVehicle === v.id ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:bg-muted hover:text-ink'}`}
        >
          <Icon name="car" size={13} />
          {v.nama}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tab navigasi */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange?.(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-brandtint text-brandfg'
                : 'bg-muted text-mutedfg hover:bg-canvas hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'kendaraan' && (
        <VehicleComp
          vehicles={vehicles}
          canWrite={canWrite}
          formatCurrency={formatCurrency}
          onAdd={onAddVehicle}
          onUpdate={onUpdateVehicle}
          onRemove={onRemoveVehicle}
        />
      )}

      {/* Inventory tab */}
      {activeTab === 'inventory' && (
        <>
          {vehicles.length > 0 && vehicleSelector}
          {canWrite && (
            <Card className="p-4 sm:p-5">
              <button
                type="button"
                onClick={openAddInv}
                className={`${CTA_CLASS} w-full sm:w-auto`}
              >
                <Icon name="plus" size={16} />
                Tambah Perawatan
              </button>
            </Card>
          )}

          {filteredInventory.length === 0 ? (
            <Card className="px-5 py-10 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
                <Icon name="wrench" size={24} />
              </span>
              <p className="mt-4 font-semibold text-ink">Belum ada inventaris perawatan</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-mutedfg">
                {vehicles.length === 0
                  ? 'Tambahkan kendaraan dulu di tab Kendaraan, lalu daftar perawatan rutinnya.'
                  : 'Tambahkan item perawatan rutin (ganti oli, filter, dll). Setiap service akan memperbarui odometer terakhir.'}
              </p>
            </Card>
          ) : (
            <ul className="stagger space-y-2">
              {filteredInventory.map((it) => (
                <li key={it.id}>
                  <Card className="flex items-start justify-between gap-3 p-2.5 sm:p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{it.nama || '-'}</p>
                      <p className="text-xs text-mutedfg">
                        Next: {it.nextDue || 'belum ditentukan'}
                        {it.vehicleId && vehicles.find((v) => v.id === it.vehicleId) ? ` · ${vehicles.find((v) => v.id === it.vehicleId).nama}` : ''}
                      </p>
                    </div>
                    {canWrite && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEditInv(it)}
                          aria-label="Ubah perawatan"
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
          {vehicles.length > 0 && vehicleSelector}
          {canWrite && (
            <Card className="p-4 sm:p-5">
              <button
                type="button"
                onClick={() => {
                  const vid = activeVehicle === 'all' ? (vehicles[0]?.id || '') : activeVehicle;
                  const v = vehicles.find((x) => x.id === vid);
                  setEditingRecord(null);
                  setServiceForm({
                    date: new Date().toISOString().split('T')[0],
                    odometer: v?.odometer != null ? String(v.odometer) : '',
                    items: [],
                    technician: '',
                    notes: '',
                    vehicleId: vid,
                    kategori: 'service',
                  });
                  setShowServiceForm(true);
                }}
                className={`${CTA_CLASS} w-full sm:w-auto`}
              >
                <Icon name="plus" size={16} />
                Catat Service Baru
              </button>
            </Card>
          )}

          {filteredHistory.length === 0 ? (
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
                <p className="text-sm font-semibold text-ink">Total service: {formatCurrency(filteredHistory.reduce((s, h) => s + (Number(h.total) || 0), 0))}</p>
                <Badge tone="brand">{filteredHistory.length} catatan</Badge>
              </div>
              <ul className="stagger space-y-2">
                {filteredHistory.map((it) => (
                  <li key={it.id}>
                    <Card className="p-4 sm:p-5">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-ink">{it.date}</p>
                            <p className="text-xs text-mutedfg">
                              {it.odometer} km • {it.technician}
                              {it.vehicleId && vehicleName(it.vehicleId) ? ` · ${vehicleName(it.vehicleId)}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge tone="gray">{it.kategori || 'service'}</Badge>
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => openEditRecord(it)}
                                aria-label="Ubah riwayat service"
                                className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg hover:bg-muted hover:text-ink"
                              >
                                <Icon name="edit" size={14} />
                              </button>
                            )}
                            <p className="font-mono text-sm font-bold text-brandfg">{formatCurrency(it.total)}</p>
                          </div>
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

      {/* Modal catat service baru */}
      {showServiceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 p-4 sm:p-5">
            <h3 className="mb-4 text-lg font-bold text-ink">{editingRecord ? "Ubah Service" : "Catat Service Baru"}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-mutedfg mb-1">Kategori</label>
                <select
                  value={serviceForm.kategori}
                  onChange={(e) => setServiceForm({ ...serviceForm, kategori: e.target.value })}
                  className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                >
                  <option value="service">Service</option>
                  <option value="ganti_part">Ganti Part</option>
                  <option value="perbaikan">Perbaikan</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
              {vehicles.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-mutedfg mb-1">Kendaraan</label>
                  <select
                    value={serviceForm.vehicleId}
                    onChange={(e) => {
                      const vid = e.target.value;
                      const v = vehicles.find((x) => x.id === vid);
                      setServiceForm((prev) => ({
                        ...prev,
                        vehicleId: vid,
                        odometer: prev.odometer ? prev.odometer : (v?.odometer != null ? String(v.odometer) : prev.odometer),
                      }));
                    }}
                    className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                  >
                    <option value="">Belum ditetapkan</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.nama}</option>
                    ))}
                  </select>
                </div>
              )}
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
                      {(serviceForm.vehicleId ? inventory.filter((sp) => (sp.vehicleId || '') === serviceForm.vehicleId) : inventory).map((sp) => (
                        <option key={sp.id} value={sp.id}>{sp.nama}</option>
                      ))}
                    </select>
                    <CurrencyInput
                      value={item.price}
                      onChange={(n) => handleItemChange(idx, 'price', n)}
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
                  onChange={(e) => handleAddServiceItem(e.target.value, inventory.find((i) => i.id === e.target.value)?.nama || '')}
                  className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
                >
                  <option value="">Tambah item...</option>
                  {(serviceForm.vehicleId ? inventory.filter((sp) => (sp.vehicleId || '') === serviceForm.vehicleId) : inventory).length > 0 ? (
                    (serviceForm.vehicleId ? inventory.filter((sp) => (sp.vehicleId || '') === serviceForm.vehicleId) : inventory).map((sp) => (
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

      {/* Modal tambah/ubah inventaris perawatan */}
      {showInvForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 p-4 sm:p-5">
            <h3 className="mb-4 text-lg font-bold text-ink">
              {invForm.id ? 'Ubah Perawatan' : 'Tambah Perawatan'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-mutedfg mb-1">Nama</label>
                <input
                  type="text"
                  value={invForm.nama}
                  onChange={(e) => setInvForm({ ...invForm, nama: e.target.value })}
                  placeholder="mis. Ganti oli mesin"
                  className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-mutedfg mb-1">Jenis</label>
                <input
                  type="text"
                  value={invForm.jenis}
                  onChange={(e) => setInvForm({ ...invForm, jenis: e.target.value })}
                  placeholder="mis. Oli, Filter, Aki"
                  className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                />
              </div>
              {vehicles.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-mutedfg mb-1">Kendaraan</label>
                  <select
                    value={invForm.vehicleId}
                    onChange={(e) => setInvForm({ ...invForm, vehicleId: e.target.value })}
                    className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                  >
                    <option value="">Belum ditetapkan</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.nama}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-mutedfg mb-1">Selang</label>
                  <select
                    value={invForm.intervalType}
                    onChange={(e) => setInvForm({ ...invForm, intervalType: e.target.value })}
                    className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                  >
                    <option value="km">Kilometer</option>
                    <option value="month">Bulan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-mutedfg mb-1">Nilai</label>
                  <input
                    type="number"
                    min="1"
                    value={invForm.intervalValue}
                    onChange={(e) => setInvForm({ ...invForm, intervalValue: Number(e.target.value) || 0 })}
                    className="input-field w-full rounded-xl border border-line bg-canvas px-3"
                  />
                </div>
              </div>
              {invErr && <p className="text-xs font-medium text-danger">{invErr}</p>}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowInvForm(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-mutedfg hover:bg-muted hover:text-ink"
              >
                Batal
              </button>
              <button type="button" onClick={saveInv} className={CTA_CLASS}>
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