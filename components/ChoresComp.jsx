import React, { useCallback, useEffect, useState } from 'react';
import { choresApi } from '../services/client';
import { Card, SectionHeader, EmptyState, Badge, CTA_CLASS } from './ui';
import { Icon } from './Icon';

/** Tugas rumah tangga bersama — mandiri (fetch + CRUD via choresApi). */
export default function ChoresComp({ users = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const rows = await choresApi.fetch();
      setItems(rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!title.trim()) { setError('Judul tugas wajib diisi.'); return; }
    setError('');
    setSaving(true);
    try {
      const created = await choresApi.create({ title, dueDate: dueDate || null, assigneeId: assigneeId || null });
      setItems((prev) => [...prev, created]);
      setTitle(''); setDueDate(''); setAssigneeId('');
    } catch (e) {
      setError('Gagal menambah: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item) => {
    const nextStatus = item.status === 'done' ? 'open' : 'done';
    const updated = await choresApi.update(item.id, { status: nextStatus });
    setItems((prev) => prev.map((it) => (it.id === item.id ? updated : it)));
  };

  const remove = async (item) => {
    if (!window.confirm(`Hapus tugas "${item.title}"?`)) return;
    await choresApi.remove(item.id);
    setItems((prev) => prev.filter((it) => it.id !== item.id));
  };

  const userName = (id) => {
    const u = users.find((x) => x.id === id);
    return u ? u.name : '';
  };

  const open = items.filter((i) => i.status === 'open');
  const done = items.filter((i) => i.status === 'done');

  return (
    <div>
      <SectionHeader icon="tasks" title="Tugas Rumah Tangga" subtitle="Bagi tugas bersama keluarga" />

      <Card className="mb-4 p-4">
        <div className="space-y-2.5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="mis. Cuci piring, Sapu lantai..."
            className="input-field min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors focus:border-brand"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-field min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand"
            />
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="input-field min-h-[44px] w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="">Siapa (opsional)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <button type="button" onClick={add} disabled={saving} className={`${CTA_CLASS} min-h-[44px] w-full`}>
            <Icon name="plus" size={16} />
            {saving ? 'Menyimpan…' : 'Tambah Tugas'}
          </button>
        </div>
      </Card>

      {loading ? (
        <p className="text-sm text-mutedfg">Memuat…</p>
      ) : items.length === 0 ? (
        <EmptyState icon="tasks" title="Belum ada tugas" message="Tambahkan tugas rumah tangga pertama." />
      ) : (
        <div className="space-y-4">
          {open.length > 0 && (
            <ul className="space-y-2">
              {open.map((item) => (
                <Card key={item.id} className="flex items-center gap-3 p-3.5">
                  <button type="button" onClick={() => toggle(item)} aria-label="Tandai selesai" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-mutedfg hover:border-brand hover:text-brandfg">
                    <Icon name="check" size={15} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{item.title}</p>
                    <p className="text-[11px] text-mutedfg">
                      {item.due_date ? `Jatuh tempo ${item.due_date}` : 'Tanpa tanggal'}
                      {userName(item.assignee_id) ? ` · ${userName(item.assignee_id)}` : ''}
                    </p>
                  </div>
                  <Badge tone="amber">Belum</Badge>
                  <button type="button" onClick={() => remove(item)} aria-label="Hapus" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mutedfg hover:bg-muted hover:text-danger">
                    <Icon name="trash" size={15} />
                  </button>
                </Card>
              ))}
            </ul>
          )}
          {done.length > 0 && (
            <ul className="space-y-2">
              {done.map((item) => (
                <Card key={item.id} className="flex items-center gap-3 p-3.5 opacity-70">
                  <button type="button" onClick={() => toggle(item)} aria-label="Buka lagi" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brandtint text-brandfg">
                    <Icon name="check" size={15} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink line-through">{item.title}</p>
                    <p className="text-[11px] text-mutedfg">Selesai</p>
                  </div>
                  <Badge tone="green">Selesai</Badge>
                  <button type="button" onClick={() => remove(item)} aria-label="Hapus" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mutedfg hover:bg-muted hover:text-danger">
                    <Icon name="trash" size={15} />
                  </button>
                </Card>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
