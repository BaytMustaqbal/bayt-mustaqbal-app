# Bayt Mustaqbal - Design System

> Design system ini dihasilkan lewat skill `ui-ux-pro-max` (query: *high-tech navy family finance dashboard*), kemudian disesuaikan dengan kebutuhan keluarga.
> Gaya: **High-Tech Blue** — dark navy + electric cyan, glassmorphism terukur, glow tipis, font mono untuk angka.
>
> **Riwayat:** versi lama = Flat Design teal (`#0D9488`) tanpa shadow/gradasi — **diganti total** pada iterasi tema (keputusan Kakang: *biru nuansa high-tech*). Mode terang direncanakan nanti; token warna sudah dipisah di `:root` supaya mode terang bisa ditambah tanpa membongkar ulang.

## 1. Visual Identity

### Brand Personality
- **High-Tech & Terpercaya**: navy gelap seperti panel instrumen, aksen cyan listrik yang "hidup" hanya di atas latar gelap
- **Menggunakan efek dengan disiplin**: kaca (glassmorphism) hanya di elemen kunci; glow tipis hanya saat hover/fokus; grid teknis hanya di belakang gerbang & chart
- **Family-Oriented**: target sentuh ≥ 44px, bahasa sederhana, kontras teks ≥ 4.5:1 tetap dijaga

### Logo & Icon System
- App mark: rumah (house) sederhana — glyph **navy `#0A192F`** di atas kotak **cyan `#22D3EE`** (ikon PWA; lihat §8)
- Ikon UI: **SVG inline** (gaya Lucide, stroke 24×24, stroke-width 1.75) — lihat `components/Icon.jsx`
- Ikon di dalam UI: tile `bg-brandtint` + ikon `text-brandfg` (bukan kotak solid terang)
- ❌ Tidak pakai emoji sebagai ikon; ❌ tidak pakai font ikon

## 2. Color System

Token dipakai sebagai Tailwind theme extension (lihat `tailwind.config.js`) dan CSS variable (lihat `App.css`).

### Primary Palette (dark)
```
Brand            (#22D3EE) - Aksen cyan listrik: garis chart, titik status, glow, indikator tab
Brand FG         (#7DD3FC) - Teks/ikon aksen di atas tint & surface (kontras ≥ 8:1)
Brand Tint       (rgba 34 211 238 / 0.14) - Latar aktif nav, tile ikon, badge
CTA              (#2563EB) - Tombol utama (teks putih, kontras 5.2:1) + hover #1D4ED8
Accent Warm      (#F59E0B) - Sorotan hangat (peringatan, ikon aksi amber)
Success          (#22C55E) - Nilai positif / tersimpan
Danger           (#F43F5E) - Error / offline
```

### Secondary Palette (dark)
```
Canvas           (#0A192F) - Latar halaman (deep navy)
Surface          (#0F1E38) - Kartu & panel
Muted            (#16283F) - Latar hover / elevated
Ink              (#E8F1FF) - Teks utama (kontras 15:1 di atas canvas)
Muted FG         (#93A7C4) - Teks sekunder (kontras 6.5:1 di atas surface)
Line             (#1E3A5F) - Border & pemisah
```

### Chart Series
```
chart1 #22D3EE (cyan) · chart2 #3B82F6 (cobalt) · chart3 #8B5CF6 (violet)
chart4 #F59E0B (amber) · chart5 #10B981 (emerald)
```

### Usage Guidelines
- **CTA (cobalt)**: tombol utama + teks putih → kontras 5.2:1; gradasi tipis `#1D4ED8 → #2563EB` aman di kedua ujungnya
- **Brand (cyan)**: ikon dekoratif, titik status, garis — jangan untuk teks kecil di atas cyan (kontras putih di cyan hanya ~2:1)
- **Brand FG**: teks/ikon aksen di atas tint atau surface (kontras ≥ 8:1)
- **Teks putih di atas cobalt CTA**: aman 5.2:1 (tombol "Masuk", "Pasang", "Lihat Keuangan")
- **Glow** (`shadow-glow`): hanya untuk elemen yang perlu menonjol (hero, fokus, ikon aktif); jangan ditumpuk

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

### Layout Patterns (aktual)
- **Dashboard**: sapaan → kartu hero glass (keuangan bulan ini + realisasi anggaran) → aksi cepat 4 tile → KPI 2→4 kolom (`lg`) → tren (line, full width) → bar+donat (1→2 kolom `lg`) → 2 panel daftar terbaru
- **Layar gerbang**: kartu sentral max-w-md, konten vertikal: identitas → ilustrasi → pilih pengguna → tombol masuk
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
Base Card : rounded-2xl, bg-surface, border 1px line, inset highlight 1px putih 5%
            (shadow-card) — TANPA backdrop-blur (kartu banyak → hemat performa)
