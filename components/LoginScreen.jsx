import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';
import { auth } from '../services/client';

/**
 * LoginScreen — ganti WelcomeGate.
 * Hanya login (username + password); registrasi dilakukan oleh Kakang secara manual.
 *
 * Props:
 *   onLogin(user)  — dipanggil setelah login sukses (token sudah tersimpan)
 *   onReset        — reset data ke seed (opsional, untuk dev)
 */
export function LoginScreen({ onLogin, onReset }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const firstFieldRef = useRef(null);

  // Fokus ke field username saat mount
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const data = await auth.login(username.trim(), password);
      onReset && localStorage.removeItem('bayt-mustaqbal-data-v2'); // bersih cache lama
      onLogin(data.user);
    } catch (err) {
      setError(err.message === 'UNAUTHORIZED'
        ? 'Username atau password salah.'
        : err.message === 'NETWORK_ERROR'
        ? 'Tidak dapat menghubungkan ke server. Periksa koneksi.'
        : err.message || 'Login gagal. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-bg fixed inset-0 z-[90] overflow-y-auto">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <div className="gate-in relative mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-7 px-6 py-10">
        {/* Identitas app — logo */}
        <div className="text-center">
          <img
            src="/brand/logo.png"
            alt="Bayt Mustaqbal"
            width="256"
            height="221"
            className="mx-auto h-auto w-full max-w-[200px] object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.20)] sm:max-w-[240px]"
          />
          <p className="mt-5 text-sm text-mutedfg">
            Rumah Masa Depan — Iman, Teknologi, Keluarga
          </p>
        </div>

        {/* Form login */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="login-username" className="mb-1 block text-xs font-semibold text-mutedfg">
              Username
            </label>
            <input
              id="login-username"
              ref={firstFieldRef}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="mis. kakang"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!error}
              className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs font-semibold text-mutedfg">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••"
              aria-invalid={!!error}
              className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-tonerose/40 bg-tonerose/10 px-3 py-2.5 text-sm text-tonerosefg"
            >
              <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className={`inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-5 text-sm font-semibold text-white shadow-glow transition-transform text-base`}
          >
            {submitting ? (
              <>
                <Icon name="loader" size={18} />
                Masuk…
              </>
            ) : (
              <>
                <Icon name="zap" size={18} />
                Masuk
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] leading-relaxed text-mutedfg">
          Data yang tersimpan akan diambil dari server (api.baytmustaqbal.my.id).
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

        {/* Dev-only: auto-fill test credentials */}
        {(import.meta.env.MODE === 'development' || import.meta.env.VITE_DEV_USER) && (
          <button
            type="button"
            onClick={() => {
              setUsername(import.meta.env.VITE_DEV_USER || 'baytmustaqbal@gmail.com');
              setPassword(import.meta.env.VITE_DEV_PASS || '@_Eki091278');
              setError('');
            }}
            className="mx-auto flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-mutedfg transition-colors hover:text-brandfg"
          >
            <Icon name="key" size={13} />
            Isi kredensial dev
          </button>
        )}
      </div>
    </div>
  );
}
