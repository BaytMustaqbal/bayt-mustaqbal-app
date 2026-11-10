import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

/**
 * LoginScreen — login murni via Google.
 * Klik "Masuk dengan Google" → redirect ke consent Google; callback
 * `?google=success&token` ditangani App (login + integrasi Photos/Calendar).
 */
export function LoginScreen({ onLogin, onReset, pushToast }) {
  const [loading, setLoading] = useState(false);

  // Tangani callback Google (token) bila kembali ke sini.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('google');
    const token = params.get('token');
    if (result === 'success' && token) {
      params.delete('google');
      params.delete('token');
      const qs = params.toString();
      window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);
      import('../services/client').then(({ setToken, auth }) => {
        setToken(token, true);
        auth.me()
          .then((user) => {
            onReset && localStorage.removeItem('bayt-mustaqbal-data-v2');
            onLogin(user);
          })
          .catch(() => pushToast?.({ message: 'Token login Google tidak valid.', duration: 4500, tone: 'danger' }));
      });
    } else if (result === 'error') {
      const reason = params.get('reason') || 'Gagal masuk';
      params.delete('google');
      params.delete('reason');
      const qs = params.toString();
      window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);
      pushToast?.({ message: `Gagal masuk dengan Google: ${reason}`, duration: 4500, tone: 'danger' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogle = () => {
    setLoading(true);
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `/api/auth/google/login?origin=${origin}`;
  };

  return (
    <div className="app-bg fixed inset-0 z-[90] overflow-y-auto">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <div className="gate-in relative mx-auto flex min-h-full w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
        {/* Identitas app — logo */}
        <div className="text-center">
          <div className="login-logo-wrapper mx-auto">
            <img
              src="/brand/logo.png"
              alt="Bayt Mustaqbal"
              width="256"
              height="221"
              className="login-logo h-auto w-full max-w-[200px] object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.20)] sm:max-w-[240px]"
            />
            <div className="login-ring login-ring-a" aria-hidden="true" />
            <div className="login-ring login-ring-b" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm text-mutedfg">
            Rumah Masa Depan
          </p>
          <p className="text-xs text-mutedfg/70">Iman · Teknologi · Keluarga</p>
        </div>

        {/* Kartu login */}
        <div className="rounded-3xl border border-line bg-surface/95 p-5 shadow-pop backdrop-blur-xl sm:p-6">
          <h1 className="text-center text-base font-bold text-ink">Selamat datang</h1>
          <p className="mt-1 text-center text-xs text-mutedfg">Masuk untuk melanjutkan ke aplikasi keluarga.</p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            aria-busy={loading}
            className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-canvas px-5 text-sm font-semibold text-ink shadow-e1 transition-all hover:border-brand/40 hover:bg-muted active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? (
              <>
                <div className="ld-trio ld-sm" aria-hidden="true"><i></i><i></i><i></i></div>
                Menghubungkan…
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
                  <path fill="#FBBC05" d="M5.84 14.1a7.06 7.06 0 0 1 0-4.2V7.06H2.18a11.3 11.3 0 0 0 0 9.88l3.66-2.84Z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
                </svg>
                Masuk dengan Google
              </>
            )}
          </button>

        </div>

        {/* Footer: ikon sosial + copyright */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4">
            <a href="https://www.facebook.com/rezkiyuditriana" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-mutedfg opacity-50 transition-all hover:opacity-100 hover:text-[#1877F2]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
              </svg>
            </a>
            <a href="https://www.instagram.com/yt_rezki" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-mutedfg opacity-50 transition-all hover:opacity-100 hover:text-[#E40046]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a href="https://www.tiktok.com/@hildaapriyani_" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-mutedfg opacity-50 transition-all hover:opacity-100 hover:text-[#FF0000]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </a>
            <a href="https://www.baytmustaqbal.my.id" target="_blank" rel="noopener noreferrer" aria-label="Website" className="text-mutedfg opacity-50 transition-all hover:opacity-100 hover:text-brand">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </a>
          </div>
          <p className="mt-3 text-[11px] text-mutedfg/70">
            © 2026 Rezki YT — Bayt Mustaqbal
          </p>
        </div>
      </div>
    </div>
  );
}
