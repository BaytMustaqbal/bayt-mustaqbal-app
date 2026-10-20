# Silsilah Keluarga (Family Tree) — Design Spec

**Tanggal:** 2026-10-20
**Status:** Approved design (menunggu review Kakang)
**Keputusan terkait:** Kakang + Istri = **Orangtua** (level 1); kotak compact (foto + nama + status); label "Orangtua" (bukan "ORANTUA").

---

## 1. Ringkasan

Mengganti tampilan section "Anggota" (sekarang grid kartu `FamilyMemberCard`) menjadi **diagram silsilah keluarga 3 tingkat** yang datanya bersumber dari daftar akun backend.

| Level | Label | Sumber data | Status sekarang |
|-------|-------|-------------|-----------------|
| 1 | **Orangtua** | `generasi = 'orangtua'` | 2 akun (Rezki, Hilda) — sudah ada |
| 2 | **Anak** | `generasi = 'anak'` | 0 akun — placeholder |
| 3 | **Cucu** | `generasi = 'cucu'` | 0 akun — placeholder |

---

## 2. Data model & backend

### 2.1 Migration `0004_add_generasi.sql`
```sql
ALTER TABLE users ADD COLUMN generasi TEXT NOT NULL DEFAULT 'orangtua';
```

### 2.2 Data existing (SQL setelah migration)
```sql
UPDATE users SET generasi = 'orangtua' WHERE username IN ('rezkiyuditriana@gmail.com', 'ak.hilda@gmail.com') AND void IS NULL;
```
(Akun master `baytmustaqbal@gmail.com` tetap `orangtua` — tersembunyi dari daftar anggota lewat `/api/auth/users`.)

### 2.3 Backend — `src/routes/auth.ts`
- `POST /auth/register`: terima + validasi `generasi` (`['orangtua', 'anak', 'cucu']`, default `orangtua`)
- Insert mencantumkan `generasi`
- Response register/login/me sertakan `generasi`
- `GET /auth/users`: return `generasi` (master tetap disembunyikan)

### 2.4 Frontend client — `services/client.js`
- `auth.register(username, password, nama, familyRole, generasi)` — parameter tambahan `generasi`
- `auth.users()` — sudah ada, tidak berubah

---

## 3. UI — komponen `FamilyTree.jsx` (baru)

### 3.1 Struktur visual
```
                [ ♥ Orangtua ]                    ← pill penghubung di tengah
   [ Foto/Nama ]  ─────────  [ Foto/Nama ]        ← level 1: Suami kiri, Istri kanan
                       │
                    [ ANAK ]                      ← label section (uppercase kecil)
   [ anak 1 ]   [ anak 2 ]   [ anak 3 ] ...       ← level 2 grid (placeholder jika kosong)
                       │
                    [ CUCU ]                      ← label section
   [ cucu 1 ]   [ cucu 2 ]   [ cucu 3 ] ...       ← level 3 grid (placeholder jika kosong)
```

### 3.2 Kotak anggota (compact — sesuai keputusan Kakak)
Isi kotak:
- Lingkaran foto (avatar kalau ada, inisial kalau belum) — ukuran ~64px level 1, ~56px level 2/3
- Nama (bold, truncate)
- Label status (Suami / Istri / Anak / Lainnya) — badge kecil
- Klik kotak → panel detail **inline expand** menampilkan info yang tersedia di DB: email/username, role, generasi

**Catatan jujur:** field Lahir / Golongan darah / Alergi / WhatsApp **tidak ada di tabel users** — ditampilkan hanya jika nanti ditambahkan ke backend. Tidak menampilkan placeholder "—" yang menyesatkan.

### 3.3 Level label
Gaya mengikuti heading existing di halaman Keluarga (`text-sm font-bold uppercase tracking-wider text-mutedfg`), dengan ikon `users` untuk ketiga level (ikon ini sudah ada di `Icon.jsx` — tidak perlu ikon baru).

Badge "Orangtua" di tengah penghubung: pill kecil dengan ikon `heart` (sudah ada di Icon.jsx).

### 3.4 Garis penghubung
- Warna: `border-line` (mengikuti tema)
- Bentuk: garis horizontal pendek di kiri/kanan pill "Orangtua", lalu garis vertikal turun ke level 2, lalu garis horizontal + vertikal ke tiap kotak level 2 (pola "distributor" seperti foto)
- Implementasi: CSS border sederhana (bukan SVG) supaya responsif dan tidak berat. Kalau CSS terlalu ribet untuk pola distributor, pakai 2 div: satu garis vertikal tengah + tiap kotak punya garis pendek di atas (pseudo-element).

