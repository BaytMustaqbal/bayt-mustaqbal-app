import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';

/* =========================================================
   Layar gerbang (welcome).

   Muncul setiap app dibuka — sesuai keputusan Kakang. Sekarang isinya
   hanya "masuk sebagai siapa", nanti saat Worker + D1 siap, layar ini
   tinggal ditukar menjadi layar login (email + PIN).

   Gambar utama: logo Kakang (public/brand/logo.png) — menggantikan
   ilustrasi SVG yang dulu digambar sendiri.
   ========================================================= */

export function WelcomeGate({ users, defaultUserId, onEnter, onReset }) {
  const [selectedId, setSelectedId] = useState(defaultUserId || users[0]?.id);
  const ctaRef = useRef(null);

  // Fokus ke tombol masuk supaya pengguna keyboard/pembaca layar langsung bisa jalan
  useEffect(() => {
    ctaRef.current?.focus();
  }, []);

  const selected = users.find((u) => u.id === selectedId) || users[0];

  return (
    <div className="app-bg fixed inset-0 z-[90] overflow-y-auto">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <div className="gate-in relative mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-7 px-6 py-10">
        {/* Identitas app — logo Kakang jadi gambar utama */}
        <div className="text-center">
          <img
            src="/brand/logo.png"
            alt="Bayt Mustaqbal"
            width="256"
            height="221"
            className="mx-auto h-auto w-full max-w-[200px] object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.20)] sm:max-w-[240px]"
          />
          <p className="mt-5 text-sm text-mutedfg">
            Rumah Masa Depan — agenda, keuangan, tugas, dan catatan keluarga dalam satu tempat.
          </p>
        </div>

        {/* Pilih pengguna */}
        <div>
          <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-mutedfg">
            Masuk sebagai
          </p>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Pilih pengguna">
            {users.map((user) => {
              const active = user.id === selectedId;
              return (
                <button
                  key={user.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedId(user.id)}
                  className={`flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-colors ${
                    active ? 'border-brand/60 bg-brandtint' : 'border-line bg-surface hover:bg-muted'
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold ${
                      active ? 'bg-brand text-canvas' : 'bg-muted text-mutedfg'
                    }`}
                    aria-hidden="true"
                  >
                    {user.initials}
                  </span>
                  <span className="min-w-0 text-center">
                    <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
                    <span className="block truncate text-[11px] text-mutedfg">{user.role}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <button ref={ctaRef} type="button" onClick={() => onEnter(selected.id)} className={`${CTA_CLASS} min-h-[52px] w-full text-base`}>
            <Icon name="zap" size={18} />
            Masuk sebagai {selected.name}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-mutedfg">
            Purwarupa — data tersimpan di perangkat ini. Layar ini nanti menjadi layar masuk.
          </p>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="mx-auto flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-mutedfg transition-colors hover:text-brandfg"
            >
              <Icon name="refresh" size={13} />
              Muat ulang data contoh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