Glass Card: .glass — gradient putih 6%→2%, border cyan 16%, backdrop blur 14px,
            hanya untuk: hero dashboard, layar gerbang, header, tab bar.
            Fallback solid via @supports (HP tanpa backdrop-filter).
Hover     : border → brand/50 (+ glow tipis pada hero)
Status    : Badge bertinta translucent (cyan/emerald/amber/rose/gray) + teks
```

#### Navigation System
- **Bar atas (sticky)**: glass `bg-canvas/80 backdrop-blur-xl`; logo tile tint; chip pengguna (kembali ke gerbang); nav desktop pill di `lg`; tombol Pasang (CTA, `sm`+)
- **Bottom Tab Bar (< `lg`)**: glass, tinggi **tetap 56px** (`h-[56px]`), 5 tab, label 11px; tab aktif = teks `brandfg` + pill tint + **garis indikator cyan** di tepi atas; isi `max-w-md`
- **Aktif**: `aria-current="page"` + cyan, bukan warna saja
- **Banner install**: `bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))]` = tepat di atas tab bar

### Dashboard-Specific
```
Hero (GlassCard) : label + nilai mono besar + badge delta naik/turun + ProgressBar
                   realisasi anggaran + CTA; latar grid-lines halus + glow
QuickAction      : tile 4-kolom, min-h 76px, ikon tile 40px ber-warna (cyan/blue/violet/amber)
StatCard (KPI)   : ikon tile ber-warna + nilai mono + label + hint opsional (+ sparkline sm+)
Chart            : BarChart (div), DonutChart & LineChart (SVG) — lihat components/charts.jsx
                   SEMUA label di HTML (bukan di SVG) agar tajam di semua lebar;
                   tiap chart punya aria-label + <figcaption class="sr-only">
```

### Family-Specific Components
```
FamilyMemberCard : avatar `bg-brandtint border brand/25` + inisial `brandfg`
ScheduleItem     : tile ikon kategori + badge anggota; tombol opsi area 44px (visual 36px)
ExpenseCard      : tile ikon kategori + nominal `brandfg` mono; deskripsi & tanggal
TaskList         : checkbox visual 28px dengan area sentuh 44px;
                   selesai = border-cta bg-cta text-white (ikon check)
```

## 6. Screen Hierarchy & Information Architecture

### Primary Screens (5 section, in-file switch, tanpa router)
1. **Dashboard**: sapaan, hero keuangan, aksi cepat, KPI, tren 6 bulan, komposisi, daftar terbaru
2. **Agenda**: dropdown kategori di tab Agenda (Semua/Keluarga/Anak/Service/Lainnya, badge jumlah) + chip filter sinkron di dalam section; grid `ScheduleItem`
3. **Keuangan**: dropdown kategori di tab Keuangan (Semua/Belanja/Utilitas/Pendidikan/Transportasi/Kesehatan/Ibadah) + chip sinkron; grid `ExpenseCard` berikon kategori + total terfilter di header
4. **Keluarga**: grid `FamilyMemberCard`
5. **Tugas**: `TaskList` dengan toggle selesai

### Screens Khusus
- **Layar Gerbang (WelcomeGate)**: muncul **setiap app dibuka** (keputusan Kakang) — pilih pengguna (Kakang/Istri, tersimpan `localStorage`) → nanti menjadi layar login saat backend siap

## 7. Touch Targets & Interaction Patterns

- **Minimum**: 44×44 px semua elemen interaktif; QuickAction 76px; tab bar 56px
- **Spacing**: 12px antar target (`gap-3`); area sentuh boleh lebih besar dari visual (checkbox 28px + `-m-2 h-11 w-11`)
- **Thumb zone**: aksi utama di bottom tab bar
- **Dropdown kategori (Agenda & Keuangan)** (nav HP + desktop): buka = slide-up + fade 300ms `cubic-bezier(0.22,1,0.36,1)`, item berundak 30ms (`--i`), tutup = exit cepat 150ms; trigger `aria-expanded`/`aria-controls`/`aria-haspopup`, item `role="menuitemradio"` + `aria-checked`, tutup via Escape/klik luar, fokus item pertama di desktop; hanya satu dropdown terbuka pada satu waktu; `prefers-reduced-motion` → muncul langsung tanpa animasi
- **Chip filter** (di section Agenda & Keuangan): `aria-pressed`, `flex-wrap` (tidak boleh terpotong satu baris), badge jumlah `font-mono`, aktif `bg-brandtint text-brandfg`
- **Verifikasi**: diuji 320/360/390/414/768 px × 5 section + gerbang + dropdown terbuka → **0 overflow, 0 elemen < 44px**
- **Feedback**: hover border/glow, `active:scale` pada CTA; `prefers-reduced-motion` mematikan animasi

## 8. PWA-Specific Implementation

### App Manifest (`public/manifest.json` — sumber kebenaran)
```
name / short_name : Bayt Mustaqbal — Manajemen Keluarga / Bayt Mustaqbal
display           : standalone              orientation: portrait-primary
theme_color       : #0A192F                 background_color: #0A192F
start_url / scope : /

