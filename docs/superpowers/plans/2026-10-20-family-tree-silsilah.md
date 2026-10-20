# Family Tree (Silsilah Keluarga) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (moda eksekusi INLINE sesuai preferensi Kakang — bukan subagent-driven).

**Goal:** Menampilkan anggota keluarga sebagai diagram silsilah 3 tingkat (Orangtua → Anak → Cucu) bersumber dari daftar akun backend, dengan tanggal lahir di tiap kotak.

**Architecture:** Backend Cloudflare Worker (Hono + D1) mendapat kolom baru `generasi` + `birth_date` di tabel users, endpoint register diperluas, endpoint baru `PUT /auth/me` untuk edit profil sendiri. Frontend PWA mendapat komponen baru `FamilyTree.jsx` yang menggantikan grid kartu di section "Anggota", plus dropdown posisi silsilah dan field tanggal lahir di AccountModal.

**Tech Stack:** Cloudflare Workers + D1 (SQLite), Hono, TypeScript (backend) · React 18 JSX + Vite + Tailwind (frontend)

**Spec:** `docs/superpowers/specs/2026-10-20-family-tree-silsilah-design.md`

## Global Constraints

- Label level 1 = **"Orangtua"** (bukan "ORANTUA"); nilai DB `generasi` = `orangtua` | `anak` | `cucu`
- `family_role` (suami/istri/anak/lainnya) tetap untuk label status di kotak — tidak diganti
- Tanggal lahir format DB: ISO `YYYY-MM-DD`; tampilan frontend: format Indonesia ("12 Mei 1990")
- Tanggal lahir kosong → baris tanggal **tidak ditampilkan** (bukan "—")
- Master `baytmustaqbal@gmail.com` tetap disembunyikan dari `/auth/users` dan dari tree
- Akun master tidak bisa dijadikan anggota (sudah tersembunyi) — tree hanya isi akun non-master
- Login response + `/auth/me` harus menyertakan `generasi` + `birth_date` (frontend fallback offline pakai ini)
- Ikon: pakai `users` + `heart` yang sudah ada di `components/Icon.jsx` — tidak tambah ikon baru
- Styling: utility Tailwind + token warna existing (`border-line`, `text-mutedfg`, `bg-canvas`, `text-ink`) — kompatibel dark/light otomatis
- Tidak ada dependency baru (YAGNI)

## Review Focus

1. **`generasi`/`birth_date` di baris lama (default/NULL):** akun yang dibuat sebelum migration harus default `orangtua` + `birth_date` NULL → frontend tidak crash, baris tanggal lahir disembunyikan. Test: Task 8 Step 6 case 1 (Rezki/Hilda tampil dengan tanggal, master hidden) + Task 6 Step 1 (`formatBirth` return null untuk input invalid).
2. **Registrasi tanpa field opsional:** registrasi dari klien lama (tanpa `generasi`/`birth_date`) harus tetap berhasil dengan default. Test: Task 3 Step 3 Case B.
3. **PUT /auth/me tanpa token / token invalid:** harus 401, bukan crash. Test: Task 4 Step 3.
4. **Non-master klik "+ Tambah" di level kosong:** harus dapat pesan info, bukan form daftar akun. Test: Task 6 Step 1 (spesifikasi perilaku `AddPlaceholder` — `isMaster=false` → teks info, tanpa `onAdd`).
5. **Tree dengan 0 anggota di level 1:** tidak boleh crash, tampilkan empty state. Test: Task 6 Step 3 (render dasar dengan `members=[]` via dev server — section kosong, placeholder muncul).

---

## Task 1: Migration `generasi` + `birth_date` + set data existing

**Files:**
- Create: `worker/migrations/0004_add_generasi_and_birthdate.sql` (di worktree `bayt-mustaqbal-backend-worktree`)
- Modify: tidak ada file kode

**Interfaces:**
- Produces: kolom `users.generasi` (TEXT NOT NULL DEFAULT 'orangtua'), `users.birth_date` (TEXT nullable)

- [ ] **Step 1: Tulis file migration**

