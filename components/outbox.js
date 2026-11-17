/* ============================================================================
   Antrean tulis offline (outbox).

   Catatan yang dibuat saat offline (atau saat POST gagal karena jaringan)
   disimpan di localStorage per pengguna, lalu dikirim berurutan ketika online.
   Setiap operasi punya opId berupa UUID yang juga dipakai sebagai id baris di
   server, sehingga pengiriman ulang tidak membuat duplikat (server memakai
   INSERT ... ON CONFLICT(id) DO NOTHING).

   Bentuk operasi:
   {
     opId: 'uuid',
     kind: 'txn' | 'note' | 'service',
     draft: { ...item frontend, id: opId, pending: true },
     payload?: { ...body khusus service },
     tries: 0,
     failed?: true,
     lastError?: string,
     createdAt: ISO
   }
   ============================================================================ */

const KEY_PREFIX = 'bm-outbox:';

export function outboxKey(userId) {
  return KEY_PREFIX + (userId || 'anon');
}

export function readOutbox(userId) {
  try {
    const raw = localStorage.getItem(outboxKey(userId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeOutbox(userId, list) {
  try {
    localStorage.setItem(outboxKey(userId), JSON.stringify(list));
  } catch {
    /* kuota penuh / mode privat: abaikan, item tetap ada di state selama sesi */
  }
}

export function newOpId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function enqueue(userId, op) {
  const list = readOutbox(userId).filter((o) => o.opId !== op.opId);
  writeOutbox(userId, [
    ...list,
    { tries: 0, createdAt: new Date().toISOString(), ...op },
  ]);
  return op.opId;
}

export function dequeue(userId, opId) {
  writeOutbox(userId, readOutbox(userId).filter((o) => o.opId !== opId));
}

export function markFailed(userId, opId, error) {
  writeOutbox(userId, readOutbox(userId).map((o) => (o.opId === opId
    ? { ...o, failed: true, lastError: String(error || '').slice(0, 200), tries: (Number(o.tries) || 0) + 1 }
    : o)));
}

export function resetFailed(userId, opId) {
  writeOutbox(userId, readOutbox(userId).map((o) => (o.opId === opId
    ? { ...o, failed: false, lastError: '' }
    : o)));
}

/** Draft yang belum tersinkron, untuk ditempel di atas data server. */
export function pendingDrafts(userId) {
  return readOutbox(userId).map((o) => ({
    ...(o.draft || {}),
    id: o.opId,
    pending: true,
    failed: !!o.failed,
  }));
}
