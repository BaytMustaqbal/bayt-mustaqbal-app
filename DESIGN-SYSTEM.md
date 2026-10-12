# Bayt Mustaqbal - Design System

> Design system ini dihasilkan lewat skill `ui-ux-pro-max` (query: *family management productivity dashboard warm trustworthy*).
> Gaya: **Flat Design** — minimalis, tanpa gradient/shadow, berani warna, fokus tipografi & ikon.

## 1. Visual Identity

### Brand Personality
- **Flat & Clean**: Tanpa shadow/gradient — border tipis, sudut membulat, warna solid
- **Warm & Trustworthy**: Teal yang menenangkan + aksen oranye hangat
- **Family-Oriented**: Tampilan lapang, target sentuh besar, bahasa sederhana

### Logo & Icon System
- App mark: rumah (house) sederhana di dalam kotak teal
- Ikon UI: **SVG inline** (gaya Lucide, stroke 24×24) — lihat `components/Icon.jsx`
- ❌ Tidak pakai emoji sebagai ikon; ❌ tidak pakai font ikon (Font Awesome dihapus)

## 2. Color System

Token dipakai sebagai Tailwind theme extension (lihat `index.html`) dan CSS variable (lihat `App.css`).

### Primary Palette
```
Brand            (#0D9488) - Aksen, ikon, elemen besar
Brand Dark       (#0F766E) - Tombol & teks interaktif di atas putih (kontras 5.5:1)
Brand Tint       (#CCFBF1) - Latar aktif / badge lembut
Accent Orange    (#EA580C) - Sorotan sekunder (pakai teks gelap)
Danger           (#DC2626) - Error / offline
```

### Secondary Palette
```
Canvas           (#F0FDFA) - Latar halaman
Surface          (#FFFFFF) - Kartu & panel
Ink              (#134E4A) - Judul / teks utama (kontras 9.5:1)
Muted FG         (#475569) - Teks sekunder (kontras 7.6:1)
Muted            (#E8F1F4) - Latar hover
Line             (#99F6E4) - Border & pemisah
```

### Usage Guidelines
- **Brand Dark**: tombol utama, tautan, teks aksen (di atas putih) — dipilih karena kontras lolos WCAG AA
- **Brand**: ikon dekoratif, titik status, elemen besar (≥24px) di mana 3:1 cukup
- **Brand Tint**: latar state aktif nav, badge
- **Accent Orange**: sorotan sekunder, wajib pakai teks gelap (kontras teks-hitam 5.9:1)
- **Catatan kontras**: teks **putih di atas #0D9488 hanya 3.75:1** → jangan untuk teks normal; gunakan #0F766E (5.47:1)

## 3. Typography System

### Font Hierarchy
```
Primary Font: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif
- Weight: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold), 800 (Extra-Bold)
- Letter-spacing: -0.025em (tracking-tight) untuk judul; normal untuk body
- Line-height: 1.5 untuk body, 1.1-1.2 untuk judul besar
```

### Type Scale (aktual di app)
```
H1 (dashboard hero): 30px → 36px (md)  — font-extrabold
H2 (judul section):   20px             — font-bold
H3 (judul panel/item):16px             — font-semibold
Body:                 16px
Small:                14px (text-sm)
Caption/label:        12px (text-xs) / 11px (nav mobile)
Angka besar (KPI):    24px (text-2xl)  — font-bold
```

### Responsive Typography
- Mobile: Scale down by 0.8 for tablets
- Touch devices: Minimum 16px for body text
- Readability: Line length 45-65 characters

## 4. Layout System

### Grid Foundation
```
Container : max-w-6xl (1152px), padding px-4 → sm:px-6
Grid      : CSS Grid (grid-cols-*) — bukan grid 12 kolom kaku
Breakpoint: sm 640px · md 768px · lg 1024px (default Tailwind)
Nav       : header sticky (semua lebar) + bottom tab bar 56px (di bawah lg)
Safe area : env(safe-area-inset-top) pada header,
            env(safe-area-inset-bottom) pada bottom nav + padding bawah <main>
```

### Layout Patterns (aktual)
- **Dashboard KPI**: 2 kolom di HP → 4 kolom di `lg`
- **Panel ringkasan**: 1 kolom → 2 kolom di `lg`
- **Daftar kartu** (agenda/keuangan): 1 → 2 (`md`) → 3 kolom (`lg`)
- **Grid anggota keluarga**: 2 → 3 (`sm`) → 4 kolom (`lg`)
- **Form / isi konten**: satu kolom, label di atas input

