# Bayt Mustaqbal - Design System

> Design system ini dihasilkan lewat skill `ui-ux-pro-max` (query: *high-tech navy family finance dashboard*), kemudian disesuaikan dengan kebutuhan keluarga.
> Gaya: **High-Tech Blue** — dark navy + electric cyan, glassmorphism terukur, glow tipis, font mono untuk angka.
>
> **Riwayat:** versi lama = Flat Design teal (`#0D9488`) tanpa shadow/gradasi — **diganti total** pada iterasi tema (keputusan Kakang: *biru nuansa high-tech*).
>
> **Iterasi "kedalaman + gerak"** (keputusan Kakang pada sesi review UI/UX): ditambahkan **skala elevasi** (`e1`/`e2`/`pop`/`nav`), **indikator tab bawah yang menggeser**, **header yang naik elevasi saat digulir**, **token durasi/easing** yang seragam, dan **item daftar masuk berundak** (`cardIn`). Semua CSS-only — tanpa dependensi baru.
>
> **Iterasi "mode terang"** (keputusan Kakang, Q1–Q5): app kini punya **tema gelap (default) & terang** dengan pilihan **Sistem / Terang / Gelap** (localStorage `bm-theme`), tombol ikon di header + bagian "Tampilan" di modal *Akun saya*, dan skrip boot anti-kedip di `index.html`. Palet terang = keluarga cyan yang sama (bukan tema lain), tiap warna diperiksa kontras WCAG terukur (§2). Mode gelap dipertahankan **persis** seperti sebelumnya (no-op visual). Semua CSS/token — tanpa dependensi baru.

## 1. Visual Identity

### Brand Personality
- **Tagline** (teks di bawah logo pada layar gerbang): *"Mari jelajahi masa depan yang berakar pada nilai iman, berdaya dengan teknologi, dan hangat bersama keluarga."* — tiga pilar app: iman, teknologi, keluarga
- **High-Tech & Terpercaya**: navy gelap seperti panel instrumen, aksen cyan listrik yang "hidup" hanya di atas latar gelap
- **Menggunakan efek dengan disiplin**: kaca (glassmorphism) hanya di elemen kunci; glow tipis hanya saat hover/fokus; grid teknis hanya di belakang gerbang & chart
- **Family-Oriented**: target sentuh ≥ 44px, bahasa sederhana, kontras teks ≥ 4.5:1 tetap dijaga

### Logo & Icon System
- App mark: **logo Kakang** (`assets/logo.png`) — mark transparan `public/brand/logo.png`; di header = tile `bg-brandtint` 36px, di layar gerbang = **logo besar** sebagai gambar utama (max 200–240px, `object-contain`) — tanpa judul teks terpisah (nama app dibawa `alt` logo)
- Ikon PWA: logo di atas **latar navy `#0A192F`** (artwork mayoritas terang → butuh latar gelap; navy juga = tema app) — lihat §8
- Ikon UI: **SVG inline** (gaya Lucide, stroke 24×24, stroke-width 1.75) — lihat `components/Icon.jsx`
- Ikon di dalam UI: tile `bg-brandtint` + ikon `text-brandfg` (bukan kotak solid terang)
- Ikon nav Dashboard tetap `home` (SVG) — mark merek sudah diwakili logo
- ❌ Tidak pakai emoji sebagai ikon; ❌ tidak pakai font ikon

## 2. Color System

Token dipakai sebagai Tailwind theme extension (lihat `tailwind.config.js`) dan CSS variable (lihat `App.css`).

### Mekanisme dua tema (PENTING)

- **Nilai warna HANYA ada di `App.css`**, ditulis sebagai **kanal RGB tanpa koma** (`--brand: 34 211 238`), bukan hex. Ini supaya pengubah opasitas Tailwind tetap bekerja: `border-brand/20` → `rgb(var(--brand) / 0.2)`.
- Tema gelap di `:root` (default), tema terang di `[data-theme='light']`. `color-scheme` ikut berganti (`dark`/`light`) supaya kontrol bawaan browser (scrollbar, date picker) serasi.
- Di CSS biasa setiap variabel **wajib** dibungkus `rgb(...)`: `background: rgb(var(--canvas))`. Tanpa itu latar/scrollbar/fokus rusak.
- `tailwind.config.js` hanya memetakan token → `rgb(var(--x) / <alpha-value>)`; jangan menulis warna langsung di sana.
- **Pengecualian:** `brandtint` sengaja `rgb(var(--brand) / 0.14)` (tanpa `<alpha-value>`) sehingga `bg-brandtint` selalu tint 14%; pengubah seperti `bg-brandtint/40` tetap bekerja karena Tailwind mengganti angka alfa di dalam nilainya.
- **Jangan pakai warna mentah** (`bg-white`, `text-slate-500`, `bg-[#fff]`) di komponen — pakai token (`surface`, `mutedfg`, ...) agar tidak pecah di salah satu tema.
- **Nilai bergantung tema** (pendaran, grid, kaca, bayangan, alur donut) juga variabel: `--app-glow-1/2/3`, `--app-vig`, `--grid-line`, `--grain-op`, `--grain-mix`, `--glass-bg/-border`, `--shadow-*`, `--donut-track`.
- **Warna chart/ikon SVG lewat `style`, bukan atribut** — atribut presentasi SVG tidak menyelesaikan `var()`: pakai `style={{ stroke: 'rgb(var(--chart1))' }}`.
- **Satu kelas latar per keadaan.** Jangan menumpuk "latar dasar + tambahan" (`bg-surface bg-cta/25`): urutan aturan Tailwind yang menang adalah alfabetis (`brandtint` → `cta` → `surface`), jadi `bg-surface` akan selalu menang dan sorotan tidak pernah terlihat. Pakai salah-satu (ternary), lihat `Calendar.jsx` (hari ini/terpilih).
- **Titik masuk tema:** `App.jsx` (state `theme`/`resolvedTheme`, localStorage `bm-theme`, dengar `matchMedia`, `toggleTheme`) + skrip boot sinkron di `index.html` (mencegah kedip putih sebelum React jalan) + `AccountModal.jsx` (pilihan lengkap).
- **Batas jujur:** `public/manifest.json` hanya punya satu `background_color`/`theme_color` (navy `#0A192F`) dan ikon PWA berlatar navy → **splash & ikon tetap navy** di tema apa pun. Yang dinamis hanya `<meta name="theme-color">` dan warna status bar iOS (keduanya diperbarui saat tema berganti).
- **Pengecualian warna mentah (disengaja):** `index.html` (di luar jangkauan token React) memakai hex tetap untuk tiga hal yang **memang harus identik di kedua tema**: latar anti-kedip (`html { background-color: #0A192F }` + `html[data-theme='light'] { #F2FAFD }` — kembar token), gradient CTA popup "Pasang app" (`#1D4ED8 → #2563EB` = token cta/ctahover), dan toast status jaringan (`#155E75`/`#BE123C` + teks putih, kontras ≥5:1 di kedua tema). Kalau token berubah, tiga tempat ini harus ikut diperiksa.

