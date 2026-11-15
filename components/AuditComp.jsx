import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { auditApi } from '../services/client';

const ACTION_LABEL = {
  login: 'Masuk',
  logout: 'Keluar',
  update_profile: 'Ubah profil',
  revoke_session: 'Revoke sesi',
  unlink_google: 'Hapus koneksi Google',
  backup_export: 'Export backup',
  backup_import: 'Import backup',
};

const ACTION_ICON = {
  login: 'logOut',
  logout: 'logOut',
  update_profile: 'edit',
  revoke_session: 'logOut',
  unlink_google: 'logOut',
  backup_export: 'download',
  backup_import: 'upload',
};

/* Jumlah baris yang tampil di Pengaturan; sisanya lewat modal. */
const PREVIEW_COUNT = 5;

const actionLabel = (action) => ACTION_LABEL[action] || action || 'Aktivitas';
const formatTime = (iso) => (iso ? new Date(iso).toLocaleString('id-ID') : '—');

function LogRow({ log, ownerName, onOpen }) {
  const body = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
        <Icon name={ACTION_ICON[log.action] || 'activity'} size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {actionLabel(log.action)}
          {ownerName && <span className="font-normal text-mutedfg"> · {ownerName}</span>}
        </p>
        <p className="text-[11px] text-mutedfg">{formatTime(log.created_at)}</p>
      </div>
    </>
  );

  if (!onOpen) {
    return <div className="flex items-center gap-3 px-3.5 py-2.5">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(log)}
      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted"
    >
      {body}
      <Icon name="chevronRight" size={14} className="shrink-0 text-mutedfg" aria-hidden="true" />
    </button>
  );
}

export function AuditComp({ users = [] }) {
  const [logs, setLogs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    auditApi
      .fetch()
      .then((rows) => setLogs(rows || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const nameById = useMemo(() => {
    const map = new Map();
    (users || []).forEach((u) => map.set(u.id, u.nickname || u.name || null));
    return map;
  }, [users]);

  const ownerName = (log) => (log?.user_id ? nameById.get(log.user_id) || null : null);

  const closeModal = () => {
    setOpen(false);
    setDetail(null);
  };

  const preview = logs.slice(0, PREVIEW_COUNT);

  return (
    <div className="space-y-3">
      {!loaded ? (
        <p className="text-xs text-mutedfg">Memuat…</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-mutedfg">Belum ada aktivitas tercatat.</p>
      ) : (
        <>
          <ul className="divide-y divide-line rounded-xl border border-line bg-canvas">
            {preview.map((l) => (
              <li key={l.id}>
                <LogRow log={l} ownerName={ownerName(l)} />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink"
          >
            <Icon name="activity" size={14} />
            Lihat semua{logs.length > PREVIEW_COUNT ? ` (${logs.length})` : ''}
          </button>
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-[85] overflow-y-auto" role="dialog" aria-modal="true" aria-label="Audit log lengkap">
          <button type="button" aria-label="Tutup" onClick={closeModal} className="fixed inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm" />
          <div className="relative mx-auto mt-6 mb-6 w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-3xl border border-line bg-surface/95 p-4 shadow-pop backdrop-blur-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{detail ? 'Rincian aktivitas' : 'Audit Log'}</p>
                <p className="text-[11px] text-mutedfg">
                  {detail ? formatTime(detail.created_at) : `${logs.length} aktivitas terakhir`}
                </p>
              </div>
              <button type="button" onClick={closeModal} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mutedfg hover:bg-muted hover:text-ink">
                <Icon name="close" size={18} />
              </button>
            </div>

            {detail ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Aksi', actionLabel(detail.action)],
                    ['Pelaku', ownerName(detail) || 'Tidak diketahui'],
                    ['Tabel', detail.table_name || '—'],
                    ['Record', detail.record_id || '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="mb-0.5 text-[10px] font-semibold uppercase text-mutedfg">{label}</p>
                      <p className="break-words text-sm text-ink">{value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase text-mutedfg">Waktu</p>
                  <p className="text-sm text-ink">{formatTime(detail.created_at)}</p>
                </div>
                <button type="button" onClick={() => setDetail(null)} className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-mutedfg hover:text-ink">
                  <Icon name="chevronLeft" size={14} /> Kembali ke daftar
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line bg-canvas">
                {logs.map((l) => (
                  <li key={l.id}>
                    <LogRow log={l} ownerName={ownerName(l)} onOpen={setDetail} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditComp;
