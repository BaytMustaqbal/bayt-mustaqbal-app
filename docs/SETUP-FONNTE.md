# Panduan Setup Fonnte untuk Bayt Mustaqbal

> **STATUS — 12 Okt 2026:** Dokumen ini bagian dari rencana **FAMILY OS versi Google Sheets + Apps Script** (11 Okt 2026). **Bagian stack sudah tidak berlaku** — acuan teknis sekarang **Cloudflare Pages (React + Vite di root repo) + Cloudflare Worker + D1**; lihat `README.md` dan `AGENT.md`. **Keputusan produknya tetap berlaku** (D1 admin/user, D5 satu tabel agenda, D6 `recurring` ≠ `bills`, D9 edit 24 jam, D11 rekening aktif, D13 estimasi tagihan, D15 WA via Fonnte, D16 iuran sampah). Disimpan sebagai riwayat: jangan dipakai sebagai acuan teknis sebelum dipetakan ulang ke D1.
>
> **Khusus berkas ini:** langkah pendaftaran Fonnte, pembuatan token, dan ID grup (`628xx@g.us`) **tetap relevan** (D15 tetap berlaku). Yang berubah: pengirimnya nanti **Cloudflare Worker** (`fetch`), bukan Apps Script `UrlFetchApp`.

> **Tujuan:** Bisa kirim notifikasi WA ke grup keluarga dari backend aplikasi.
> **Waktu butuh:** ± 15 menit.
> **Biaya:** Gratis (tier free Fonnte cukup untuk kebutuhan keluarga).

---

## 1. Daftar Akun Fonnte

1. Buka **https://fonnte.com** → klik **Daftar / Register**
2. Isi email, password, nama → verifikasi email
3. Login ke dashboard Fonnte

---

## 2. Hubungkan WhatsApp (Device)

> **Penting:** Fonnte butuh 1 nomor WA sebagai "device" pengirim. Bisa pakai nomor pribadi Kakang, tapi **lebih baik pakai nomor kedua / eSIM / nomor khusus** supaya chat pribadi tidak tercampur.

### Cara:
1. Di dashboard Fonnte → menu **Device** → **Tambah Device**
2. Pilih **WhatsApp** → muncul QR code
3. Buka WA di HP → **Tertautkan Perangkat** (Linked Devices) → **Tautkan Perangkat** → scan QR code
4. Tunggu status jadi **Connected** (hijau)
5. Catat **Device ID** yang muncul (contoh: `default` atau `device_123`) → ini nanti diisi ke `settings.fonnte_device`

> **Tips:** Kalau QR code tidak muncul / error, coba refresh halaman. Fonnte kadang butuh refresh 2-3x.

---

## 3. Buat Grup WA Keluarga & Masukkan Nomor Fonnte

1. Buka WA → buat grup baru (mis. nama: **Keluarga Bayt Mustaqbal**)
2. Anggota: Kakang + Istri + **nomor WA yang dipakai Device Fonnte tadi**
3. **Jadikan nomor Fonnte sebagai ADMIN grup** (penting: biar Fonnte bisa baca pesan grup & kirim)
4. Grup siap.

---

## 4. Dapatkan Group ID (Target)

> Format Group ID: `628xxxxxxxxxx@g.us` (nomor Indonesia diawali `62`, bukan `08`)

### Cara termudah (via WhatsApp Web):
1. Buka **https://web.whatsapp.com** di browser desktop
2. Masuk ke grup **Keluarga Bayt Mustaqbal**
3. Lihat **URL di address bar** — akan terlihat seperti:
   ```
   https://web.whatsapp.com/accept?code=6281234567890@g.us
   ```
   atau di URL grup langsung:
   ```
   https://web.whatsapp.com/?group=6281234567890@g.us
   ```
4. Ambil bagian `628xxxxxxxxxx@g.us` → itu **Group ID**
5. Simpan — ini nanti diisi ke `settings.fonnte_target`

### Cara alternatif (via Fonnte Dashboard):
1. Dashboard Fonnte → **Device** → klik device yang connected
2. Tab **Groups** → cari nama grup "Keluarga Bayt Mustaqbal"
3. Copy **Group ID** di kolom sebelahnya