### Primary Palette (dark — default)

```
Brand            (#22D3EE) - Aksen cyan listrik: garis chart, titik status, glow, indikator tab
Brand FG         (#7DD3FC) - Teks/ikon aksen di atas tint & surface (kontras ≥ 8:1)
Brand Tint       (rgba 34 211 238 / 0.14) - Latar aktif nav, tile ikon, badge
CTA              (#2563EB) - Tombol utama (teks putih, kontras 5.2:1) + hover #1D4ED8
Accent Warm      (#F59E0B) - Sorotan hangat (peringatan, ikon aksi amber)
Success          (#22C55E) - Nilai positif / tersimpan
Danger           (#F43F5E) - Error / offline
```

### Secondary Palette (dark — default)

```
Canvas           (#0A192F) - Latar halaman (deep navy)
Surface          (#0F1E38) - Kartu & panel
Muted            (#16283F) - Latar hover / elevated
Ink              (#E8F1FF) - Teks utama (kontras 15:1 di atas canvas)
Muted FG         (#93A7C4) - Teks sekunder (kontras 6.5:1 di atas surface)
Line             (#1E3A5F) - Border & pemisah
```

### Palette (terang — keluarga cyan yang sama, versi lebih dalam)

Semua angka = rasio kontras **terukur** dari warna render nyata (bukan perkiraan).

```
Canvas           (#F2FAFD) - Latar halaman
Surface          (#FFFFFF) - Kartu & panel
Muted            (#E8F2F7) - Latar hover / elevated
Line             (#C9DEE9) - Border & pemisah (dekoratif: 1,4:1 di surface — sama seperti gelap)
Ink              (#10394A) - Teks utama (11,6:1 di canvas · 12,3:1 di surface)
Muted FG         (#4A6377) - Teks sekunder (5,9:1 di canvas · 6,3:1 di surface)
Brand            (#0E7490) - Aksen (5,1:1 sebagai teks · 5,4:1 ikon di surface)
Brand FG         (#0A6072) - Teks di atas tint aksen (5,6:1)
Brand Tint       (rgba 14 116 144 / 0.14)
CTA              (#2563EB) - cobalt tetap sama; teks putih 5,2:1
Accent Warm      (#B45309) - 4,8:1
Success          (#15803D) - 5,0:1
Danger           (#BE123C) - 6,3:1
```

**Nada badge/tile (teks di atas tint 15%):** cyan `#0891B2`/fg `#0B657E` · blue `#2563EB`/`#1D4ED8` · violet `#7C3AED`/`#6D28D9` · emerald `#059669`/`#065F46` · amber `#D97706`/`#92400E` · rose `#E11D48`/`#BE123C` — rasio terendah 4,95:1 (rose), aman ≥4,5:1.

**Warna anggota (titik di kalender) terang:** `#0891B2` · `#7C3AED` · `#059669` · `#D97706` · `#0284C7` — semua ≥3:1 terhadap permukaan (indikator non-teks).

### Chart Series

```
Gelap : chart1 #22D3EE (cyan) · chart2 #3B82F6 (cobalt) · chart3 #8B5CF6 (violet) · chart4 #F59E0B (amber) · chart5 #10B981 (emerald)
Terang: chart1 #0891B2        · chart2 #2563EB         · chart3 #7C3AED         · chart4 #B45309        · chart5 #059669
```

### Usage Guidelines
- **CTA (cobalt)**: tombol utama + teks putih → kontras 5.2:1 (sama di kedua tema); gradasi tipis `#1D4ED8 → #2563EB` aman di kedua ujungnya
- **Brand**: ikon dekoratif, titik status, garis, indikator aktif — jangan untuk teks kecil di atas warna brand mentah
- **Brand FG**: teks/ikon aksen di atas tint atau surface (gelap ≥ 8:1 · terang ≥ 5,6:1)
- **Teks putih di atas cobalt CTA**: aman 5.2:1 (tombol "Masuk", "Pasang", "Lihat Keuangan")
- **Glow**: hanya di gelap yang terasa "neon"; di terang glow diganti pendaran tipis cyan + bayangan abu-teal (§5) supaya tidak jadi bercak. Hanya untuk elemen yang perlu menonjol (fokus, tab/ikon aktif, bilah indikator); jangan ditumpuk
- **Elevasi** (lihat §5): gelap = bayangan navy + garis cahaya putih; terang = `rgba(16 57 74, ...)` + inset putih kuat. `e1` kartu diam, `e2` kartu hover, `pop` panel melayang (dropdown/sheet/toast/hero), `nav` bilah bawah
- **Nada badge/tile** memakai token (`bg-tonecyan/15 text-tonecyanfg`) sehingga varian `hover:`/`focus:` tetap bekerja dan warnanya ikut tema
- **Uji kontras terukur (terang)**: 27/27 pasangan teks lolos (terendah 4,95:1), 5/5 titik anggota lolos ≥3:1; garis pemisah `line` 1,4:1 — memang dekoratif, sama seperti gelap (1,45:1)

## 3. Typography System

### Font Hierarchy
```
Teks  : 'Plus Jakarta Sans', system-ui, sans-serif   (300–800)
Angka : 'Fira Code', ui-monospace, monospace          (400–700)
```
- **Fira Code khusus angka/KPI/label chart**: nilai uang, persentase, tanggal → kesan panel instrumen
- `font-variant-numeric: tabular-nums` agar angka tidak berubah lebar saat berubah
- Letter-spacing: `-0.025em` (tracking-tight) untuk judul; normal untuk body
- Line-height: 1.5 body, 1.1–1.2 judul

### Type Scale (aktual di app)
```
H1 (sapaan dashboard): 20px → 24px (sm)  — font-extrabold
H2 (judul panel):       16px              — font-bold
Body:                   16px
Small:                  14px (text-sm) · Caption: 12px (text-xs) · Nav mobile: 11px
Angka besar (KPI):      16px → 24px (sm)  — font-mono bold
```