Ikon (dibuat via `npm run icons`):
  any      : icons/icon-{72,96,128,144,152,192,384,512}.png  — sudut membulat, glyph 60%
  maskable : icons/maskable-{192,512}.png                    — penuh, glyph 52% (safe zone 80%)
  favicon  : icons/favicon.ico (16/32/48) · icons/apple-touch-icon.png (180)
  warna    : latar #22D3EE (cyan), glyph rumah #0A192F (navy)
```
> Kenapa ikon **cyan**, bukan navy? `background_color` manifest = navy → ikon navy akan tenggelam di splash screen; ikon cyan kontras kuat di atasnya dan tetap terlihat di wallpaper gelap maupun terang.

### Aset statis & build (PENTING)
- Vite **hanya** menyalin folder `public/` ke `dist/`. Jadi `manifest.json`, `service-worker.js`, dan `icons/` wajib berada di `public/` — kalau ditaruh di root, semuanya 404 di produksi (install PWA & mode offline mati, ikon tidak muncul)
- `service-worker.js`: naikkan nomor versi cache (`family-*-v2`) setiap ada perubahan tampilan agar HP yang sudah memasang PWA mengambil berkas baru

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
                          tombol Pasang muncul, sparkline KPI muncul
>= 768px (md)           : agenda & keuangan jadi 2 kolom
>= 1024px (lg)          : nav atas muncul, tab bar bawah hilang, KPI 4 kolom, daftar 3 kolom
```

### Perilaku khas mobile
- **Nilai uang**: diringkas di KPI & label chart (`Rp 2,8 jt`) via `formatCurrencyShort`; nilai penuh di atribut `title` dan section Keuangan
- **Anti-overflow**: `Card` `min-w-0`; legenda donut `flex-col` di HP → `flex-row` di `sm` (pernah meluber di 320px — sudah diperbaiki)
- **Tap**: `-webkit-tap-highlight-color: transparent` + `touch-action: manipulation`
- **Teks**: `-webkit-text-size-adjust: 100%`; **Header sticky** (bukan fixed) agar tidak goyang saat address bar HP menyusut

## 11. Accessibility Guidelines

- **Kontras**: ≥ 4.5:1 teks normal (ink 15:1, mutedfg 6.5:1, CTA putih 5.2:1); 3:1 untuk dekorasi besar
- **Ukuran**: body 16px min; chart punya `role="img"` + `aria-label` + `figcaption` sr-only (tabel data alternatif)
- **Target sentuh**: 44px minimum (terverifikasi otomatis)
- **Fokus**: `:focus-visible` ring cyan 2px; gerbang meng-fokus tombol masuk saat dibuka
- **Screen reader**: HTML semantik, `aria-current="page"`, `aria-pressed`, `role="radio"` di pemilih pengguna

## 12. Animation & Motion

- **Durasi**: 0.2–0.4s; easing `cubic-bezier(0.22,1,0.36,1)` untuk gerbang
- **Animasi yang ada**: `appFadeIn` (section), `gateIn` (gerbang), `softPulse` (denyut node ilustrasi)
- **Reduced motion**: `prefers-reduced-motion` mematikan semua animasi/transisi (App.css)
- **Glow**: boleh berdenyut pelan (`soft-pulse` 3.2s) hanya pada elemen dekoratif, jangan pada teks

## 13. Device-Specific Considerations

- **iOS**: safe-area notch & home indicator; `apple-mobile-web-app-status-bar-style: black`; Dynamic Type dihormati
- **Android**: maskable icon memakai safe zone 80%; bottom nav sesuai Material guidance
- **HP kelas bawah**: tanpa `backdrop-filter` berulang (kartu solid; glass hanya elemen kunci); fallback `@supports`

## 14. Performance Optimization

- **Bundle**: chart & ikon tanpa dependensi eksternal (SVG/div manual) → JS tetap ~182 kB, CSS ~25 kB
- **Reduce Repaints**: animasi via transform/opacity; `transition-[width]` pada progressbar
- **Blur hemat**: backdrop-filter hanya di header/tab bar/hero/gerbang
- **Chart**: `vectorEffect="non-scaling-stroke"` + label HTML → tidak ada teks yang melar saat responsive

---

Design system ini adalah **sumber kebenaran** visual app. Setiap perubahan tampilan harus menyesuaikan di sini (dan sebaliknya: catat dulu di sini sebelum implementasi besar).