### Spacing Scale (yang dipakai)
```
Kartu   : p-3.5 / p-4 / sm:p-5 / md:p-6
Section : space-y-6 (HP) → space-y-8 (sm)
Grid gap: gap-3 (HP) → gap-4 (sm) → gap-6 (lg)
Padding bawah konten: pb-[calc(4.5rem_+_env(safe-area-inset-bottom))]
  → 72px+, agar kartu terakhir tidak tertutup bottom tab bar
```

## 5. Component Library

### Core Components

#### Button System
- **Primary Button**: Latar `#0F766E`, teks putih, tinggi min 44px, sudut `rounded-full`
- **Ghost / Secondary**: Tanpa latar, teks `mutedfg`, hover latar `muted`
- **Outline Button**: Border `line`, teks `branddark`, tinggi min 44px
- **Destructive Button**: `#DC2626` untuk hapus/keluar
- **Transisi**: 150–200ms (`transition-colors`), tanpa shadow

#### Card Components
```
Base Card: rounded-2xl, border 1px #99F6E4, latar putih, TANPA shadow
Hover: border berubah ke brand (bukan elevation/shadow)
Status Card: badge bertinta (green/amber/rose/gray) + teks, bukan warna saja
```

#### Navigation System
- **Bar atas (sticky)**: merek + nav desktop (pill aktif `bg-brandtint`) + tombol Pasang. Tinggi 56px (HP) → 64px (`sm`); nav desktop baru muncul di `lg`
- **Bottom Tab Bar (mobile & tablet, < `lg`)**: 5 ikon, tinggi **tetap 56px** (dikunci `h-[56px]`), label 11px, aksen aktif teal pada ikon + pill; lebar isi dibatasi `max-w-md` agar tidak melar di tablet
- **Aktif**: `aria-current="page"` + warna teal + pill tint (bukan warna saja)
- **Banner install** diposisikan `bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))]` = tepat di atas tab bar, `lg:bottom-0`

### Family-Specific Components

#### Family Member Card
```css
.avatar : 56px (HP) → 64px (sm), rounded-2xl, bg #0F766E, inisial putih
.info   : nama (truncate), peran, badge hubungan
.aksi   : cepat (pesan, telepon, lihat)
```

#### Schedule Items
```
Color-coded by family member
Time indicators with visual markers
Status dots (completed/pending/in-progress)
```

#### Task Management
```
Priority indicators (red/yellow/green)
Due date visual cues
Team member assignments
```

## 6. Screen Hierarchy & Information Architecture

### Primary Screens
1. **Dashboard**: Overview, KPIs, quick actions
2. **Family List**: All members, search, filters
3. **Calendar**: Events, schedules, reminders
4. **Tasks**: To-do list, completed items, assignments
5. **Messages**: Family communication, threads
6. **Photos**: Family gallery, albums, sharing

### Secondary Screens
- Profile details
- Settings & preferences
- Family tree
- Financial overview
- Health & wellness tracker

### Hierarchical Information Flow
- **Level 1**: Dashboard (most important information)
- **Level 2**: Family overview (family-specific data)
- **Level 3**: Specific sections (tasks, calendar, messages)
- **Level 4**: Detail screens (individual items, profiles)

## 7. Touch Targets & Interaction Patterns

### Touch Target Guidelines
- **Minimum Size**: 44px × 44px untuk semua elemen interaktif
- **Spacing**: 12px antar target (`gap-3`)
- **Hit Test**: Area sentuh boleh lebih besar dari tampilan visual — contoh: checkbox tugas tampil 28px, area sentuh 44px (`-m-2 h-11 w-11` + kotak 28px di dalamnya)
- **Thumb Zone**: aksi utama (navigasi) di bottom tab bar
- **Verifikasi**: diuji di lebar 320 / 360 / 390 / 414 / 768 / 1024 / 1280 px → 0 elemen di bawah 44px, 0 overflow horizontal

### Interaction Feedback
- **Tap**: Color change + subtle ripple effect
- **Hold**: Context menu or preview
- **Swipe**: 200px threshold for navigation
- **Pinch**: Zoom for photo viewing
- **Scroll**: Momentum-based, smooth scrolling