`worker/migrations/0004_add_generasi_and_birthdate.sql`:
```sql
ALTER TABLE users ADD COLUMN generasi TEXT NOT NULL DEFAULT 'orangtua';
ALTER TABLE users ADD COLUMN birth_date TEXT;
```

- [ ] **Step 2: Apply ke remote D1**

Run (dari folder `worker/`):
```bash
npx wrangler d1 execute bayt-mustaqbal-db --remote --command="ALTER TABLE users ADD COLUMN generasi TEXT NOT NULL DEFAULT 'orangtua';"
npx wrangler d1 execute bayt-mustaqbal-db --remote --command="ALTER TABLE users ADD COLUMN birth_date TEXT;"
```
Expected: kedua perintah `"success": true`

- [ ] **Step 3: Set generasi + tanggal lahir akun existing**

```bash
npx wrangler d1 execute bayt-mustaqbal-db --remote --command="UPDATE users SET generasi = 'orangtua', birth_date = '1996-06-02' WHERE username = 'rezkiyuditriana@gmail.com' AND void IS NULL;"
npx wrangler d1 execute bayt-mustaqbal-db --remote --command="UPDATE users SET generasi = 'orangtua', birth_date = '2003-04-04' WHERE username = 'ak.hilda@gmail.com' AND void IS NULL;"
```
Expected: masing-masing `"changes": 1`

- [ ] **Step 4: Verifikasi hasil di DB**

```bash
npx wrangler d1 execute bayt-mustaqbal-db --remote --command="SELECT username, nama, generasi, birth_date, family_role FROM users WHERE void IS NULL ORDER BY username;"
```
Expected: 3 baris —
- `ak.hilda@gmail.com` / Hilda / `orangtua` / `2003-04-04` / `istri`
- `baytmustaqbal@gmail.com` / Administrator / `orangtua` / NULL / `anak`
- `rezkiyuditriana@gmail.com` / Rezki Yudi / `orangtua` / `1996-06-02` / `suami`

---

## Task 2: Backend — endpoint return `generasi` + `birth_date`

**Files:**
- Modify: `worker/src/routes/auth.ts` (endpoint `GET /auth/users`, `POST /auth/login`, `GET /auth/me`)

**Interfaces:**
- Consumes: kolom `generasi` + `birth_date` dari Task 1
- Produces:
  - `GET /auth/users` → array `{ id, username, nama, family_role, generasi, birth_date, avatar_url, created_at }`
  - `POST /auth/login` → `{ token, user: { id, username, nama, role, family_role, generasi, birth_date } }`
  - `GET /auth/me` → `{ id, username, nama, avatar_url, role, family_role, generasi, birth_date }`

- [ ] **Step 1: Update SELECT `GET /auth/users`**

Di `worker/src/routes/auth.ts`, ganti SELECT endpoint `/users`:
```ts
"SELECT id, username, nama, family_role, generasi, birth_date, avatar_url, created_at FROM users WHERE void IS NULL AND username != 'baytmustaqbal@gmail.com' ORDER BY created_at ASC"
```

- [ ] **Step 2: Update response `POST /auth/login`**

Tambahkan `generasi` + `birth_date` di object user response login:
```ts
user: { id: user.id, username: user.username, nama: user.nama, role: user.role, family_role: user.family_role || 'anak', generasi: user.generasi || 'orangtua', birth_date: user.birth_date || null }
```

- [ ] **Step 3: Update SELECT + konsistensi `GET /auth/me`**

Ganti SELECT jadi `'SELECT id, username, nama, avatar_url, role, family_role, generasi, birth_date FROM users WHERE id = ? AND void IS NULL'`. Karena endpoint ini `SELECT *`-style eksplisit, response otomatis menyertakan kolom baru — tidak perlu ubah `return c.json(...)`.

- [ ] **Step 4: Typecheck + verifikasi login/me via API**

Run: `cd worker && npx tsc --noEmit` —Expected: exit 0 (tanpa error)

Verifikasi (dari folder app frontend, pakai dev server proxy):
```bash
curl -s -X POST https://api.baytmustaqbal.my.id/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"baytmustaqbal@gmail.com\",\"password\":\"@_Eki091278\"}"
```
Expected: response `user` berisi `"generasi":"orangtua"` dan `"birth_date":null`