## 4. Layout System

### Grid Foundation
```
Container : max-w-6xl (1152px), padding px-4 → sm:px-6
Grid      : CSS Grid (grid-cols-*) — bukan grid 12 kolom kaku
Breakpoint: sm 640px · md 768px · lg 1024px (default Tailwind)
Nav       : header sticky (semua lebar) + bottom tab bar 56px (di bawah lg)
Safe area : env(safe-area-inset-top) pada header, env(safe-area-inset-bottom) pada bottom nav + padding bawah <main>
```

### Latar aplikasi — "blueprint teknik" (D18)

Latar **bukan** kanvas datar; ia berlapis dan jadi dasar yang membuat kartu kaca (glassmorphism) punya kedalaman. Semua dipasang sebagai pseudo-elemen `.app-bg` (tanpa elemen DOM tambahan, tanpa berkas gambar):

```
.app-bg              hanya background-color + isolation: isolate
.app-bg::before      fixed · inset 0 · z-index -1 · pointer-events none
                     6 lapis background-image (urut atas→bawah):
                       1. vignette        radial 125% 85% at 50% 38% → --app-vig
                       2. pendaran kiri-atas   → --app-glow-1
                       3. pendaran kanan-atas  → --app-glow-2
                       4. pendaran bawah        → --app-glow-3
                       5+6. grid teknik 28px (pola sama dengan .grid-lines)
.app-bg::after       fixed · inset 0 · z-index -1 · pointer-events none
                     grain SVG feTurbulence inline (±300 byte) ·
                     opacity --grain-op · mix-blend-mode --grain-mix
```

- **`isolation: isolate` pada `.app-bg` wajib** — tanpanya `z-index: -1` jatuh di belakang warna kanvas dan seluruh lapisan tak terlihat. Terbukti tidak mengubah tata letak & tidak memutus `backdrop-filter`.
- **`position: fixed`** membuat pendaran/grid "diam" saat digulir (perilaku setara `background-attachment: fixed` versi lama) tanpa repaint berulang.
- **Intensitas = satu angka per efek:** `--grid-line` (grid), `--app-glow-1/2/3` (pendaran), `--app-vig` (vignette), `--grain-op` (grain). Nilai tema terang sengaja jauh lebih tipis; `--grain-mix` = `overlay` (gelap) / `multiply` (terang).
- **Statis — tanpa animasi.** Tidak ada biaya gerak/baterai (penting untuk PWA di HP).
- Grid yang sama masih dipakai ulang secara lokal di belakang chart & layar gerbang (`.grid-lines`).

### Layout Patterns (aktual)
- **Dashboard**: sapaan → kartu hero glass (keuangan bulan ini + realisasi anggaran) → aksi cepat 4 tile → KPI 2→4 kolom (`lg`) → tren (line, full width) → bar+donat (1→2 kolom `lg`) → 2 panel daftar terbaru
- **Layar gerbang**: kartu sentral max-w-md, konten vertikal: identitas → **logo besar** (mark merek, tanpa ilustrasi terpisah) → pilih pengguna → tombol masuk
- **Daftar kartu** (agenda/keuangan/keluarga/tugas): grid 1 → 2 (`md`) → 3/4 kolom (`lg`)
- **Form / isi konten**: satu kolom, label di atas input

### Spacing Scale (yang dipakai)
```
Kartu   : p-3.5 / p-4 / sm:p-5 / md:p-6
Section : space-y-5 (HP) → space-y-6 (sm)
Grid gap: gap-3 (HP) → gap-4 (sm) → gap-6 (lg)
Padding bawah konten: pb-[calc(4.5rem_+_env(safe-area-inset-bottom))]
```

## 5. Component Library

### Core Components

#### Button System
- **CTA / Primary**: gradasi cobalt `#1D4ED8 → #2563EB`, teks putih, min-h 44px, `rounded-xl`, `shadow-glow` lembut — konstanta `CTA_CLASS` di `components/ui.jsx` (dipakai ulang: gerbang, header, hero)
- **Ghost / Secondary**: tanpa latar, teks `mutedfg`, hover `bg-muted`
- **Outline**: border `line`, teks `brandfg`, min-h 44px
- **Aksi kecil (panel)**: "Semua" → `grid h-11 place-items-center` (tetap ≥ 44px)
- **Transisi**: 150–200ms (`transition-colors`/`transition-transform`), `active:scale-[0.99]` pada CTA

#### Card Components
```
Elevasi   : skala `boxShadow` di tailwind.config.js — bayangan navy-tinted (bukan hitam):
              e1  = kartu diam            (inset highlight 1px putih 5% + bayangan 1px)
              e2  = kartu hover/terangkat (inset 7% + bayangan 6/14px)
              pop = panel melayang        (halo cyan tipis + bayangan navy 16/34px)
              nav = bilah bawah           (bayangan ke atas 6/20px)
Base Card : rounded-2xl, bg-surface, border 1px line, `shadow-e1`
            — TANPA backdrop-blur (kartu banyak → hemat performa)
Glass Card: .glass — gradient putih 6%→2%, border cyan 16%, backdrop blur 14px,
            `shadow-pop`; hanya untuk: hero dashboard, layar gerbang, header, tab bar.
            Fallback solid via @supports (HP tanpa backdrop-filter).
Hover     : konstanta `CARD_INTERACTIVE` (ui.jsx) — kartu data naik 2px (`-translate-y-0.5`)
            + elevasi e1→e2 + border → brand; `transform` tidak menggeser layout (aman di grid);
            dipakai kartu agenda/pengeluaran/tugas/catatan/keluarga + QuickAction
Status    : Badge bertinta translucent (cyan/emerald/amber/rose/gray) + teks
```