### Micro-interactions
- **Loading**: Spinner or progress bar
- **Success**: Confetti celebration or checkmark
- **Error**: Vibration + error message
- **Empty State**: Animated, helpful messaging

## 8. PWA-Specific Implementation

### App Manifest (`public/manifest.json` — sumber kebenaran)

```
name / short_name : Bayt Mustaqbal — Manajemen Keluarga / Bayt Mustaqbal
display           : standalone              orientation: portrait-primary
theme_color       : #0D9488                 background_color: #F0FDFA
start_url / scope : /

Ikon (dibuat via `npm run icons`):
  any      : icons/icon-{72,96,128,144,152,192,384,512}.png  — sudut membulat, glyph 60%
  maskable : icons/maskable-{192,512}.png                    — penuh, glyph 52% (safe zone 80%)
  favicon  : icons/favicon.ico (16/32/48) · icons/apple-touch-icon.png (180)
```

### Aset statis & build (PENTING)
- Vite **hanya** menyalin folder `public/` ke `dist/`. Jadi `manifest.json`, `service-worker.js`, dan `icons/` wajib berada di `public/` — kalau ditaruh di root, semuanya 404 di produksi (install PWA & mode offline mati, ikon tidak muncul)
- `index.html` tetap di root; di dev, isi `public/` disajikan di `/`

## 9. Offline Capabilities

### Offline-First Strategy
- **App Shell Cache**: Basic UI loads instantly
- **Critical Data**: Family list, basic schedules
- **Forms**: Local storage with sync on reconnection
- **Messages**: Local queue for delivery

## 10. Responsive Design (Mobile-First)

### Breakpoints & Adaptations (aktual)
```
< 640px  (HP kecil: 320–414px) : 1–2 kolom, px-4, nav bawah 56px, hero text-2xl
                          KPI 2 kolom; nilai uang ringkas ("Rp 2,8 jt")
>= 640px (sm)             : px-6, gap-4, hero text-3xl, avatar 64px, tombol Pasang muncul
>= 768px (md)             : agenda & keuangan jadi 2 kolom
>= 1024px (lg)            : nav atas muncul, tab bar bawah hilang, KPI 4 kolom,
                          daftar 3 kolom, padding bawah 48px
```

### Perilaku khas mobile
- **Nilai uang di kartu KPI**: diringkas (`Rp 2,8 jt`) agar tidak meluber di kartu separuh layar; nilai penuh ada di atribut `title` dan di section Keuangan
- **Anti-overflow**: kartu diberi `min-w-0` supaya boleh menyusut di dalam grid/flex
- **Tap**: `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` (hilangkan delay 300ms)
- **Teks**: `-webkit-text-size-adjust: 100%` (cegah pembesaran otomatis iOS)
- **Header sticky (bukan fixed)**: tidak "goyang" saat address bar HP menyusut/muncul

## 11. Accessibility Guidelines

### WCAG Compliance
- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Font Size**: Minimum 16px body, 12px small text
- **Touch Targets**: 44px minimum for interactive elements
- **Focus Indicators**: High contrast, visible focus rings
- **Screen Reader**: Semantic HTML, ARIA labels

## 12. Animation & Motion

### Animation Principles
- **Duration**: 0.2s - 0.4s for standard interactions
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for material design
- **Delay**: Stagger animations for sequential content
- **Spring Physics**: Natural feel for UI feedback

## 13. Device-Specific Considerations

### iOS Design
- **Safe Areas**: Account for notch and home indicator
- **System Fonts**: SF Pro, San Francisco
- **Human Interface Guidelines**: Follow Apple's HIG
- **Dynamic Type**: Respect system font size settings

### Android Design
- **Material Design**: Follow Material Design principles
- **System Fonts**: Roboto, Noto Sans
- **Material Shadows**: Elevations 1-24dp
- **Navigation Patterns**: Bottom navigation, drawer

## 14. Performance Optimization

### Visual Performance
- **Reduce Repaints**: Use CSS transforms
- **Hardware Acceleration**: `transform` instead of `left/top`
- **Debounced Resizes**: Prevent layout thrashing
- **Image Optimization**: WebP, lazy loading, responsive images

This design system provides a comprehensive foundation for your family management PWA, ensuring consistency across all platforms while maintaining the warm, trustworthy personality essential for family applications. The system balances modern design trends with accessibility, performance, and the specific needs of family-oriented interfaces.