### 3.5 Empty state per level
- Kotak dashed dengan tombol "+" di tengah
- Level 1: kalau kosong → pesan "Belum ada data Orangtua. Daftarkan akun dengan posisi Orangtua."
- Level 2/3: 1-2 kotak placeholder "+ Tambah" → klik buka form daftar akun (kalau master) atau pesan info (kalau bukan master)
- Tombol "+" memanggil callback `onAdd(generasi)` yang di App.jsx → buka AccountModal dengan generasi terpilih

### 3.6 Responsif
- Mobile (< 640px): level 1 tetap 2 kolom (Suami/Istri) kalau keduanya ada; kalau hanya 1 → 1 kolom. Level 2/3 grid 1→2→3→4 kolom mengikuti breakpoint existing (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`)
- Desktop: level 1 grid 3 kolom (Suami | pill | Istri)

---

## 4. Integrasi frontend

### 4.1 `components/AccountModal.jsx` — form daftar akun
- Dropdown baru: **"Posisi dalam silsilah"** — Orangtua / Anak / Cucu (`id="reg-generasi"`)
- Urutan field: Username → Nama → **Status keluarga** (Suami/Istri/Anak/Lainnya) → **Posisi dalam silsilah** (Orangtua/Anak/Cucu) → Password → Ulangi password
- `handleRegister` mengirim `generasi` ke `auth.register(...)`

### 4.2 `App.jsx`
- `mapUsersToFamily`: tambah field `generasi` (default `'orangtua'`)
- Section `case 'family'` di App.jsx: ganti blok `data.family.map(<FamilyMemberCard ...>)` menjadi `<FamilyTree members={data.family} isMaster={...} onAdd={handleTreeAdd} onSelect={...} />`
- `handleTreeAdd(generasi)` → buka AccountModal dengan generasi preset. Karena AccountModal dikontrol prop `open`, perlu mekanisme preset (mis. state `accountInitialGenerasi` yang dikirim ke AccountModal)
- Import `FamilyTree` dari `./components/FamilyTree`

### 4.3 Judul section
- Section tetap diberi judul "Anggota" + subtitle count (sudah ada di App.jsx, tidak diubah)
- Di dalamnya, FamilyTree menggantikan grid kartu

---

## 5. Yang TIDAK berubah
- `familyMedical`, `familyContacts`, `familyDocuments` — tetap `FamilyList` dengan tombol "+ Data" (sudah jalan)
- Endpoint lain — tidak disentuh
- AccountModal bagian profil (nama, avatar, password) — tetap

---

## 6. Error handling
- Gagal render/empty data: tampilkan empty state, bukan crash
- `generasi` tidak dikenal (nilai lama/null): defaultkan ke `'orangtua'` di frontend mapping
- Bukan master klik "+": tampilkan toast info "Hanya akun master yang bisa menambah anggota"

---

## 7. Testing (verifikasi manual di dev)
1. **0 anak / 0 cucu** (kondisi sekarang): level 1 tampil Rezki (Suami) + Hilda (Istri), level 2 & 3 placeholder "+"
2. **Daftar akun anak** (via AccountModal, pilih Anak + Anak): muncul di level 2
3. **Daftar akun cucu** (pilih Cucu + Anak): muncul di level 3
4. Klik kotak → panel detail expand (email + role + generasi)
5. Dark/light theme, mobile + desktop
6. Master hidden dari level 1 (cek `/auth/users` tetap exclude master)
7. Production build lulus

---

## 8. Urutan implementasi (untuk writing-plans)
1. Migration `0004` + apply remote + set generasi existing accounts
2. Backend: register terima `generasi`, endpoint return `generasi` — typecheck + deploy
3. Frontend client: `register(..., generasi)`
4. Komponen `FamilyTree.jsx` (+ test render dasar)
5. App.jsx integration + AccountModal dropdown
6. Verifikasi dev (kasus 1-5 di atas) + production build
7. Commit + minta push approval

---

## 9. Keputusan desain yang sudah disetujui Kakang
- Struktur 3 tingkat penuh seperti foto referensi
- Kakang + Istri = Orangtua (level 1); Anak = level 2; Cucu = level 3
- Kotak compact: foto + nama + status (bukan detail lengkap)
- Label "Orangtua" (koreksi typo dari "ORANTUA")
