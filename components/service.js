/* Service motor - inventory + riwayat service.
   Inventory disimpan di localStorage (fitur baru).
   Riwayat disimpan di catatan kategori `service` supaya ikut sinkron backend. */

export const SERVICE_CATEGORY = 'service';
export const SERVICE_INTERVAL_TYPES = {
  km: 'km',
  month: 'month',
  date: 'date',
};

export const emptySparepart = () => ({
  id: `sparepart-${Date.now()}`,
  nama: '',
  jenis: '',
  intervalType: 'km',
  intervalValue: 3000,
  lastServiceKm: 0,
  lastServiceDate: '',
  notes: '',
});

export const emptyServiceRecord = () => ({
  id: `service-${Date.now()}`,
  date: new Date().toISOString().split('T')[0],
  odometer: 0,
  items: [],
  total: 0,
  technician: '',
  notes: '',
});

export const formatDate = (iso) => iso?.split('T')[0] || '';

export const calculateNextDue = (lastKm, lastDate, intervalType, intervalValue) => {
  if (intervalType === 'km') {
    return lastKm + intervalValue;
  }
  if (intervalType === 'month') {
    const last = new Date(lastDate);
    return new Date(last.getFullYear(), last.getMonth() + intervalValue, last.getDate()).toISOString().split('T')[0];
  }
  return '';
};

export const sparepartToPayload = (item) => ({
  id: item.id,
  nama: String(item.nama || '').trim(),
  jenis: String(item.jenis || '').trim(),
  intervalType: item.intervalType || 'km',
  intervalValue: Math.max(1, Number(item.intervalValue) || 3000),
  lastServiceKm: Math.max(0, Number(item.lastServiceKm) || 0),
  lastServiceDate: formatDate(item.lastServiceDate),
  nextDue: calculateNextDue(
    item.lastServiceKm,
    item.lastServiceDate,
    item.intervalType || 'km',
    item.intervalValue || 3000
  ),
  notes: String(item.notes || '').trim(),
});

export const serviceRecordToPayload = (record) => ({
  title: `Service Motor ${formatDate(record.date)}`,
  body: JSON.stringify({
    date: record.date,
    odometer: Math.max(0, Number(record.odometer) || 0),
    items: record.items.map((it) => ({
      sparepartId: it.sparepartId,
      qty: Math.max(1, Number(it.qty) || 1),
      price: Math.max(0, Number(it.price) || 0),
    })),
    total: Math.max(0, Number(record.total) || 0),
    technician: String(record.technician || '').trim(),
    notes: String(record.notes || '').trim(),
  }),
  category: SERVICE_CATEGORY,
  pinned: false,
});

let sparepartSeq = 0;
export const newSparepart = (vals) => ({
  id: `sparepart-${Date.now()}-${sparepartSeq++}`,
  nama: String(vals.nama || '').trim(),
  jenis: String(vals.jenis || '').trim(),
  intervalType: vals.intervalType || 'km',
  intervalValue: Math.max(1, Number(vals.intervalValue) || 3000),
  lastServiceKm: Math.max(0, Number(vals.lastServiceKm) || 0),
  lastServiceDate: formatDate(vals.lastServiceDate),
  nextDue: calculateNextDue(
    0,
    vals.lastServiceDate || '',
    vals.intervalType || 'km',
    vals.intervalValue || 3000
  ),
  notes: String(vals.notes || '').trim(),
});

export const newServiceItem = (vals) => ({
  id: `item-${Date.now()}`,
  sparepartId: vals.sparepartId || '',
  sparepartNama: vals.sparepartNama || '',
  qty: Math.max(1, Number(vals.qty) || 1),
  price: Math.max(0, Number(vals.price) || 0),
});

export const sumServiceItems = (items) =>
  (items || []).reduce((total, it) => total + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);

export const padSparepart = (item, spareparts) => {
  const sp = spareparts?.find((s) => s.id === item.sparepartId);
  return { ...item, sparepartNama: sp?.nama || item.sparepartNama };
};

export const updateSparepartService = (sparepart, serviceData, spareparts) => {
  const sp = spareparts?.find((s) => s.id === sparepart.id);
  if (!sp) return sparepart;
  return {
    ...sparepart,
    lastServiceKm: Math.max(sp.lastServiceKm || 0, Number(serviceData.odometer) || 0),
    lastServiceDate: serviceData.date || sp.lastServiceDate,
    nextDue: calculateNextDue(
      Math.max(sp.lastServiceKm || 0, Number(serviceData.odometer) || 0),
      serviceData.date || sp.lastServiceDate,
      sp.intervalType || 'km',
      sp.intervalValue || 3000
    ),
  };
};