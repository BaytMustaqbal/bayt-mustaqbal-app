// Splash screen — tampil setiap app dibuka (bukan per-sesi).
//
// Alur: langsung render saat React mount → tahan minimal SPLASH_MIN_MS
// (supaya tidak terasa kilat) → fade-out SPLASH_FADE_MS → panggil onDone
// untuk melepas splash dari DOM. Animasi masuk memakai keyframes di
// App.css (.splash-logo / .splash-text); reduced-motion otomatis instan
// lewat aturan global `prefers-reduced-motion`.

import React, { useEffect, useState } from 'react';

const SPLASH_MIN_MS = 1500;
const SPLASH_FADE_MS = 500;

export function SplashScreen({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  // Tahan minimum, lalu mulai fade-out.
  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  // Setelah fade-out selesai, lepas splash dari DOM.
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(onDone, SPLASH_FADE_MS);
    return () => clearTimeout(timer);
  }, [leaving, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-canvas transition-opacity duration-500 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <img
        src="/brand/logo.png"
        alt="Bayt Mustaqbal"
        className="splash-logo h-24 w-24 object-contain sm:h-28 sm:w-28"
      />
      <div className="text-center">
        <p className="splash-text text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          Bayt Mustaqbal
        </p>
        <p className="splash-text-delay mt-1.5 text-sm font-medium text-mutedfg">
          Rumah Masa Depan
        </p>
      </div>
    </div>
  );
}
