import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';

/* ============================================================================
   Toast ringkas di atas tab bar bawah.

   Dua peran:
   - konfirmasi ringan (tambah/ubah) — tanpa aksi, hilang sendiri;
   - undo hapus — tombol "Urungkan" memulihkan item yang baru dibuang.

   `toast` = { id, message, duration?, actionLabel?, onAction? } | null.
   `onDismiss(id)` dipanggil saat waktu habis, tombol tutup, atau aksi.
   role="status" + aria-live="polite" agar pembaca layar mengumumkan.
   ============================================================================ */

export function Toast({ toast, onDismiss }) {
  // Simpan callback di ref supaya timer tidak ter-reset tiap render induk.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => dismissRef.current?.(toast.id), toast.duration ?? 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 lg:bottom-6">
      <div
        role="status"
        aria-live="polite"
        className="toast-in pointer-events-auto flex min-h-[52px] w-full max-w-md items-center gap-2 rounded-2xl border border-line bg-surface/95 py-1.5 pl-4 pr-1.5 shadow-glow backdrop-blur-xl"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{toast.message}</span>

        {toast.actionLabel && (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              dismissRef.current?.(toast.id);
            }}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brandfg transition-colors hover:bg-brandtint"
          >
            <Icon name="undo" size={16} />
            {toast.actionLabel}
          </button>
        )}

        <button
          type="button"
          aria-label="Tutup notifikasi"
          onClick={() => dismissRef.current?.(toast.id)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
