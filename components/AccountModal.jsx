import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Avatar, CTA_CLASS } from './ui';

/* ============================================================================
   Modal "Akun saya" — ganti nama, username, avatar, dan password.

   Dibuka dari chip pengguna di header. Bentuknya dialog di TENGAH layar
   (bukan bottom sheet seperti form tambah data) karena ini pengaturan akun,
   bukan pencatatan data keluarga.

   Pola aksesibilitas mengikuti FormSheet supaya konsisten:
     - role="dialog" aria-modal + aria-labelledby
     - Escape & ketukan di luar panel menutup; scroll body dikunci
     - label terhubung (htmlFor/id), error per-field (aria-invalid +
       aria-describedby), dan fokus pindah ke field bermasalah saat gagal simpan
     - tombol lihat/sembunyikan password (panduan UX: pengguna harus bisa
       memeriksa apa yang diketik)

   PENTING (purwarupa): belum ada backend, jadi password HANYA disimpan sebagai
   kolom profil dan tidak diverifikasi di mana pun. Hal ini dinyatakan terus
   terang di dalam modal supaya tidak menimbulkan rasa aman yang palsu.

   Avatar: foto dikecilkan ke 256x256 (crop tengah) lalu disimpan sebagai data
   URL di snapshot data lokal — tanpa dependensi baru.
   ============================================================================ */

const AVATAR_SIZE = 256;
const AVATAR_MAX_BYTES = 150 * 1024; // batas agar snapshot localStorage tidak menggemuk

/* Baca berkas → crop tengah jadi persegi → kecilkan ke 256x256 → JPEG data URL.
   Dipisah dari komponen supaya mudah di-await dan pesan errornya jelas
   (berkas bukan gambar, format tak terbaca browser mis. HEIC, hasil terlalu besar). */
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
        // Latar putih: JPEG tak punya transparansi, jadi PNG transparan tidak jadi hitam
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        // base64 ≈ 4/3 ukuran asli → perkiraan ukuran byte
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

/* Pilihan tampilan. `system` = ikut pengaturan terang/gelap perangkat. */
const THEME_OPTIONS = [
  { value: 'system', label: 'Sistem', icon: 'monitor' },
  { value: 'light', label: 'Terang', icon: 'sun' },
  { value: 'dark', label: 'Gelap', icon: 'moon' },
];