#### Navigation System
- **Bar atas (sticky)**: glass `bg-canvas/80 backdrop-blur-xl`; **naik elevasi saat digulir** (`window.scrollY > 6` → `border-line bg-canvas/90 shadow-e2`, transisi 200ms; saat di puncak border transparan); logo tile tint; **tombol tema** (ikon matahari/bulan/monitor, 44px, label aksesibel "Ganti ke mode gelap/terang" — ganti tema langsung + simpan); **lonceng notifikasi**; chip pengguna (**buka modal "Akun saya"**, avatar foto/inisial + nama); nav desktop pill di `lg`. Urutan klaster kanan: **tema → lonceng → chip pengguna** (tombol "Pasang" dihapus — lihat D19)
- **Notifikasi (lonceng)**: tombol bulat 44px di klaster kanan header; badge angka = jumlah belum dibaca (maks tampil "9+", gradasi cobalt + `shadow-glow`). Panel menempel di bawah header **rata kanan konten** (`right-4 sm:right-6`; `w-80`, dibatasi `max-w-[calc(100vw_-_2rem)]` di layar sempit — di 320px jadi 288px, tepi kiri tetap 16px dari layar). Isinya **turunan data** (`components/notifications.js`), bukan pesan statis
- **Bottom Tab Bar (< `lg`)**: glass + `shadow-nav` (bayangan halus ke atas, memisahkan bilah dari konten yang lewat di bawahnya), tinggi **tetap 56px** (`h-[56px]`), 5 tab, label 11px; tab aktif = teks `brandfg` + pill tint; **indikator cyan = satu elemen yang menggeser** di tepi atas (lebar = 1/5 slot, `translateX(activeIndex × 100%)`, transisi 320ms `ease-smooth`) — posisi dihitung dari tab aktif/section (dropdown yang terbuka ikut dihitung aktif); isi `max-w-md`
- **Aktif**: `aria-current="page"` + cyan, bukan warna saja
- **Popup "Pasang app" (D19)**: kartu kecil `max-w-sm` (`max-w-md` di `sm`+), kartu bertumpuk di bawah 640px & satu baris di atasnya; di atas tab bar di ponsel (`bottom-[calc(3.5rem_+_env(safe-area-inset-bottom)_+_0.75rem)]`), pojok kanan bawah di `lg` (`lg:right-6 lg:bottom-6`); `z-[60]`; tampil 5 detik lalu hilang sendiri (muncul lagi tiap app dibuka)

### Dashboard-Specific
```
Hero (GlassCard) : label + nilai mono besar + tombol mata (sembunyikan/tampilkan jumlah uang —
                   default tersembunyi, "Rp ••••••") + badge delta naik/turun + ProgressBar
                   realisasi anggaran + CTA; latar grid-lines halus + glow
                   (nilai uang di kartu ini: pengeluaran, "Sisa dari", dan "Sisa" — ikut tersembunyi)
                   **CAKUPAN (keputusan Kakang, 13 Okt 2026): HANYA kartu hero ini.**
                   Nilai uang di luar hero — KPI "Sisa anggaran" (+ hint "dari …"),
                   ringkasan "rata-rata" tren, label chart/tooltip, dan nominal di
                   panel "Pengeluaran Terbaru" — sengaja DIBIARKAN tampil. Terukur:
                   22 simpul teks ber-"Rp" di #main, hanya 3 yang berubah saat tombol ditekan.
QuickAction      : tile 4-kolom, min-h 76px, ikon tile 40px ber-warna (Pengeluaran=cyan,
                   Agenda=blue, Catatan=violet, Keluarga=emerald) — lihat D19
StatCard (KPI)   : ikon tile ber-warna + nilai mono + label + hint opsional (+ sparkline sm+)
Chart            : BarChart (div), DonutChart & LineChart (SVG) — lihat components/charts.jsx
                   SEMUA label di HTML (bukan di SVG) agar tajam di semua lebar;
                   aria-label + <figcaption class="sr-only"> = ringkasan lengkap semua nilai
                   Batang & garis = bisa diketuk/klik: SELURUH area grafik jadi satu sasaran
                   sentuh (320px: 245×160px — jauh di atas 44px; tombol per batang cuma
                   ~28px jadi TIDAK dipakai). Ketuk = pilih, ketuk lagi = lepas
                   (kembali ke default: batang tertinggi / titik terakhir), panah kiri-kanan
                   + Home/End/Escape untuk keyboard, nilai dibacakan lewat `aria-live`.
                   Donat: nilai total sudah tampil di tengah + tiap irisan punya nilai & % di legenda.
```

### Family-Specific Components
```
FamilyMemberCard : kartu profil anggota — avatar `bg-brandtint border brand/25` + inisial `brandfg`,
                   nama + peran + badge status, lalu **daftar data diri** (Lahir + umur ·
                   Gol. darah · Alergi · WA) sebagai `<dl>` `text-xs` yang bertumpuk
                   kanan-kiri (`justify-between`, nilai `truncate`); 1 kolom di HP,
                   berjejer dari `sm`+ (kartu memuat detail → butuh lebar)
ScheduleItem     : tile ikon kategori + badge anggota; footer: anggota + tanggal +
                   `ItemActions` (Ubah/Hapus)
ExpenseCard      : tile ikon kategori + nominal `brandfg` mono; judul = label kategori;
                   footer: tanggal + `ItemActions`
FamilyList       : baris kartu sub-bagian (judul + meta + badge opsional); header mini berikon + jumlah;
                   kosong = placeholder garis putus-putus "Belum ada catatan"
TaskList         : checkbox visual 28px dengan area sentuh 44px;
                   selesai = border-cta bg-cta text-white (ikon check);
                   footer: penanggung jawab + jatuh tempo + `ItemActions`;
                   controlled — toggle diteruskan ke App lalu disimpan (localStorage)
NoteList         : kartu catatan (grid 1/2/3 kolom): tile ikon kategori, judul, isi
                   dibatasi 3 baris (`.clamp-3`), badge kategori; pin amber bila "penting";
                   footer: kategori + penulis/tanggal (font-mono) + `ItemActions`
ItemActions      : sepasang tombol ikon 44px (Ubah `edit`, Hapus `trash`) di footer kartu
                   agenda/pengeluaran/tugas/catatan; hapus = `hover:bg-rose-500/15`,
                   `aria-label` menyebut judul item; pola seragam lintas 4 tab data
Toast            : notifikasi melayang tepat di atas tab bar
                   (`bottom-[calc(4.5rem+env(safe-area-inset-bottom))]`, `lg:bottom-6`, z-60);
                   role="status" + aria-live="polite"; `min-h-[52px]`, `max-w-md`,
                   glass (`bg-surface/95 backdrop-blur-xl`); aksi opsional "Urungkan"
                   (ikon `undo`, 44px) + tombol tutup ×; auto-tutup 2,5s (konfirmasi)
                   atau 6s (undo)
FormSheet        : bottom sheet "Tambah/Ubah" generik (fixed inset-x-0 bottom-0, max-w-lg center,
                   rounded-t-3xl, glass); field 48px (teks/angka/tanggal/jam/select/textarea),
                   baris centang 48px (checkbox "Tandai penting"),
                   bintang wajib, error "Wajib diisi" + aria-invalid; footer Batal + Simpan (CTA);
                   mode ubah = `initialValues` terisi + judul "Ubah …" + tombol "Perbarui"
AccountModal     : modal akun **di tengah layar** (grid place-items-center, panel max-w-md,
                   rounded-3xl, glass, `max-h-[calc(100dvh-2rem)]` + scroll internal);
                   isi: blok foto profil (avatar 64px + "Pilih/Ganti foto" + "Hapus foto"),
                   Nama, Username, Password (+ "Ulangi password" yang muncul saat diisi,
                   tombol lihat/sembunyikan, tombol "Hapus password"), catatan purwarupa,
                   footer Batal + Simpan (CTA) + pintasan "Ganti pengguna";
                   dibuka dari chip pengguna (fokus kembali ke chip saat ditutup)
Avatar           : komponen bersama (ui.jsx) — foto (`object-cover`, dari data URL 256px)
                   atau inisial dari nama (`initialsOf`); dipakai chip header, kartu gerbang,
                   dan modal akun dengan ukuran/radius berbeda lewat `className`
```

