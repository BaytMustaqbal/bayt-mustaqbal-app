import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';

/* =========================================================
   Layar gerbang (welcome).

   Muncul setiap app dibuka — sesuai keputusan Kakang. Sekarang isinya
   hanya "masuk sebagai siapa", nanti saat Worker + D1 siap, layar ini
   tinggal ditukar menjadi layar login (email + PIN).

   Ilustrasinya SVG tulis sendiri, mengikuti gaya ikon app
   (garis 2,5 px, aksen cyan senada tema).
   ========================================================= */

function GateIllustration() {
  return (
    <svg
      viewBox="0 0 320 170"
      className="mx-auto h-auto w-full max-w-[300px]"
      role="img"
      aria-label="Ilustrasi rumah dengan anggota keluarga yang terhubung"
    >
      <defs>
        <linearGradient id="gateStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>

      {/* Garis dasar */}
      <path d="M16 148h288" stroke="#1E3A5F" strokeWidth="1.5" strokeLinecap="round" />

      {/* Rumah */}
      <path
        d="M104 86 160 42l56 44v50a8 8 0 0 1-8 8h-96a8 8 0 0 1-8-8z"
        fill="none"
        stroke="url(#gateStroke)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M150 144v-24a10 10 0 0 1 20 0v24" fill="none" stroke="#7DD3FC" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Simpul data di badan rumah */}
      <circle cx="160" cy="42" r="4" fill="#22D3EE" className="soft-pulse" />
      <circle cx="104" cy="86" r="3.5" fill="#22D3EE" opacity="0.85" />
      <circle cx="216" cy="86" r="3.5" fill="#22D3EE" opacity="0.85" />
      <circle cx="160" cy="106" r="3.5" fill="#F59E0B" />

      {/* Jalur data ke atas (chip kecil) */}
      <path d="M160 26v-10M160 16h-46M114 16v10M160 16h46M206 16v10" fill="none" stroke="#1E3A5F" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="114" cy="32" r="3" fill="#2563EB" />
      <circle cx="206" cy="32" r="3" fill="#2563EB" />

      {/* Dua anggota keluarga di sisi rumah */}
      <g stroke="#22D3EE" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <circle cx="52" cy="104" r="10" />
        <path d="M32 148a20 20 0 0 1 40 0" />
      </g>
      <g stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <circle cx="268" cy="104" r="10" />
        <path d="M248 148a20 20 0 0 1 40 0" />
      </g>
    </svg>
  );
}

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
        {/* Identitas app */}
        <div className="text-center">
          <span className="glass mx-auto grid h-16 w-16 place-items-center rounded-2xl text-brand shadow-glow">
            <Icon name="home" size={30} />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Bayt Mustaqbal</h1>
          <p className="mt-1.5 text-sm text-mutedfg">
            Rumah Masa Depan — agenda, keuangan, dan tugas keluarga dalam satu tempat.
          </p>
        </div>

        <GateIllustration />

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