export function AccountModal({
  open,
  user,
  users = [],
  onClose,
  onSwitchUser,
  onLogout,
  onSave,
  theme = 'system',
  onThemeChange,
}) {
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

  const fieldRefs = useRef({});
  const fileRef = useRef(null);
  const titleId = useId();

  // Tutup + kembalikan fokus ke chip pemicu supaya pengguna keyboard tidak tersesat
  const close = () => {
    onClose();
    setTimeout(() => document.getElementById('account-trigger')?.focus(), 0);
  };

  // Isi ulang dari data akun setiap kali modal dibuka (Batal = buang perubahan)
  useEffect(() => {
    if (!open) return undefined;
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
    const t = setTimeout(() => fieldRefs.current.name?.focus(), 80);
    return () => clearTimeout(t);
    // user dianggap tetap selama modal terbuka — cukup re-run saat `open` berubah
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kunci scroll body + tutup via Escape
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

    if (normalizedUsername && !/^[a-z0-9._-]{3,20}$/.test(normalizedUsername)) {
      errs.username = '3–20 karakter: huruf kecil, angka, titik, garis bawah, atau strip';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      fieldRefs.current[FIELD_ORDER.find((key) => errs[key])]?.focus();
      return;
    }
    onSave({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      avatar,
      // undefined = tidak diubah · '' = dihapus · string = password baru
      password: clearPassword ? '' : password || undefined,
    });
    close();
  };

  const handlePickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // agar memilih berkas yang sama lagi tetap memicu onChange
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

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* Backdrop: tutup saat diketuk di luar panel */}
      <button
        type="button"
        aria-label="Tutup pengaturan akun"
        onClick={close}
        className="modal-backdrop absolute inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm"
      />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="modal-panel relative max-h-[calc(100dvh_-_2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-surface/95 p-5 shadow-pop backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
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

        {/* ---------- Foto profil ---------- */}
        <div className="rounded-2xl border border-line bg-canvas p-3.5">
          <div className="flex items-center gap-3">
            <Avatar
              user={previewUser}
              className={`h-16 w-16 rounded-xl text-xl font-bold ${
                avatar ? 'bg-muted' : 'bg-brandtint text-brandfg'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-mutedfg">Foto profil</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-mutedfg">
                Foto dikecilkan otomatis ke 256 piksel, lalu disimpan di perangkat ini.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarBusy}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:border-brand/60 disabled:opacity-50"
                >
                  <Icon name="camera" size={14} />
                  {avatarBusy ? 'Memproses…' : avatar ? 'Ganti foto' : 'Pilih foto'}
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatar('');
                      setNotice('');
                    }}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-mutedfg transition-colors hover:bg-muted hover:text-danger"
                  >
                    <Icon name="trash" size={14} />
                    Hapus foto
                  </button>
                )}
              </div>
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
          {notice && (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {notice}
            </p>
          )}
        </div>

        {/* ---------- Nama & username ---------- */}
        <div className="mt-3.5">
          <label htmlFor="acc-name" className="mb-1 block text-xs font-semibold text-mutedfg">
            Nama
            <span className="text-brand" aria-hidden="true">
              {' '}
              *
            </span>
          </label>
          <input
            id="acc-name"
            ref={(el) => {
              fieldRefs.current.name = el;
            }}
            type="text"
            value={name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Nama panggilan di rumah"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'acc-name-err' : undefined}
            className={inputCls}
          />
          {errors.name && (
            <p id="acc-name-err" className="mt-1 text-xs font-medium text-danger">
              {errors.name}
            </p>
          )}
        </div>

        <div className="mt-3.5">
          <label htmlFor="acc-username" className="mb-1 block text-xs font-semibold text-mutedfg">
            Username
          </label>
          <input
            id="acc-username"
            ref={(el) => {
              fieldRefs.current.username = el;
            }}
            type="text"
            value={username}
            onChange={(e) => setField('username', e.target.value)}
            placeholder="mis. rezki"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? 'acc-username-err' : 'acc-username-help'}
            className={inputCls}
          />
          {errors.username ? (
            <p id="acc-username-err" className="mt-1 text-xs font-medium text-danger">
              {errors.username}
            </p>
          ) : (
            <p id="acc-username-help" className="mt-1 text-[11px] text-mutedfg">
              Dipakai sebagai nama masuk saat login sungguhan siap. Boleh dikosongkan.
            </p>
          )}
        </div>

        {/* ---------- Password ---------- */}
        <div className="mt-3.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="acc-password" className="block text-xs font-semibold text-mutedfg">
              Password
            </label>
            {hasStoredPassword && (
              <button
                type="button"
                onClick={() => {
                  setClearPassword((prev) => !prev);
                  setPassword('');
                  setPassword2('');
                  setErrors((prev) => ({ ...prev, password: undefined, password2: undefined }));
                }}
                className="min-h-[32px] shrink-0 rounded-lg px-2 text-[11px] font-medium text-mutedfg transition-colors hover:bg-muted hover:text-danger"
              >
                {clearPassword ? 'Batalkan hapus' : 'Hapus password'}
              </button>
            )}
          </div>

          <div className="relative">
            <input
              id="acc-password"
              ref={(el) => {
                fieldRefs.current.password = el;
              }}
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
          {errors.password && (
            <p id="acc-password-err" className="mt-1 text-xs font-medium text-danger">
              {errors.password}
            </p>
          )}

          {/* Field ulangan muncul hanya saat password baru diisi (tanpa verifikasi
              password lama — memang belum ada yang bisa memverifikasi) */}
          {password && !clearPassword && (
            <div className="mt-3.5">
              <label htmlFor="acc-password2" className="mb-1 block text-xs font-semibold text-mutedfg">
                Ulangi password
              </label>
              <input
                id="acc-password2"
                ref={(el) => {
                  fieldRefs.current.password2 = el;
                }}
                type={showPassword ? 'text' : 'password'}
                value={password2}
                onChange={(e) => setField('password2', e.target.value)}
                autoComplete="new-password"
                placeholder="Ketik ulang password baru"
                aria-invalid={!!errors.password2}
                aria-describedby={errors.password2 ? 'acc-password2-err' : undefined}
                className={inputCls}
              />
              {errors.password2 && (
                <p id="acc-password2-err" className="mt-1 text-xs font-medium text-danger">
                  {errors.password2}
                </p>
              )}
            </div>
          )}

          {/* Kejujuran purwarupa: password belum diverifikasi siapa pun */}
          <p className="mt-2.5 flex items-start gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5 text-[11px] leading-relaxed text-mutedfg">
            <span className="mt-0.5 shrink-0 text-accent" aria-hidden="true">
              <Icon name="alertTriangle" size={14} />
            </span>
            <span>
              Purwarupa: password hanya <strong className="font-semibold text-ink">disimpan di perangkat ini</strong> dan
              belum diverifikasi server. Jangan pakai password asli.
            </span>
          </p>
        </div>

        {/* ---------- Tampilan (tema) ----------
            Bukan bagian dari <form> yang menunggu "Simpan": pilihannya langsung
            berlaku (dan disimpan App), karena menunggu tombol simpan untuk
            sekadar mengubah warna terasa aneh. */}
        <fieldset className="mt-3.5 rounded-2xl border border-line bg-canvas p-3.5">
          <legend className="px-1 text-xs font-semibold text-mutedfg">Tampilan</legend>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => (
              <label key={opt.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="bm-theme"
                  value={opt.value}
                  checked={theme === opt.value}
                  onChange={() => onThemeChange?.(opt.value)}
                  className="peer sr-only"
                />
                <span className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface px-2 text-[11px] font-medium text-mutedfg transition-colors hover:bg-muted peer-checked:border-brand/50 peer-checked:bg-brandtint peer-checked:text-brandfg peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas">
                  <Icon name={opt.icon} size={17} />
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-mutedfg">
            Pilihan langsung berlaku dan disimpan di perangkat ini. <strong className="font-semibold text-ink">Sistem</strong> mengikuti
            pengaturan terang/gelap HP.
          </p>
        </fieldset>

        {/* ---------- Aksi ---------- */}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={close}
            className="min-h-[48px] flex-1 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-mutedfg transition-colors hover:text-ink"
          >
            Batal
          </button>
          <button type="submit" className={`${CTA_CLASS} min-h-[48px] flex-[2]`}>
            <Icon name="check" size={16} />
            Simpan
          </button>
        </div>

        {/* Keluar dari sesi ini = kembali ke layar gerbang. Di app ini memang satu
            aksi, jadi sengaja hanya satu tombol (bukan "Keluar" + "Ganti pengguna"). */}
        <button
          type="button"
          onClick={onSwitchUser}
          className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-3 text-xs font-medium text-mutedfg transition-colors hover:bg-muted hover:text-brandfg"
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
      </form>
    </div>
  );
}