## 6. Screen Hierarchy & Information Architecture

### Primary Screens (5 section, in-file switch, tanpa router)
1. **Dashboard**: sapaan, hero keuangan, aksi cepat, KPI, tren 6 bulan, komposisi, daftar terbaru. **Tombol mata** jumlah uang = **hanya memengaruhi kartu hero** (keputusan Kakang); nilai di KPI/chart/daftar tetap tampil
2. **Agenda**: dropdown kategori di tab Agenda (Semua/Keluarga/Anak/Ibadah/Kesehatan/Rumah Tangga/Kendaraan, badge jumlah) — **satu-satunya filter kategori** (deretan chip filter di dalam section dihapus; nama filter aktif sudah tampil sebagai judul `SectionHeader`, jumlah di sub-judul); sub-tampilan **Jadwal | Tugas | Kalender | Timeline** (default Jadwal) — **Jadwal** = grid `ScheduleItem`; **Tugas** = chip filter status/prioritas (Semua Tugas/Belum Selesai/Sudah Selesai/Prioritas Tinggi/Sedang/Rendah) + `TaskList` (toggle selesai + badge prioritas); **Kalender** = kalender gabungan anggota (`Calendar.jsx`): view **Minggu/Bulan/Tahun** (default Bulan), **warna per member + legenda** (Rezki YT cyan, Hilda AK violet, RAGASUCI emerald, RAJABRANA amber, Keluarga sky), dot member di sel + bar bawah = ada tugas jatuh tempo, klik tanggal → daftar agenda hari itu, nav prev/next + "Hari Ini", filter kategori ikut memfilter kalender; **Timeline** = alur kronologis gabungan 4 modul (`Timeline.jsx`): rel vertikal + titik per hari + cabang ke tiap baris, kelompok **hari ini ke depan** lalu blok **Riwayat**, chip filter jenis (Semua/Agenda/Tugas/Keuangan/Catatan)
3. **Keuangan**: dropdown kategori di tab Keuangan (Semua/Belanja/Utilitas/Pendidikan/Transportasi/Kesehatan/Ibadah) — satu-satunya filter; grid `ExpenseCard` berikon kategori + total terfilter di header
4. **Keluarga** (**papan profil anggota** — D17): dropdown bagian di tab Keluarga (Semua/Anggota/**Info Medis**/**Kontak & Darurat**/**Dokumen Penting**, badge jumlah) — satu-satunya filter; "Semua Keluarga" = semua bagian bertumpuk. **Anggota** = grid `FamilyMemberCard` berisi data diri (avatar inisial, nama, peran, umur dari tanggal lahir, golongan darah, alergi, WA) — **1 kolom di HP** (kartu memuat detail, butuh lebar), `sm`+ berjejer; sisanya `FamilyList`. Kesehatan→Informasi medis ringkas (dokter/asuransi/obat, **statis**), Pendidikan Anak→dihapus dari modul ini (jadwal & biaya milik Agenda/Keuangan)
5. **Catatan**: dropdown filter di tab Catatan (Semua Catatan/Penting/Daftar Belanja/Rumah & Alat/Dapur & Resep/Ide & Info, badge jumlah) — satu-satunya filter kategori; **kotak cari** (judul + isi, `type="search"`, tombol bersihkan) + grid `NoteList` (kartu catatan + badge kategori + pin "penting" + `ItemActions`)

> **Kenapa deretan chip filter kategori dihapus** (keputusan Kakang, sesi review UI): chip di dalam section (Agenda/Keuangan/Keluarga/Catatan) menampilkan **isi, jumlah, dan state yang sama persis** dengan dropdown kategori di tab — dua UI untuk satu pekerjaan. Nama filter aktif sudah terbaca di `SectionHeader` (judul = nama kategori, sub-judul = "N dari M …"), dan tab yang punya dropdown sudah bertanda **chevron** + `aria-haspopup="menu"`, jadi tidak ada informasi yang hilang. Yang **tetap ada** (tidak punya padanan di dropdown): chip sub-tampilan **Jadwal | Tugas | Kalender | Timeline**, chip filter status/prioritas **Tugas**, chip jenis **Timeline**, chip skala kalender **Minggu/Bulan/Tahun**, dan **kotak cari Catatan**.

### Screens Khusus
- **Layar Gerbang (WelcomeGate)**: muncul **setiap app dibuka** (keputusan Kakang) — pilih pengguna (Kakang/Istri, tersimpan `localStorage`) sebagai kartu (avatar foto bila ada, nama, `@username` bila diisi — kalau belum, peran) + tombol **"Muat ulang data contoh"** (hapus snapshot → kembali `mockData`) → nanti menjadi layar login saat backend siap
- **Bottom sheet "Tambah/Ubah" (FormSheet)**: dibuka dari tombol `SectionHeader` "Tambah" (mode tambah) atau `ItemActions` "Ubah" di kartu item (mode ubah, `initialValues` terisi, judul "Ubah …", tombol "Perbarui") di Agenda (Jadwal & Tugas)/Keuangan/Keluarga/Catatan; `role="dialog"` + `aria-modal`, label terhubung `htmlFor/id`, fokus otomatis ke field pertama, tutup via tombol ×/Batal/klik backdrop/Escape, scroll body dikunci selama terbuka
- **Panel Notifikasi (lonceng header)**: dibuka dari tombol lonceng; isinya **dihitung dari data** (`components/notifications.js`) — anggaran (≥ 80% "hampir habis", ≥ 100% "terlewati"), tugas (mendekati tenggat ≤ 3 hari, atau melewati tenggat; kalau tidak ada → ringkasan "belum selesai"), agenda terdekat (≤ 2 pekan; judul "hari ini"/"besok"/"terdekat"), pengeluaran terbesar (bila ≥ 20% anggaran). Urut dari yang paling perlu ditindak (anggaran → tugas → agenda → pengeluaran); maksimum 4–5 item, **bukan** tumpukan pesan
  - **Ketuk item** = lompat ke section terkait + filter ikut disetel (mis. notifikasi tugas → Agenda › Tugas, filter "Belum Selesai"); notifikasi ikut ditandai terbaca
  - **Tandai semua dibaca** = tombol 44px di kaki panel (muncul hanya kalau masih ada yang belum dibaca); status baca tersimpan di `localStorage` dengan kunci **terpisah** dari snapshot data (`bayt-mustaqbal-notif-read-v1`) karena ini keadaan tampilan, bukan data keluarga
  - **Id notifikasi diikat ke keadaan** (bulan / tanggal / id item) → kalau keadaan berubah (bulan baru, tenggat bergeser, agenda terdekat berganti), lonceng menyala lagi secara wajar; id yang notifikasinya sudah tidak ada dibuang saat menyimpan agar daftar tidak menumpuk
  - Hanya satu panel terbuka pada satu waktu (`openKey` yang sama dengan dropdown kategori) — membuka menu kategori otomatis menutup panel notifikasi, dan sebaliknya
- **Modal "Akun saya" (AccountModal)**: dibuka dari **chip pengguna** di header; berisi foto profil (pilih/ganti/hapus, dikecilkan otomatis ke 256px), Nama, Username, Password (kolom profil — **belum diverifikasi siapa pun**, dinyatakan terang di dalam modal), **bagian Tampilan** (pilihan radio Sistem / Terang / Gelap — langsung berlaku & tersimpan, di bawah kolom Password), plus pintasan "Ganti pengguna" (kembali ke gerbang). Simpan → nama/username/avatar/password masuk snapshot data (`bayt-mustaqbal-data-v1`), inisial dihitung ulang dari nama, toast "Profil akun diperbarui"; fokus kembali ke chip saat ditutup

## 7. Touch Targets & Interaction Patterns

- **Minimum**: 44×44 px semua elemen interaktif; QuickAction 76px; tab bar 56px
- **Spacing**: 12px antar target (`gap-3`); area sentuh boleh lebih besar dari visual (checkbox 28px + `-m-2 h-11 w-11`)
- **Thumb zone**: aksi utama di bottom tab bar
- **Dropdown kategori (Agenda, Keuangan, Keluarga & Catatan)** (nav HP + desktop): buka = slide-up + fade 300ms `cubic-bezier(0.22,1,0.36,1)`, item berundak 30ms (`--i`), tutup = exit cepat 150ms; trigger `aria-expanded`/`aria-controls`/`aria-haspopup`, item `role="menuitemradio"` + `aria-checked`, tutup via Escape/klik luar, fokus item pertama di desktop; hanya satu dropdown terbuka pada satu waktu; `prefers-reduced-motion` → muncul langsung tanpa animasi
- **Chip filter** (sisa: **filter tugas** di sub-tampilan Tugas Agenda, chip jenis Timeline, sub-toggle Jadwal/Tugas/Kalender/Timeline): `aria-pressed`, `flex-wrap` (tidak boleh terpotong satu baris), badge jumlah `font-mono`, aktif `bg-brandtint text-brandfg`; filter tugas = status (semua/belum/selesai) + prioritas (high/medium/low — `id` = nilai `priority` di data). **Deretan chip kategori di section Agenda (jadwal), Keuangan, Keluarga & Catatan dihapus** — hanya menduplikasi dropdown kategori di tab (lihat §6)
- **Sub-toggle Agenda (Jadwal | Tugas | Kalender | Timeline)**: di HP `grid grid-cols-4` selebar penuh dengan ikon di atas label (teks 11px) → muat di 320px (terukur: 4 sel × 64,2px, label terlebar "Timeline" tanpa terpotong/bungkus); beralih ke `inline-flex` satu baris (`sm:text-sm sm:px-4`) di `sm+` (terukur 446px di 1000px, satu baris)
- **Timeline keluarga** (mode Timeline di tab Agenda): `<ol>` + `<li>` per hari dengan **rel** = `border-l` tiap `<li>` (`last:border-transparent` → garis berhenti di simpul terakhir, tanpa menyambung keluar); simpul hari = titik `h-3.5 w-3.5 rounded-full` `border-2 border-line bg-canvas` (bg canvas **menutupi** garis rel supaya terbaca sebagai titik), hari ini = `border-brand bg-brand ring-4 ring-brand/15`; **cabang** penghubung ke tiap baris = `<span>` dekoratif `-left-6 w-6 h-px bg-line` (ujung cabang tepat di tepi baris — terukur 48,8 = 48,8); offset titik `-left-[7.5px]` (14px) & `-left-[11px]` (21px) dikoreksi karena `left` diukur dari *padding box* (setelah border 1px) → pusat titik ≈ pusat rel (selisih terukur 0,2px); rel/titik/cabang `aria-hidden` — informasi tetap teks; baris = `<button>` utuh (tinggi 58–94px, `type="button"`, tanpa `outline-none`) → dapat ring `:focus-visible` global + Enter/Space; kepala hari `<h2>` (tanggal panjang id-ID) + `Badge` "Hari Ini"/"Besok"/"Kemarin" + jumlah item `font-mono`
- **Kalender keluarga** (mode Kalender di tab Agenda): sel hari = button `aria-pressed` + `aria-label` deskriptif (tanggal + judul item + anggota + "ada tugas"); grid `role="grid"` + baris `role="row"` + header kolom `role="columnheader"`; tombol skala view (Minggu/Bulan/Tahun) `aria-pressed`; nav prev/next `aria-label` "Periode sebelumnya/berikutnya"; warna member hanya pelengkap — nama anggota selalu tampil (dot + teks, bukan warna saja); grid full-bleed `-mx-4 md:-mx-0` di layar kecil supaya sel ≥ 44px (320px → 7×44 + 6 garis = 314 ≤ 320)
- **Verifikasi**: diuji 320/360/390/414/768 px × 5 section + gerbang + dropdown terbuka + bottom sheet Tambah (390/768/1280 px) → **0 overflow, 0 elemen < 44px** (termasuk sel kalender di 320px); kartu ber-`ItemActions` dijaga lewat `min-w-0` + `truncate` (footer kartu: meta kiri boleh menyusut, aksi `shrink-0` ~90px)
- **Feedback**: hover = border menyala + kartu data terangkat 2px + elevasi naik (e1→e2); CTA `active:scale-[0.98]` (120ms); `prefers-reduced-motion` mematikan animasi
- **Ubah/Hapus item**: `ItemActions` di footer tiap kartu data (agenda/pengeluaran/tugas/catatan) — dua tombol ikon 44px. **Hapus tanpa dialog**: item langsung dibuang + `Toast` "«judul» dihapus" dengan tombol **"Urungkan"** (6s) yang memulihkan item ke posisi semula; jaring aman pengganti dialog konfirmasi (satu langkah, tetap aman)
- **Toast**: konfirmasi tambah/ubah (2,5s) & undo hapus (6s) tampil di atas tab bar; `role="status"` `aria-live="polite"` → pembaca layar mengumumkan; ada tombol tutup manual
- **Kotak cari catatan**: `type="search"` 48px, ikon kaca di kiri, tombol bersihkan 44px di kanan; kosong tanpa hasil → `EmptyState` berbeda ("Catatan tidak ditemukan") + kutip kata kunci
- **Bottom sheet Tambah/Ubah** (FormSheet): backdrop fade 250ms + panel naik 300ms `cubic-bezier(0.22,1,0.36,1)`; field 48px, tombol Batal/Simpan 48px (≥44px); `prefers-reduced-motion` → tampil langsung
- **Modal Akun** (AccountModal): backdrop fade 250ms + panel membesar tipis dari tengah 260ms (`modalPanelIn`: opacity + `translateY(8px) scale(0.97)`); semua kontrol modal: field 48px, tombol Batal/Simpan 48px, blok foto & tombol foto 44px, tombol lihat password 44×44, tombol × 44×44; panel `max-h-[calc(100dvh-2rem)]` + scroll internal (di 320×640 isi 779px → panel scroll, bukan halaman); tombol "Pilih foto" menargetkan input file `sr-only` (1×1, `tabIndex=-1`) yang tidak masuk urutan Tab

## 8. PWA-Specific Implementation

### App Manifest (`public/manifest.json` — sumber kebenaran)
```
name / short_name : Bayt Mustaqbal — Manajemen Keluarga / Bayt Mustaqbal
display           : standalone              orientation: portrait-primary
theme_color       : #0A192F                 background_color: #0A192F
start_url / scope : /

Ikon dari logo Kakang (`npm run icons` → `scripts/generate-icons.ps1`, trim otomatis):
  any      : icons/icon-{72,96,128,144,152,192,384,512}.png  — latar navy, konten 86%
  maskable : icons/maskable-{192,512}.png                    — latar navy, konten 68% (safe zone 80%)
  favicon  : icons/favicon.ico (16/32/48) · icons/apple-touch-icon.png (180, navy)
  brand    : brand/logo.png (256px, transparan) — mark di app
  warna    : latar navy #0A192F, artwork logo di tengah
```
> Kenapa latar ikon **navy**? Artwork logo mayoritas terang (putih/abu/cyan) → butuh latar gelap agar kontras; navy juga menyatu dengan `background_color` splash. (Versi lama memakai latar cyan + glyph rumah; sekarang diganti logo asli.)
> Ubah `$IconBg`/`$Ratio*` di bagian KONFIGURASI `scripts/generate-icons.ps1` lalu `npm run icons` bila ingin variasi.
> **Batas dua tema (jujur):** manifest hanya punya satu warna splash & ikon berlatar navy → **splash/ikon tetap navy** walau app bertema terang. Yang ikut tema hanya `<meta name="theme-color">` + warna status bar iOS (diperbarui skrip boot & saat tema berganti). Lihat §2 "Batas jujur".

### Aset statis & build (PENTING)
- Vite **hanya** menyalin folder `public/` ke `dist/`. Jadi `manifest.json`, `service-worker.js`, dan `icons/` wajib berada di `public/` — kalau ditaruh di root, semuanya 404 di produksi (install PWA & mode offline mati, ikon tidak muncul)
- `service-worker.js`: naikkan nomor versi cache (`family-*-v8`) setiap ada perubahan tampilan/aset agar HP yang sudah memasang PWA mengambil berkas baru

## 9. Offline Capabilities

- **App Shell Cache**: UI statis termuat instan dari cache (`cache-first` untuk aset statis)
- **API**: `network-first` → cache (backend belum ada, endpoint `/api/` masih kosong)
- **Status**: toast singkat saat online/offline berubah (3s) + banner menetap di `<main>` saat offline
- **Data**: dummy lokal; sinkronisasi & antrian gagal = rencana backend (lihat `PROJECT_SUMMARY.md`)

## 10. Responsive Design (Mobile-First)

```
< 640px  (HP 320–414px) : 1 kolom, donat & legenda bertumpuk (donat di atas),
                          KPI 2 kolom, nilai uang ringkas ("Rp 2,8 jt")
>= 640px (sm)           : px-6, gap-4, hero 2 kolom (nilai | anggaran+CTA),
                          sparkline KPI muncul
>= 768px (md)           : agenda & keuangan jadi 2 kolom
>= 1024px (lg)          : nav atas muncul, tab bar bawah hilang, KPI 4 kolom, daftar 3 kolom
```

### Perilaku khas mobile
- **Nilai uang**: diringkas di KPI & label chart (`Rp 2,8 jt`) via `formatCurrencyShort`; nilai penuh di atribut `title` dan section Keuangan
- **Anti-overflow**: `Card` `min-w-0`; legenda donut `flex-col` di HP → `flex-row` di `sm` (pernah meluber di 320px — sudah diperbaiki)
- **Tap**: `-webkit-tap-highlight-color: transparent` + `touch-action: manipulation`
- **Teks**: `-webkit-text-size-adjust: 100%`; **Header sticky** (bukan fixed) agar tidak goyang saat address bar HP menyusut

## 11. Accessibility Guidelines

- **Kontras**: ≥ 4.5:1 teks normal — **gelap**: ink 15:1, mutedfg 6.5:1, CTA putih 5.2:1 · **terang**: ink 12,3:1 (surface), mutedfg 6,3:1, CTA putih 5.2:1, nada terendah 4,95:1; 3:1 untuk indikator non-teks (titik anggota terang 5/5 lolos). Diukur dari warna render nyata, rincian di §2
- **Ukuran**: body 16px min; chart punya `aria-label` + `figcaption` sr-only (tabel data alternatif), donat tetap `role="img"`; batang & garis interaktif lewat tombol overlay satu-area yang bisa dijangkau keyboard (panah/Home/End/Escape) dengan pengumuman `aria-live`
- **Target sentuh**: 44px minimum (terverifikasi otomatis)
- **Fokus**: `:focus-visible` ring cyan 2px; gerbang meng-fokus tombol masuk saat dibuka
- **Screen reader**: HTML semantik, `aria-current="page"`, `aria-pressed`, `role="radio"` di pemilih pengguna
- **Badge hitungan tidak dibacakan sebagai angka telanjang**: jumlah belum dibaca masuk `aria-label` tombol lonceng ("Notifikasi, 4 belum dibaca") + satu wilayah `role="status"` sr-only ("4 notifikasi belum dibaca" / "Semua notifikasi sudah dibaca") — bukan satu live region per badge
- **Panel notifikasi**: daftar tombol biasa (tanpa `role="menu"`) karena isinya tautan aksi, bukan pilihan radio — dijangkau Tab dari tombol lonceng; di `lg` fokus otomatis ke item pertama; Escape menutup panel **dan** memulihkan fokus ke tombol lonceng; klik/ketuk di luar juga menutup
- **Modal Akun**: `role="dialog"` + `aria-modal` + `aria-labelledby` (judul "Akun saya"); fokus otomatis ke field Nama, Escape/backdrop/Batal/× menutup **dan** memulihkan fokus ke chip pengguna; label terhubung `htmlFor/id`; error per-field (`aria-invalid` + `aria-describedby`) **dan fokus pindah ke field bermasalah** saat gagal simpan; pesan galat foto profil memakai `role="alert"`; tombol lihat/sembunyikan password (`aria-pressed` + `aria-label` berganti) — panduan UX: pengguna harus bisa memeriksa apa yang diketik; scroll body dikunci selama modal terbuka
- **Tema**: pilihan tampilan = `<fieldset>` + `<legend>` "Tampilan" dengan 3 radio asli (`name="bm-theme"`) — bukan div ber-`role="radio"`, jadi panah/Enter/Space bawaan browser bekerja; ikon tidak sendirian (label teks "Sistem/Terang/Gelap"). Tombol tema di header ikon 44px + `aria-label` yang menyebut **mode tujuan** dan, bila sedang "Sistem", menyebut bahwa ia mengikuti perangkat ("Ganti ke mode terang (sekarang mengikuti pengaturan perangkat)"). Tidak ada animasi tema, jadi aman terhadap `prefers-reduced-motion`; gerbang tetap memaksa `data-theme` sebelum React jalan (tak ada kedip putih)
- **Batas yang diketahui (modal & bottom sheet)**: belum ada *focus trap* — Tab masih bisa berjalan ke tab bar/elemen di belakang dialog (perilaku sama dengan `FormSheet` sejak awal, jadi sengaja tidak dibedakan). Kalau ingin ditutup rapat, pasang trap di satu komponen dialog bersama agar keduanya konsisten

## 12. Animation & Motion

- **Token gerak** (tailwind.config.js): durasi `fast 120ms` · `base 200ms` · `slow 320ms`; easing `ease-smooth` = `cubic-bezier(0.22,1,0.36,1)` (masuk/decelerate) & `ease-crisp` = `cubic-bezier(0.4,0,0.2,1)` (umum). Pakai token ini, jangan angka/`cubic-bezier` lepas di komponen
- **Animasi yang ada**: `appFadeIn` (section), `gateIn` (gerbang), `dropMenuIn/Out` + `dropItemIn/Out` (dropdown kategori **& panel notifikasi** — panel notifikasi memakai `.drop-menu--right` agar tumbuh dari sudut kanan atas), `sheetBackdropIn` + `sheetPanelIn` (bottom sheet Tambah/Ubah), **`modalPanelIn`** (modal Akun membesar dari tengah: opacity + 8px + scale 0.97), `toastIn` (toast naik + fade), **`cardIn`** = item daftar masuk berundak (`.stagger > *`, opacity + 6px, delay 26ms untuk 6 item pertama)
- **Gerak berbasis transform (bukan layout)**: indikator tab menggeser (`translateX`), kartu hover terangkat (`-translate-y-0.5`), header bertransisi warna/bayangan saat digulir
- **Reduced motion**: `prefers-reduced-motion` mematikan semua animasi/transisi (App.css)
- **Glow**: statis (`shadow-glow`) pada elemen fokus/aksen (tab aktif, bilah indikator); tidak ada animasi denyut — `soft-pulse` dihapus bersama ilustrasi gerbang

## 13. Device-Specific Considerations

- **iOS**: safe-area notch & home indicator; `apple-mobile-web-app-status-bar-style` **dinamis** (`default` di terang, `black` di gelap — diperbarui skrip boot & saat tema berganti); Dynamic Type dihormati
- **Android**: maskable icon memakai safe zone 80%; bottom nav sesuai Material guidance
- **HP kelas bawah**: tanpa `backdrop-filter` berulang (kartu solid; glass hanya elemen kunci); fallback `@supports`

## 14. Performance Optimization

- **Bundle**: chart & ikon tanpa dependensi eksternal (SVG/div manual) → JS ~261 kB (gzip ~78 kB), CSS ~42 kB (gzip ~8,4 kB). Kenaikan dari tema terang: token warna tambahan + sedikit kelas (`data-theme` tidak menambah request/JS apa pun)
- **Tema tanpa biaya runtime**: pergantian tema = satu atribut `data-theme` + variabel CSS (bukan bundel/route kedua); tidak ada animasi saat berganti → tidak ada kerja render tambahan
- **Animasi murah**: elevasi = `box-shadow` statis (bukan `backdrop-filter` berulang); masuknya item daftar hanya opacity/transform (GPU) → aman untuk HP kelas bawah
- **Reduce Repaints**: animasi via transform/opacity; `transition-[width]` pada progressbar
- **Blur hemat**: backdrop-filter hanya di header/tab bar/hero/gerbang
- **Chart**: `vectorEffect="non-scaling-stroke"` + label HTML → tidak ada teks yang melar saat responsive

---

Design system ini adalah **sumber kebenaran** visual app. Setiap perubahan tampilan harus menyesuaikan di sini (dan sebaliknya: catat dulu di sini sebelum implementasi besar).