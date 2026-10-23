import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';
import { auth } from '../services/client';

/**
 * LoginScreen — ganti WelcomeGate.
 * Hanya login (email + password); registrasi dilakukan oleh Kakang via akun master di AccountModal.
 *
 * Props:
 *   onLogin(user)  — dipanggil setelah login sukses (token sudah tersimpan)
 *   onReset        — reset data ke seed (opsional, untuk dev)
 */
/* Cek cepat format email (cukup ketat untuk menangkap salah ketik;
   aturan final tetap di backend). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen({ onLogin, onReset, pushToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  /* Naik setiap kali error muncul → memicu ulang animasi getar walau
     pesan errornya sama (mis. salah password dua kali berturut-turut). */
  const [errorTick, setErrorTick] = useState(0);
  const firstFieldRef = useRef(null);
  const passwordRef = useRef(null);
  const formRef = useRef(null);

  // Fokus ke field email saat mount
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Getar form sekali setiap error baru. Kelas dilepas lalu dipasang ulang
  // (dipaksa reflow) supaya animasi bisa berjalan berulang.
  useEffect(() => {
    if (!errorTick) return;
    const el = formRef.current;
    if (!el) return;
    el.classList.remove('form-shake');
    void el.offsetWidth;
    el.classList.add('form-shake');
  }, [errorTick]);

  const fail = (msg) => {
    setError(msg);
    setErrorTick((t) => t + 1);
    pushToast?.({ message: msg, duration: 4000, tone: 'danger' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!email.trim() || !password) {
      fail('Email dan password wajib diisi.');
      return;
    }
    // Cek format email di HP dulu — hemat round-trip ke server
    if (!EMAIL_RE.test(email.trim())) {
      fail('Format email belum benar.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const data = await auth.login(email.trim(), password);
      onReset && localStorage.removeItem('bayt-mustaqbal-data-v2'); // bersih cache lama
      onLogin(data.user);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') {
        setPassword('');
        fail('Email atau password salah.');
        passwordRef.current?.focus();
      } else if (err.message === 'NETWORK_ERROR') {
        fail('Tidak dapat menghubungkan ke server. Periksa koneksi.');
      } else {
        fail(err.message || 'Login gagal. Coba lagi.');
      }
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
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          onAnimationEnd={() => formRef.current?.classList.remove('form-shake')}
          className="space-y-4"
        >
          <div>
            <label htmlFor="login-email" className="mb-1 block text-xs font-semibold text-mutedfg">
              Email
            </label>
            <input
              id="login-email"
              ref={firstFieldRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="email@contoh.com"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!error}
              className={`input-field min-h-[48px] w-full rounded-xl border bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand ${error ? 'border-danger' : 'border-line'}`}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs font-semibold text-mutedfg">
              Password
            </label>
            <input
              id="login-password"
              ref={passwordRef}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••"
              aria-invalid={!!error}
              className={`input-field min-h-[48px] w-full rounded-xl border bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand ${error ? 'border-danger' : 'border-line'}`}
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
            disabled={submitting || !email || !password}
            aria-busy={submitting}
            className={`inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-5 text-base font-semibold text-white shadow-glow transition duration-fast ease-crisp ${submitting ? 'cursor-progress opacity-75' : 'active:scale-95 hover:brightness-110'}`}
          >
            {submitting ? (
              <>
                <Icon name="loader" size={18} className="animate-spin" />
                Memeriksa…
              </>
            ) : (
              <>
                <Icon name="zap" size={18} />
                Masuk
              </>
            )}
          </button>
        </form>

        {/* Social media icons */}
        <div className="flex items-center justify-center gap-3">
          {/* Facebook */}
          <a
            href="https://www.facebook.com/rezkiyuditriana"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-canvas text-mutedfg opacity-60 transition-all hover:opacity-100 hover:text-[#1877F2]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
            </svg>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/yt_rezki"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-canvas text-mutedfg opacity-60 transition-all hover:opacity-100 hover:text-[#E40046]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
            </svg>
          </a>

          {/* TikTok */}
          <a
            href="https://www.tiktok.com/@hildaapriyani_"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-canvas text-mutedfg opacity-60 transition-all hover:opacity-100 hover:text-[#FF0000]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
          </a>

          {/* Website */}
          <a
            href="https://www.baytmustaqbal.my.id"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Website baytmustaqbal.my.id"
            className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-canvas text-mutedfg opacity-60 transition-all hover:opacity-100 hover:text-brand"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </a>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-mutedfg">
          © 2026 Rezki YT — Bayt Mustaqbal
        </p>
      </div>
    </div>
  );
}