- [ ] **Step 5: Commit backend**

```bash
git add worker/src/routes/auth.ts
git commit -m "feat: return generasi + birth_date di users/login/me"
```

---

## Task 3: Backend — register terima `generasi` + `birth_date`

**Files:**
- Modify: `worker/src/routes/auth.ts` (endpoint `POST /auth/register`)

**Interfaces:**
- Consumes: Task 1 (kolom DB)
- Produces: `POST /auth/register { username, password, nama, family_role?, generasi?, birth_date? }` → `{ id, username, nama, role, family_role, generasi, birth_date }`

- [ ] **Step 1: Ganti body endpoint register**

Destructure tambah `generasi`, `birth_date`. Validasi:
```ts
const { username, password, nama, family_role, generasi, birth_date } = await c.req.json() as {
  username: string; password: string; nama: string;
  family_role?: string; generasi?: string; birth_date?: string;
};
```
Setelah validasi email yang sudah ada, tambah:
```ts
// Posisi silsilah: orangtua | anak | cucu (default orangtua)
const GENERASI = ['orangtua', 'anak', 'cucu'];
const gen = generasi && GENERASI.includes(generasi) ? generasi : 'orangtua';
// Tanggal lahir opsional — format ISO YYYY-MM-DD
const birth = birth_date && /^\d{4}-\d{2}-\d{2}$/.test(birth_date) ? birth_date : null;
```
Update INSERT (tambah 2 kolom + 2 placeholder):
```ts
'INSERT INTO users (id, username, password_hash, nama, role, family_role, generasi, birth_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
```
bind tambah `gen, birth`. Response tambah `generasi: gen, birth_date: birth`.

- [ ] **Step 2: Typecheck**

Run: `cd worker && npx tsc --noEmit` — Expected: exit 0

- [ ] **Step 3: Verifikasi register via API — case lengkap + case minimal**

```bash
# Case A: lengkap (semua field)
curl -s -X POST https://api.baytmustaqbal.my.id/api/auth/register -H "Content-Type: application/json" -d "{\"username\":\"anak1@gmail.com\",\"password\":\"anak12345\",\"nama\":\"Anak Pertama\",\"family_role\":\"anak\",\"generasi\":\"anak\",\"birth_date\":\"2016-02-20\"}"
# Case B: minimal (tanpa field opsional)
curl -s -X POST https://api.baytmustaqbal.my.id/api/auth/register -H "Content-Type: application/json" -d "{\"username\":\"minimal@gmail.com\",\"password\":\"minimal123\",\"nama\":\"Minimal\"}"
```
Expected:
- Case A: `"ok":true`, data berisi `family_role:"anak"`, `generasi:"anak"`, `birth_date:"2016-02-20"`
- Case B: `"ok":true`, data berisi `generasi:"orangtua"`, `birth_date:null` (tidak 400, tidak crash)

- [ ] **Step 4: Hapus akun test dari DB**

```bash
npx wrangler d1 execute bayt-mustaqbal-db --remote --command="DELETE FROM users WHERE username IN ('anak1@gmail.com', 'minimal@gmail.com') AND void IS NULL;"
```
Expected: `"changes": 2`

- [ ] **Step 5: Commit backend**

```bash
git add worker/src/routes/auth.ts
git commit -m "feat: register terima generasi + birth_date (opsional, tervalidasi)"
```

---

## Task 4: Backend — endpoint `PUT /auth/me` (edit profil sendiri)

**Files:**
- Modify: `worker/src/routes/auth.ts` (tambah endpoint baru setelah `GET /me`)

**Interfaces:**
- Consumes: Task 1 (kolom DB)
- Produces: `PUT /auth/me { nama?, birth_date? }` → `{ id, username, nama, avatar_url, role, family_role, generasi, birth_date }`

- [ ] **Step 1: Tambah endpoint `PUT /me`**