---

## 5. Dapatkan API Token

1. Dashboard Fonnte → menu **Pengaturan** (ikon gear) → **API Token**
2. Copy **Token** (string panjang berawalan `...`) → ini nanti diisi ke `settings.fonnte_token`
3. **Jangan share token ini ke siapapun** — siapa punya token = bisa kirim WA atas nama Kakang

---

## 6. Test Kirim Pesan (Optional, tapi disarankan)

Di dashboard Fonnte → menu **Pengujian Kirim**:
- **Target:** paste Group ID tadi (`628xxx@g.us`)
- **Pesan:** `Test Bayt Mustaqbal ✅`
- **Device:** pilih device yang connected
- Klik **Kirim**

Kalau sukses → pesan muncul di grup WA. Kalau gagal → cek error:
- `device not connected` → scan QR code ulang
- `target not found` → Group ID salah / bot belum jadi admin grup
- `quota exceeded` → free tier limit harian (cukup besar untuk kebutuhan keluarga)

---

## 7. Masukkan ke Aplikasi (Nanti, saat Settings sudah jalan)

Saat Fase 0 selesai & app bisa dibuka:
1. Buka app → menu **Settings** (hanya Kakang/admin)
2. Section **Notifikasi (WA)**:
   - **API Token Fonnte:** paste token dari langkah 5
   - **Target Grup WA:** paste Group ID dari langkah 4
   - **Device ID:** `default` (atau Device ID dari langkah 2)
   - **Channel Notifikasi:** `WA` (sudah default)
   - **Jam Digest Harian:** `07:00` (bisa diubah)
3. Klik **Simpan**
4. Klik tombol **Tes Kirim WA** → harus muncul pesan test di grup

---

## 8. Troubleshooting Cepat

| Gejala | Penyebab | Solusi |
|---|---|---|
| Pesan tidak terkirim, log `401 Unauthorized` | Token salah / expired | Copy token ulang dari dashboard Fonnte |
| Pesan tidak terkirim, log `device not connected` | WA logout / HP kehabisan batere | Scan QR code ulang di dashboard Fonnte |
| Pesan tidak terkirim, log `target not found` | Group ID salah / bot bukan admin | Pastikan Group ID benar & nomor Fonnte jadi admin grup |
| Pesan terkirim tapi tidak muncul di grup | Grup dimute / notif off | Cek grup langsung, bukan lewat notifikasi |
| Rate limit (terlalu cepat kirim berturut) | Free tier ~30 detik/req | Script sudah pakai `sleep(1000)` antar kirim; kalau masih kena, kurangi frekuensi trigger |

---

## 9. Catatan Penting

- **Free tier Fonnte:** 1000 pesan/bulan (cukup: digest harian 30 + reminder tagihan ~10 = 40/bulan)
- **Token bersifat rahasia** — simpan di `PropertiesService` Apps Script, **jangan** hardcode di file `.gs`
- **Device WA bisa logout sendiri** (keamanan WA) — cek berkala di Settings app (ada status "Terhubung / Terputus")
- **Grup WA tidak boleh dihapus** — kalau dihapus, Group ID berubah, harus setup ulang

---

## Checklist Siap Pakai

- [ ] Akun Fonnte terdaftar & verifikasi email
- [ ] Device WA connected (scan QR, status hijau)
- [ ] Grup WA keluarga dibuat
- [ ] Nomor Fonnte jadi admin grup
- [ ] Group ID didapat (`628xxx@g.us`)
- [ ] API Token didapat
- [ ] Test kirim dari dashboard Fonnte sukses
- [ ] (Nanti) Masuk ke Settings app → test kirim dari app sukses

---

## Referensi Cepat

| Variabel | Contoh Nilai | Diisi di Mana |
|---|---|---|
| `fonnte_token` | `abc123xyz...` | Settings app / `PropertiesService` |
| `fonnte_target` | `6281234567890@g.us` | Settings app |
| `fonnte_device` | `default` | Settings app (biar default aja) |
| `jam_notifikasi` | `07:00` | Settings app (digest harian) |

---

*Simpan file ini di vault: `04 - Bayt Mustaqbal Project/Setup Fonnte.md`*