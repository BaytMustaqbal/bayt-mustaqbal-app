import React, { useEffect, useState } from 'react';
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

export function AuditComp() {
  const [logs, setLogs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    auditApi
      .fetch()
      .then((rows) => setLogs(rows || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="space-y-3">
      {!loaded ? (
        <p className="text-xs text-mutedfg">Memuat…</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-mutedfg">Belum ada aktivitas tercatat.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-canvas">
          {logs.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
                <Icon name={ACTION_ICON[l.action] || 'activity'} size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{ACTION_LABEL[l.action] || l.action}</p>
                <p className="text-[11px] text-mutedfg">{new Date(l.created_at).toLocaleString('id-ID')}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AuditComp;
