import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';
import { auth } from '../services/client';

/**
 * RegisterScreen — halaman daftar akun baru (hanya akun master).
 *
 * Props:
 *   onLogin(user)  — dipanggil setelah register sukses
 *   onBack         — dipanggil untuk kembali ke halaman sebelumnya
 */
export function RegisterScreen({ onLogin, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [nickname, setNickname] = useState('');
  const [password2, setPassword2] = useState('');
  // Status keluarga (silsilah) + peran akses grup (tulis/baca) — dipilih master.
  const [familyRole, setFamilyRole] = useState('anak');
  // "Suami" di keluarga = Kepala Keluarga: status itu otomatis memilih peran
  // kepala_keluarga (bukan "suami") supaya konsisten dengan DB.
  const [groupRole, setGroupRole] = useState('anak');
  const pickFamilyRole = (value) => {
    setFamilyRole(value);
    if (value === 'suami') setGroupRole('kepala_keluarga');
  };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const firstFieldRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !nama) {
      setError('Username, password, dan nama wajib diisi.');
      return;
    }
    if (password !== password2) {
      setError('Password dan konfirmasi tidak sama.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await auth.register(
        username.trim().toLowerCase(),
        password,
        nama.trim(),
        familyRole,      // status keluarga: suami | istri | anak | lainnya
        familyRole === 'anak' ? 'anak' : 'orangtua', // generasi
        nickname.trim() || null,
        groupRole        // peran grup: suami | istri | anak | cucu
      );
      onLogin?.(result.user);
    } catch (err) {
      setError(err.message === 'CONFLICT' ? 'Username sudah ada.' : err.message || 'Registrasi gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    onBack?.();
  };

  return (
    <div className="app-bg fixed inset-0 z-[90] overflow-y-auto">
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <div className="gate-in relative mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-7 px-6 py-10">
        {/* Header */}
        <div className="text-center">
          <img
            src="/brand/logo.png"
            alt="Bayt Mustaqbal"
            width="256"
            height="221"
            className="mx-auto h-auto w-full max-w-[200px] object-contain drop-shadow-[0_0_30px_rgba(34,211,238,0.20)] sm:max-w-[240px]"
          />
          <h2 className="mt-5 text-xl font-bold text-ink">Daftar Akun Baru</h2>
          <p className="mt-1 text-sm text-mutedfx">
            Hanya akun master yang dapat mendaftarkan akun baru.
          </p>
        </div>

        {/* Form register */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="reg-username" className="mb-1 block text-xs font-semibold text-mutedfg">
              Username
            </label>
            <input
              id="reg-username"
              ref={firstFieldRef}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="mis. istri"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!error}
              className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="reg-nama" className="mb-1 block text-xs font-semibold text-mutedfg">
              Nama Lengkap
            </label>
            <input
              id="reg-nama"
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Rezki Yudi Triana"
              className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="reg-nickname" className="mb-1 block text-xs font-semibold text-mutedfg">
              Nama Panggilan (opsional)
            </label>
            <input
              id="reg-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="mis. Eki"
              className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors focus:border-brand"
            />
          </div>

          {/* Status keluarga (silsilah) — Suami/Istri hanya satu per keluarga */}
          <div>
            <label htmlFor="reg-family-role" className="mb-1 block text-xs font-semibold text-mutedfg">
              Status Keluarga
            </label>
            <select
              id="reg-family-role"
              value={familyRole}
              onChange={(e) => pickFamilyRole(e.target.value)}
              className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors focus:border-brand"
            >
              <option value="suami">Suami</option>
              <option value="istri">Istri</option>
              <option value="anak">Anak</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>

          {/* Peran akses data keluarga — menentukan boleh tulis atau baca saja */}
          <div>
            <label htmlFor="reg-group-role" className="mb-1 block text-xs font-semibold text-mutedfg">
              Peran Akses Data
            </label>
            <select
              id="reg-group-role"
              value={groupRole}
              onChange={(e) => setGroupRole(e.target.value)}
              className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors focus:border-brand"
            >
              <option value="kepala_keluarga">Kepala Keluarga — boleh tulis & kelola</option>
              <option value="istri">Istri — boleh tulis</option>
              <option value="anak">Anak — hanya lihat</option>
              <option value="cucu">Cucu — hanya lihat</option>
            </select>
            <p className="mt-1 text-[11px] leading-snug text-mutedfg">
              Kepala Keluarga (Suami) &amp; Istri bisa menambah/mengubah data; Anak &amp; Cucu hanya melihat.
            </p>
          </div>

          <div>
            <label htmlFor="reg-password" className="mb-1 block text-xs font-semibold text-mutedfg">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
              aria-invalid={!!error}
              className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="reg-password2" className="mb-1 block text-xs font-semibold text-mutedfg">
              Konfirmasi Password
            </label>
            <input
              id="reg-password2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Ketik ulang password"
              autoComplete="new-password"
              className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors focus:border-brand"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !username || !password || !nama || password !== password2}
            className={`inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-5 text-sm font-semibold text-white shadow-glow transition-transform text-base`}
          >
            {submitting ? (
              <>
                <Icon name="loader" size={18} />
                Membuat…
              </>
            ) : (
              <>
                <Icon name="zap" size={18} />
                Daftar
              </>
              )}
          </button>
        </form>

        {/* Kembali */}
        <button
          type="button"
          onClick={handleBack}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium text-mutedfg transition-colors hover:text-brandfg"
        >
          <Icon name="arrowLeft" size={13} />
          Kembali ke Akun Saya
        </button>
      </div>
    </div>
  );
}