```ts
authRoutes.put('/me', async (c) => {
  const userId = c.get('userId');
  const { nama, birth_date } = await c.req.json() as { nama?: string; birth_date?: string | null };

  const existing = await c.env.DB.prepare('SELECT id, nama, birth_date FROM users WHERE id = ? AND void IS NULL')
    .bind(userId).first() as any;
  if (!existing) {
    return c.json({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } }, 404);
  }

  // Hanya field yang dikirim yang diupdate (partial update)
  const newNama = nama !== undefined ? (nama.trim() || existing.nama) : existing.nama;
  const newBirth = birth_date !== undefined
    ? (birth_date && /^\d{4}-\d{2}-\d{2}$/.test(birth_date) ? birth_date : null)
    : existing.birth_date;
  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE users SET nama = ?, birth_date = ?, updated_at = ? WHERE id = ? AND void IS NULL')
    .bind(newNama, newBirth, now, userId).run();

  const user = await c.env.DB.prepare('SELECT id, username, nama, avatar_url, role, family_role, generasi, birth_date FROM users WHERE id = ? AND void IS NULL')
    .bind(userId).first();
  return c.json({ ok: true, data: user, error: null });
});
```

- [ ] **Step 2: Typecheck**

Run: `cd worker && npx tsc --noEmit` — Expected: exit 0

- [ ] **Step 3: Verifikasi via API — tanpa token harus 401**

```bash
curl -s -X PUT https://api.baytmustaqbal.my.id/api/auth/me -H "Content-Type: application/json" -d "{\"nama\":\"Test\"}"
```
Expected: `{"ok":false,"data":null,"error":{"code":"UNAUTHENTICATED",...}}` status 401

- [ ] **Step 4: Verifikasi dengan token — update lalu kembalikan**

Login dulu (simpan token), lalu:
```bash
curl -s -X PUT https://api.baytmustaqbal.my.id/api/auth/me -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d "{\"birth_date\":\"1996-06-02\"}"
```
Expected: `"ok":true`, data berisi `"birth_date":"1996-06-02"`. (Nilai Kakang memang 1996-06-02, jadi aman di-test langsung.)

- [ ] **Step 5: Deploy backend + verifikasi endpoint live**

```bash
cd worker && npx wrangler deploy
```
Expected: `Deployed api-bayt-mustaqbal`, Current Version ID tercetak

- [ ] **Step 6: Commit backend**

```bash
git add worker/src/routes/auth.ts
git commit -m "feat: PUT /auth/me — edit nama + tanggal lahir profil sendiri"
```

---

## Task 5: Frontend client — register + updateProfile

**Files:**
- Modify: `services/client.js` (object `auth`)

**Interfaces:**
- Consumes: Task 3 + Task 4 (endpoint)
- Produces:
  - `auth.register(username, password, nama, familyRole, generasi, birthDate)` — 6 parameter
  - `auth.updateProfile({ nama?, birthDate? })` → user terbaru

- [ ] **Step 1: Update `auth.register` signature + body**

```js
register: async (username, password, nama, familyRole = 'anak', generasi = 'orangtua', birthDate = null) => {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username, password, nama,
      family_role: familyRole,
      generasi,
      birth_date: birthDate,
    }),
  });
},
```

- [ ] **Step 2: Tambah `auth.updateProfile`**

Setelah `auth.register`, tambah:
```js
updateProfile: async ({ nama, birthDate }) => {
  const body = {};
  if (nama !== undefined) body.nama = nama;
  if (birthDate !== undefined) body.birth_date = birthDate;
  return apiFetch('/auth/me', { method: 'PUT', body: JSON.stringify(body) });
},
```

- [ ] **Step 3: Verifikasi syntax**

Run (dari root frontend):
```bash
node -e "const p=require('@babel/parser');const fs=require('fs');p.parse(fs.readFileSync('services/client.js','utf8'),{sourceType:'module'});console.log('client.js: OK')"
```
Expected: `client.js: OK`

- [ ] **Step 4: Verifikasi register via browser console (opsional kalau dev server jalan)**

