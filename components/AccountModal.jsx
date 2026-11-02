import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Avatar, CTA_CLASS } from './ui';
import { auth } from '../services/client';

/* Username master — bisa daftarkan akun baru dari sini */
const MASTER_USER = 'baytmustaqbal@gmail.com';

/* Username wajib email (aturan backend) — pola sama dengan LoginScreen/RegisterScreen */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ============================================================================
   Modal "Akun saya" — diorganisasi jadi tab ringkas: Profil / Keamanan /
   Anggota. Semua fungsi lama dipertahankan, hanya dipisah per tab.

   Dibuka dari chip pengguna di header. Bentuknya dialog di TENGAH layar.

   Pola aksesibilitas mengikuti FormSheet:
     - role="dialog" aria-modal + aria-labelledby
     - Escape & ketukan di luar panel menutup; scroll body dikunci
     - label terhubung (htmlFor/id), error per-field, fokus pindah ke
       field bermasalah saat gagal simpan

   Avatar: foto dikecilkan ke 256x256 (crop tengah) lalu disimpan sebagai data
   URL di snapshot data lokal — tanpa dependensi baru.
   ============================================================================ */

const AVATAR_SIZE = 256;
const AVATAR_MAX_BYTES = 150 * 1024; // batas agar snapshot localStorage tidak menggemuk

const toAvatarDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Berkas ini bukan gambar. Pilih foto (JPG atau PNG).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas. Coba lagi.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () =>
        reject(new Error('Format foto ini tidak bisa dibaca browser (mis. HEIC dari iPhone). Coba JPG atau PNG.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (dataUrl.length * 0.75 > AVATAR_MAX_BYTES) {
          reject(new Error('Foto masih terlalu besar setelah dikecilkan. Coba foto lain.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const FIELD_ORDER = ['name', 'username', 'password', 'password2'];

const TABS = [
  { id: 'profil', label: 'Profil', icon: 'userCheck' },
  { id: 'keamanan', label: 'Keamanan', icon: 'lock' },
  { id: 'anggota', label: 'Anggota', icon: 'users' },
];

export function AccountModal({
  open,
  user,
  users = [],
  initialGenerasi = null,
  initialTab = 'profil',
  onSaved,
  onClose,
  onSwitchUser,
  onLogout,
  onSave,
  onRegister,
}) {
  const [tab, setTab] = useState('profil');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clearPassword, setClearPassword] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  const isMaster = user?.username === MASTER_USER;

  const [profileNickname, setProfileNickname] = useState('');
  const [profileBirthDate, setProfileBirthDate] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState('');

  useEffect(() => {
    if (open) {
      setProfileNickname(user?.nickname || '');
      setProfileBirthDate(user?.birthDate || '');
    }
  }, [open, user?.nickname, user?.birthDate]);

  const fieldRefs = useRef({});
  const fileRef = useRef(null);
  const titleId = useId();

  const close = () => {
    onClose();
    setTimeout(() => document.getElementById('account-trigger')?.focus(), 0);
  };

  useEffect(() => {
    if (!open) return undefined;
    setTab(initialTab === 'keamanan' ? 'keamanan' : 'profil');
    setName(user?.name || '');
    setUsername(user?.username || '');
    setPassword('');
    setPassword2('');
    setAvatar(user?.avatar || '');
    setShowPassword(false);
    setClearPassword(false);
    setAvatarBusy(false);
    setErrors({});
    setNotice('');
    setProfileSaved('');
    const t = setTimeout(() => fieldRefs.current.name?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  if (!open) return null;

  const setField = (key, value) => {
    if (key === 'name') setName(value);
    if (key === 'username') setUsername(value);
    if (key === 'password') setPassword(value);
    if (key === 'password2') setPassword2(value);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    const trimmedName = name.trim();
    const normalizedUsername = username.trim().toLowerCase();

    if (!trimmedName) errs.name = 'Nama wajib diisi';
    else if (trimmedName.length < 2) errs.name = 'Nama minimal 2 karakter';
    else if (trimmedName.length > 40) errs.name = 'Nama maksimal 40 karakter';

    if (normalizedUsername && !EMAIL_RE.test(normalizedUsername)) {
      errs.username = 'Username harus berupa alamat email yang valid';
    } else if (
      normalizedUsername &&
      users.some((u) => u.id !== user?.id && (u.username || '').toLowerCase() === normalizedUsername)
    ) {
      errs.username = 'Username ini sudah dipakai akun lain';
    }

    if (password) {
      if (password.length < 6) errs.password = 'Password minimal 6 karakter';
      else if (password !== password2) errs.password2 = 'Ulangi password tidak sama';
    }

    return errs;
  };

  const focusFirstError = (errs) => {
    const key = FIELD_ORDER.find((k) => errs[k]);
    if (key && fieldRefs.current[key]) fieldRefs.current[key].focus();
  };

  // Simpan profil: field utama (nama/email/avatar) + panggilan & tanggal lahir.
  const saveProfile = async () => {
    const errs = validate();
    const relevant = ['name', 'username'].filter((k) => errs[k]);
    if (relevant.length) {
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    setProfileSaving(true);
    setProfileSaved('');
    try {
      onSave({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        avatar,
        password: undefined, // tidak menyentuh password
      });
      // Perbarui panggilan + tanggal lahir + nama final ke server.
      const updated = await auth.updateProfile({
        nama: name.trim(),
        nickname: profileNickname.trim() || null,
        birthDate: profileBirthDate || null,
      });
      onSaved?.(updated);
      setProfileSaved('Profil tersimpan.');
    } catch (err) {
      setProfileSaved('Gagal menyimpan: ' + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // Simpan password (dipisah dari profil).
  const savePassword = () => {
    if (clearPassword && !hasStoredPassword) {
      setErrors({ password: 'Tidak ada password untuk dihapus.' });
      return;
    }
    if (password && password.length < 6) {
      const errs = { password: 'Password minimal 6 karakter' };
      setErrors(errs);
      fieldRefs.current.password?.focus();
      return;
    }
    if (password && password !== password2) {
      const errs = { password2: 'Ulangi password tidak sama' };
      setErrors(errs);
      fieldRefs.current.password2?.focus();
      return;
    }
    onSave({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      avatar,
      password: clearPassword ? '' : password || undefined,
    });
    setPassword('');
    setPassword2('');
    setClearPassword(false);
    close();
  };

  const handlePickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNotice('');
    setAvatarBusy(true);
    try {
      setAvatar(await toAvatarDataUrl(file));
    } catch (err) {
      setNotice(err.message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const previewUser = { name, avatar };
  const hasStoredPassword = !!user?.password;

  const inputCls =
    'min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand disabled:opacity-50';

  const tabBtn = (id) => `inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors ${
    tab === id ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:bg-muted hover:text-ink'
  }`;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        aria-label="Tutup pengaturan akun"
        onClick={close}
        className="modal-backdrop absolute inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm"
      />

      <div className="modal-panel relative max-h-[calc(100dvh_-_2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-surface/95 p-5 shadow-pop backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 text-base font-bold text-ink">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
              <Icon name="userCheck" size={16} />
            </span>
            Akun saya
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Tutup"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div role="tablist" aria-label="Bagian akun" className="mb-4 flex gap-1.5 rounded-xl bg-muted/50 p-1">
          {TABS.filter((t) => t.id !== 'anggota' || isMaster).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={tabBtn(t.id)}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* ---------- Tab: Profil ---------- */}
        {tab === 'profil' && (
          <div className="space-y-3.5">
            {/* Foto profil (ringkas) */}
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-3">
              <Avatar
                user={previewUser}
                className={`h-12 w-12 shrink-0 rounded-xl text-lg font-bold ${avatar ? 'bg-muted' : 'bg-brandtint text-brandfg'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarBusy}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink transition-colors hover:border-brand/60 disabled:opacity-50"
                  >
                    <Icon name="camera" size={14} />
                    {avatarBusy ? 'Memproses…' : avatar ? 'Ganti' : 'Pilih foto'}
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => { setAvatar(''); setNotice(''); }}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-mutedfg transition-colors hover:bg-muted hover:text-danger"
                    >
                      <Icon name="trash" size={14} />
                      Hapus
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePickFile}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
            {notice && <p role="alert" className="text-xs font-medium text-danger">{notice}</p>}

            <div>
              <label htmlFor="acc-name" className="mb-1 block text-xs font-semibold text-mutedfg">
                Nama <span className="text-brand" aria-hidden="true">*</span>
              </label>
              <input
                id="acc-name"
                ref={(el) => { fieldRefs.current.name = el; }}
                type="text"
                value={name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Nama panggilan di rumah"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'acc-name-err' : undefined}
                className={inputCls}
              />
              {errors.name && <p id="acc-name-err" className="mt-1 text-xs font-medium text-danger">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="acc-username" className="mb-1 block text-xs font-semibold text-mutedfg">Email</label>
              <input
                id="acc-username"
                ref={(el) => { fieldRefs.current.username = el; }}
                type="email"
                inputMode="email"
                value={username}
                onChange={(e) => setField('username', e.target.value)}
                placeholder=" Masukan email "
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? 'acc-username-err' : undefined}
                className={inputCls}
              />
              {errors.username && <p id="acc-username-err" className="mt-1 text-xs font-medium text-danger">{errors.username}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-nickname" className="mb-1 block text-xs font-semibold text-mutedfg">Panggilan</label>
                <input
                  id="profile-nickname"
                  type="text"
                  value={profileNickname}
                  onChange={(e) => { setProfileNickname(e.target.value); setProfileSaved(''); }}
                  placeholder="mis. Eki"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="profile-birth-date" className="mb-1 block text-xs font-semibold text-mutedfg">Tgl lahir</label>
                <input
                  id="profile-birth-date"
                  type="date"
                  value={profileBirthDate}
                  onChange={(e) => { setProfileBirthDate(e.target.value); setProfileSaved(''); }}
                  className={inputCls}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={saveProfile}
              disabled={profileSaving}
              className={`${CTA_CLASS} min-h-[48px] w-full`}
            >
              {profileSaving ? <Icon name="loader" size={16} className="animate-spin" /> : <Icon name="check" size={16} />}
              {profileSaving ? 'Menyimpan…' : 'Simpan Profil'}
            </button>
            {profileSaved && (
              <p className={`text-center text-xs font-medium ${profileSaved.startsWith('Gagal') ? 'text-danger' : 'text-green'}`}>
                {profileSaved}
              </p>
            )}
          </div>
        )}

        {/* ---------- Tab: Keamanan ---------- */}
        {tab === 'keamanan' && (
          <div className="space-y-3.5">
            <div className="relative">
              <label htmlFor="acc-password" className="mb-1 block text-xs font-semibold text-mutedfg">Password baru</label>
              <div className="relative">
                <input
                  id="acc-password"
                  ref={(el) => { fieldRefs.current.password = el; }}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setField('password', e.target.value)}
                  disabled={clearPassword}
                  autoComplete="new-password"
                  placeholder={hasStoredPassword ? 'Tidak diubah' : 'Minimal 6 karakter'}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'acc-password-err' : undefined}
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-mutedfg transition-colors hover:text-brandfg"
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
              {errors.password && <p id="acc-password-err" className="mt-1 text-xs font-medium text-danger">{errors.password}</p>}
            </div>

            {password && !clearPassword && (
              <div>
                <label htmlFor="acc-password2" className="mb-1 block text-xs font-semibold text-mutedfg">Ulangi password</label>
                <input
                  id="acc-password2"
                  ref={(el) => { fieldRefs.current.password2 = el; }}
                  type={showPassword ? 'text' : 'password'}
                  value={password2}
                  onChange={(e) => setField('password2', e.target.value)}
                  autoComplete="new-password"
                  placeholder="Ketik ulang password baru"
                  aria-invalid={!!errors.password2}
                  aria-describedby={errors.password2 ? 'acc-password2-err' : undefined}
                  className={inputCls}
                />
                {errors.password2 && <p id="acc-password2-err" className="mt-1 text-xs font-medium text-danger">{errors.password2}</p>}
              </div>
            )}

            {hasStoredPassword && (
              <button
                type="button"
                onClick={() => {
                  setClearPassword((prev) => !prev);
                  setPassword('');
                  setPassword2('');
                  setErrors((prev) => ({ ...prev, password: undefined, password2: undefined }));
                }}
                className="min-h-[40px] w-full rounded-lg text-xs font-medium text-mutedfg transition-colors hover:bg-muted hover:text-danger"
              >
                {clearPassword ? 'Batalkan hapus password' : 'Hapus password'}
              </button>
            )}

            <button type="button" onClick={savePassword} className={`${CTA_CLASS} min-h-[48px] w-full`}>
              <Icon name="check" size={16} />
              Simpan Password
            </button>

            <div className="mt-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={onSwitchUser}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-3 text-xs font-medium text-mutedfg transition-colors hover:bg-muted hover:text-brandfg"
              >
                <Icon name="users" size={14} />
                Ganti pengguna
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-1 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-line px-3 text-xs font-medium text-tonerosefg transition-colors hover:bg-tonerose/10"
                >
                  <Icon name="logOut" size={14} />
                  Keluar
                </button>
              )}
            </div>
          </div>
        )}

        {/* ---------- Tab: Anggota (master only) ---------- */}
        {tab === 'anggota' && isMaster && (
          <div className="space-y-3.5">
            <button type="button" onClick={onRegister} className={`${CTA_CLASS} min-h-[48px] w-full text-sm font-semibold`}>
              <Icon name="userPlus" size={15} />
              Daftar Akun Baru
            </button>

            <div className="rounded-2xl border border-line bg-canvas p-3">
              <p className="mb-2 text-xs font-semibold text-mutedfg">Anggota keluarga</p>
              {users.filter((u) => u.id !== user?.id).length === 0 ? (
                <p className="text-xs text-mutedfg">Belum ada anggota lain.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {users.filter((u) => u.id !== user?.id).map((u) => (
                    <li key={u.id} className="flex items-center gap-2.5 py-2">
                      <Avatar user={u} className="h-8 w-8 rounded-lg bg-brandtint text-xs font-bold text-brandfg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{u.nama || u.name}</p>
                        <p className="truncate text-[11px] text-mutedfg">{u.username}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