Buka `http://localhost:3001/`, DevTools Console:
```js
const t = localStorage.getItem('bm-api-token');
fetch('/api/auth/register', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'uji.register@gmail.com',password:'uji12345',nama:'Uji Register',family_role:'anak',generasi:'anak',birth_date:'2018-07-07'})}).then(r=>r.json()).then(console.log)
```
Expected: `ok:true` dengan `generasi:"anak"`, `birth_date:"2018-07-07"`. Setelah itu hapus via SQL:
```bash
npx wrangler d1 execute bayt-mustaqbal-db --remote --command="DELETE FROM users WHERE username = 'uji.register@gmail.com' AND void IS NULL;"
```

- [ ] **Step 5: Commit frontend**

```bash
git add services/client.js
git commit -m "feat: client register(6 param) + updateProfile untuk tanggal lahir"
```

---

## Task 6: Komponen `FamilyTree.jsx`

**Files:**
- Create: `components/FamilyTree.jsx`
- Test: verifikasi manual via dev server (Task ini render murni, tidak ada test runner di project — pakai check build + inspeksi DOM di browser)

**Interfaces:**
- Consumes: member objects dari `data.family` (dari Task 8): `{ id, name, role, initials, avatar, status, generasi, birthDate }`
- Produces: `<FamilyTree members={[]} isMaster={bool} onAdd={(generasi) => {}} onSelect={(member) => {}} />`

- [ ] **Step 1: Buat `components/FamilyTree.jsx`**

Struktur komponen (satu file, fungsi + sub-komponen internal):

```jsx
import React, { useState } from 'react';
import { Icon } from './Icon';

const LABEL_GENERASI = { orangtua: 'Orangtua', anak: 'Anak', cucu: 'Cucu' };
const ICON_LEVEL = { orangtua: 'users', anak: 'users', cucu: 'users' };

// Format ISO -> "12 Mei 1990"; null/invalid -> null (baris disembunyikan)
const formatBirth = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${d} ${bulan[m - 1]} ${y}`;
};
```

Layout (detail visual ada di spec section 3):
- **Level 1 (Orangtua):** grid 3 kolom desktop (`grid-cols-1 sm:grid-cols-3`): kotak Suami (kiri), pill "Orangtua" dengan ikon `heart` (tengah, `justify-self-center`), kotak Istri (kanan). Kalau hanya 1 anggota level ini → grid 2 kolom (kotak + pill). Kalau 0 → empty state.
  - Garis penghubung: pill punya `border-l`/`border-r` tipis horizontal (CSS border sederhana), lalu garis vertikal `h-6 w-px bg-line mx-auto` di bawah pill turun ke level 2.
- **Level 2 & 3:** heading label (`text-sm font-bold uppercase tracking-wider text-mutedfg`, ikon `users`), grid `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`, kartu anggota atau placeholder kosong (dashed border + tombol "+") bila kosong.
- **Kartu anggota** (fungsi internal `MemberBox`): klik → `onSelect(member)`; isi: lingkaran foto/inisial (`h-14 w-14 rounded-full`), nama bold truncate, badge status (`family_role`), baris tanggal lahir kalau `formatBirth` bukan null. Panel detail inline expand (state lokal `expandedId`) menampilkan email/username, role, generasi, tanggal lahir.
- **Placeholder level kosong** (`AddPlaceholder`): dashed border, tombol "+" → `onAdd(generasi)` kalau `isMaster`, kalau bukan → tampilkan teks info "Hanya akun master yang bisa menambah anggota".

Props default: `members = []`, `isMaster = false`, `onAdd = () => {}`, `onSelect = () => {}`.

- [ ] **Step 2: Verifikasi syntax**

```bash
node -e "const p=require('@babel/parser');const fs=require('fs');p.parse(fs.readFileSync('components/FamilyTree.jsx','utf8'),{sourceType:'module',plugins:['jsx']});console.log('FamilyTree.jsx: OK')"
```
Expected: `FamilyTree.jsx: OK`

- [ ] **Step 3: Verifikasi render dasar di browser (dev server)**

Tambah sementara di `App.jsx` (ATAU langsung lanjut Task 8 dan verifikasi di section Anggota): navigasi ke Keluarga → cek 3 level tampil (Orangtua terisi 2, Anak/Cucu placeholder).

- [ ] **Step 4: Commit frontend**

```bash
git add components/FamilyTree.jsx
git commit -m "feat: komponen FamilyTree — diagram silsilah 3 tingkat"
```

---

## Task 7: App.jsx — mapping + integrasi FamilyTree

**Files:**
- Modify: `App.jsx` (fungsi `mapUsersToFamily`, section `case 'family'`, state preset generasi, import FamilyTree)
- Modify: `components/AccountModal.jsx` (dropdown generasi, field tanggal lahir, simpan profil)

**Interfaces:**
- Consumes: `FamilyTree` dari Task 6; `mapUsersToFamily` (existing, di App.jsx)
- Produces: `data.family` items bertambah `{ generasi, birthDate }`; AccountModal props baru `initialGenerasi`, `onSaved`

- [ ] **Step 1: Update `mapUsersToFamily` di App.jsx**

Tambah 2 field di object yang di-return:
```js
generasi: u.generasi || 'orangtua',
birthDate: u.birth_date || null,
```
(Field existing `role: FAMILY_ROLE_LABEL[u.family_role] || 'Anak'` tetap.)

- [ ] **Step 2: Import + ganti render section Anggota**

Di App.jsx: tambah `import { FamilyTree } from './components/FamilyTree';`

Di `case 'family'`, ganti blok `data.family.map((member) => <FamilyMemberCard .../>)` menjadi:
```jsx
<FamilyTree
  members={data.family}
  isMaster={currentUser?.username === 'baytmustaqbal@gmail.com'}
  onAdd={handleTreeAdd}
  onSelect={() => {}}
/>
```

- [ ] **Step 3: Tambah state preset generasi + `handleTreeAdd`**

```js
const [accountInitialGenerasi, setAccountInitialGenerasi] = useState(null);
const handleTreeAdd = (generasi) => {
  setAccountInitialGenerasi(generasi);
  setAccountOpen(true);
};
```
Pass ke AccountModal: `initialGenerasi={accountInitialGenerasi}` + `onSaved={() => loadFromAPI()}`.

- [ ] **Step 4: Verifikasi syntax App.jsx**

```bash
node -e "const p=require('@babel/parser');const fs=require('fs');p.parse(fs.readFileSync('App.jsx','utf8'),{sourceType:'module',plugins:['jsx']});console.log('App.jsx: OK')"
```
Expected: `App.jsx: OK`

- [ ] **Step 5: Commit frontend**

```bash
git add App.jsx
git commit -m "feat: integrasi FamilyTree di section Keluarga + preset generasi dari placeholder"
```

---

## Task 8: AccountModal — dropdown silsilah + tanggal lahir + simpan profil

**Files:**
- Modify: `components/AccountModal.jsx` (form daftar akun: field tanggal lahir + dropdown generasi; bagian profil: field tanggal lahir + simpan)

**Interfaces:**
- Consumes: `auth.register` 6-param + `auth.updateProfile` dari Task 5; props `initialGenerasi`, `onSaved` dari Task 7
- Produces: field baru `id="reg-birth-date"` (input date), `id="reg-generasi"` (select); profil: `id="profile-birth-date"` (input date) + tombol simpan memanggil `auth.updateProfile`

- [ ] **Step 1: State baru di AccountModal**

Tambah: `regGenerasi` (default `'orangtua'`), `regBirthDate` (default `''`), `profileBirthDate` (default dari user existing kalau ada), `profileSaving` (bool), `profileSaved` (pesan sukses).

- [ ] **Step 2: Form daftar akun — field tanggal lahir (setelah Nama) + dropdown posisi silsilah (setelah Status keluarga)**

- `<label htmlFor="reg-birth-date">Tanggal lahir (opsional)</label>` + `<input id="reg-birth-date" type="date" value={regBirthDate} onChange={...} className={inputCls} />`
- `<label htmlFor="reg-generasi">Posisi dalam silsilah</label>` + `<select id="reg-generasi" value={regGenerasi} onChange={...}>` dengan options: `orangtua` (Orangtua), `anak` (Anak), `cucu` (Cucu)
- Update `handleRegister`: kirim `regFamilyRole, regGenerasi, regBirthDate || null` ke `auth.register`; reset field baru setelah sukses. Kalau `initialGenerasi` prop berubah (dibuka dari placeholder tree), set `regGenerasi` ke nilai itu (useEffect).

- [ ] **Step 3: Bagian profil — field tanggal lahir + tombol simpan**

- `<label htmlFor="profile-birth-date">Tanggal lahir</label>` + `<input id="profile-birth-date" type="date" value={profileBirthDate} onChange={...} />`
- Tombol "Simpan tanggal lahir" (terpisah dari tombol simpan profil utama): `onClick` → `setProfileSaving(true)` → `auth.updateProfile({ birthDate: profileBirthDate || null })` → sukses: `setProfileSaved('Tanggal lahir tersimpan')` + `onSaved?.()`; gagal: tampilkan pesan error. Akhiri `setProfileSaving(false)`.
- Init `profileBirthDate` dari `user?.birthDate` (App.jsx perlu kirim `birthDate` di `currentUser` — tambah di `handleLogin` dan `transformedUser`).

- [ ] **Step 4: App.jsx — `currentUser` bawa `birthDate`**

Di `handleLogin`: tambah `birthDate: user.birth_date || null` di `frontendUser`. Di `transformedUser` (restore dari localStorage): tambah `birthDate: stored.birth_date || null`.

- [ ] **Step 5: Verifikasi syntax**

```bash
node -e "const p=require('@babel/parser');const fs=require('fs');['App.jsx','components/AccountModal.jsx'].forEach(f=>{p.parse(fs.readFileSync(f,'utf8'),{sourceType:'module',plugins:['jsx']});console.log(f+': OK')})"
```
Expected: kedua file OK

- [ ] **Step 6: Verifikasi end-to-end di browser (dev server)**

Urutan cek (semua kasus dari spec section 7):
1. Halaman Keluarga: level **Orangtua** tampil Rezki (Suami, "2 Juni 1996") + Hilda (Istri, "4 April 2003"); level **Anak** & **Cucu** tampil placeholder "+"
2. Klik salah satu kotak → panel detail expand (email + role + generasi + tanggal lahir)
3. Klik placeholder Anak → AccountModal terbuka dengan dropdown Posisi = Anak (preset)
4. Isi form daftar akun anak (username, nama, tanggal lahir, status Anak, posisi Anak, password) → Daftar → sukses → reload → anak muncul di level 2 dengan tanggal lahir
5. Edit tanggal lahir profil sendiri → Simpan → kotak di tree terbaru
6. Master tidak muncul di tree
7. Dark/light + mobile/desktop tampil wajar

- [ ] **Step 7: Production build**

Run: `npm run build` — Expected: `built in ...s` tanpa error

- [ ] **Step 8: Commit frontend**

```bash
git add components/AccountModal.jsx App.jsx
git commit -m "feat: AccountModal — tanggal lahir + posisi silsilah + simpan profil sendiri"
```

---

## Task 9: Cleanup + push

**Files:**
- Modify: tidak ada (operasi git)

- [ ] **Step 1: Hapus file temp jika ada**

Cek `git status -s` — buang file sampah (`.bat`, `.mjs` helper) yang tidak sengaja ter-track.

- [ ] **Step 2: Verifikasi semua test build lagi**

Run: `npm run build` — Expected: sukses

- [ ] **Step 3: Minta approval push ke Kakang**

Laporkan daftar commit yang akan dipush (frontend repo + backend worktree). **TUNGGU persetujuan "push" sebelum eksekusi.**

---

## Ringkasan commit yang akan dihasilkan

Backend (`backend-d1`):
1. `feat: return generasi + birth_date di users/login/me`
2. `feat: register terima generasi + birth_date (opsional, tervalidasi)`
3. `feat: PUT /auth/me — edit nama + tanggal lahir profil sendiri`

Frontend (`main`):
4. `feat: client register(6 param) + updateProfile untuk tanggal lahir`
5. `feat: komponen FamilyTree — diagram silsilah 3 tingkat`
6. `feat: integrasi FamilyTree di section Keluarga + preset generasi dari placeholder`
7. `feat: AccountModal — tanggal lahir + posisi silsilah + simpan profil sendiri`

Migration: `0004_add_generasi_and_birthdate.sql` (commit bersama backend)
