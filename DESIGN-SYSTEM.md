# Bayt Mustaqbal - Design System

> Design system ini dihasilkan lewat skill `ui-ux-pro-max` (query: *high-tech navy family finance dashboard*), kemudian disesuaikan dengan kebutuhan keluarga.
> Gaya: **High-Tech Blue** — dark navy + electric cyan, glassmorphism terukur, glow tipis, font mono untuk angka.
>
> **Riwayat:** versi lama = Flat Design teal (`#0D9488`) tanpa shadow/gradasi — **diganti total** pada iterasi tema (keputusan Kakang: *biru nuansa high-tech*). Mode terang direncanakan nanti; token warna sudah dipisah di `:root` supaya mode terang bisa ditambah tanpa membongkar ulang.
>
> **Iterasi "kedalaman + gerak"** (keputusan Kakang pada sesi review UI/UX): ditambahkan **skala elevasi** (`e1`/`e2`/`pop`/`nav`), **indikator tab bawah yang menggeser**, **header yang naik elevasi saat digulir**, **token durasi/easing** yang seragam, dan **item daftar masuk berundak** (`cardIn`). Semua CSS-only — tanpa dependensi baru.

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
- **Glow** (`shadow-glow`): hanya untuk elemen yang perlu menonjol (fokus, tab/ikon aktif, bilah indikator); jangan ditumpuk
- **Elevasi** (lihat §5): bayangan bernuansa navy (bukan hitam pekat) supaya kedalaman terbaca di atas permukaan navy — `e1` kartu diam, `e2` kartu hover, `pop` panel melayang (dropdown/sheet/toast/hero), `nav` bilah bawah

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
- **Bar atas (sticky)**: glass `bg-canvas/80 backdrop-blur-xl`; **naik elevasi saat digulir** (`window.scrollY > 6` → `border-line bg-canvas/90 shadow-e2`, transisi 200ms; saat di puncak border transparan); logo tile tint; **lonceng notifikasi**; chip pengguna (**buka modal "Akun saya"**, avatar foto/inisial + nama); nav desktop pill di `lg`; tombol Pasang (CTA, `sm`+). Urutan klaster kanan: **lonceng → chip pengguna → Pasang**
- **Notifikasi (lonceng)**: tombol bulat 44px di klaster kanan header; badge angka = jumlah belum dibaca (maks tampil "9+", gradasi cobalt + `shadow-glow`). Panel menempel di bawah header **rata kanan konten** (`right-4 sm:right-6`; `w-80`, dibatasi `max-w-[calc(100vw_-_2rem)]` di layar sempit — di 320px jadi 288px, tepi kiri tetap 16px dari layar). Isinya **turunan data** (`components/notifications.js`), bukan pesan statis
- **Bottom Tab Bar (< `lg`)**: glass + `shadow-nav` (bayangan halus ke atas, memisahkan bilah dari konten yang lewat di bawahnya), tinggi **tetap 56px** (`h-[56px]`), 5 tab, label 11px; tab aktif = teks `brandfg` + pill tint; **indikator cyan = satu elemen yang menggeser** di tepi atas (lebar = 1/5 slot, `translateX(activeIndex × 100%)`, transisi 320ms `ease-smooth`) — posisi dihitung dari tab aktif/section (dropdown yang terbuka ikut dihitung aktif); isi `max-w-md`
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
FamilyMemberCard : avatar `bg-brandtint border brand/25` + inisial `brandfg`
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
1. **Dashboard**: sapaan, hero keuangan, aksi cepat, KPI, tren 6 bulan, komposisi, daftar terbaru
2. **Agenda**: dropdown kategori di tab Agenda (Semua/Keluarga/Anak/Ibadah/Kesehatan/Rumah Tangga/Kendaraan, badge jumlah) + chip filter sinkron di dalam section; sub-tampilan **Jadwal | Tugas | Kalender | Timeline** (default Jadwal) — **Jadwal** = grid `ScheduleItem`; **Tugas** = chip filter status/prioritas (Semua Tugas/Belum Selesai/Sudah Selesai/Prioritas Tinggi/Sedang/Rendah) + `TaskList` (toggle selesai + badge prioritas); **Kalender** = kalender gabungan anggota (`Calendar.jsx`): view **Minggu/Bulan/Tahun** (default Bulan), **warna per member + legenda** (Rezki YT cyan, Hilda AK violet, RAGASUCI emerald, RAJABRANA amber, Keluarga sky), dot member di sel + bar bawah = ada tugas jatuh tempo, klik tanggal → daftar agenda hari itu, nav prev/next + "Hari Ini", filter kategori ikut memfilter kalender; **Timeline** = alur kronologis gabungan 4 modul (`Timeline.jsx`): rel vertikal + titik per hari + cabang ke tiap baris, kelompok **hari ini ke depan** lalu blok **Riwayat**, chip filter jenis (Semua/Agenda/Tugas/Keuangan/Catatan)
3. **Keuangan**: dropdown kategori di tab Keuangan (Semua/Belanja/Utilitas/Pendidikan/Transportasi/Kesehatan/Ibadah) + chip sinkron; grid `ExpenseCard` berikon kategori + total terfilter di header
4. **Keluarga**: dropdown bagian di tab Keluarga (Semua/Anggota/Kesehatan/Pendidikan Anak/Kontak & Darurat, badge jumlah) + chip sinkron; "Semua Keluarga" = semua bagian bertumpuk (grid `FamilyMemberCard` + daftar `FamilyList` tiap sub-bagian)
5. **Catatan**: dropdown filter di tab Catatan (Semua Catatan/Penting/Daftar Belanja/Rumah & Alat/Dapur & Resep/Ide & Info, badge jumlah) + chip sinkron; **kotak cari** (judul + isi, `type="search"`, tombol bersihkan) + grid `NoteList` (kartu catatan + badge kategori + pin "penting" + `ItemActions`)

### Screens Khusus
- **Layar Gerbang (WelcomeGate)**: muncul **setiap app dibuka** (keputusan Kakang) — pilih pengguna (Kakang/Istri, tersimpan `localStorage`) sebagai kartu (avatar foto bila ada, nama, `@username` bila diisi — kalau belum, peran) + tombol **"Muat ulang data contoh"** (hapus snapshot → kembali `mockData`) → nanti menjadi layar login saat backend siap
- **Bottom sheet "Tambah/Ubah" (FormSheet)**: dibuka dari tombol `SectionHeader` "Tambah" (mode tambah) atau `ItemActions` "Ubah" di kartu item (mode ubah, `initialValues` terisi, judul "Ubah …", tombol "Perbarui") di Agenda (Jadwal & Tugas)/Keuangan/Keluarga/Catatan; `role="dialog"` + `aria-modal`, label terhubung `htmlFor/id`, fokus otomatis ke field pertama, tutup via tombol ×/Batal/klik backdrop/Escape, scroll body dikunci selama terbuka
- **Panel Notifikasi (lonceng header)**: dibuka dari tombol lonceng; isinya **dihitung dari data** (`components/notifications.js`) — anggaran (≥ 80% "hampir habis", ≥ 100% "terlewati"), tugas (mendekati tenggat ≤ 3 hari, atau melewati tenggat; kalau tidak ada → ringkasan "belum selesai"), agenda terdekat (≤ 2 pekan; judul "hari ini"/"besok"/"terdekat"), pengeluaran terbesar (bila ≥ 20% anggaran). Urut dari yang paling perlu ditindak (anggaran → tugas → agenda → pengeluaran); maksimum 4–5 item, **bukan** tumpukan pesan
  - **Ketuk item** = lompat ke section terkait + filter ikut disetel (mis. notifikasi tugas → Agenda › Tugas, filter "Belum Selesai"); notifikasi ikut ditandai terbaca
  - **Tandai semua dibaca** = tombol 44px di kaki panel (muncul hanya kalau masih ada yang belum dibaca); status baca tersimpan di `localStorage` dengan kunci **terpisah** dari snapshot data (`bayt-mustaqbal-notif-read-v1`) karena ini keadaan tampilan, bukan data keluarga
  - **Id notifikasi diikat ke keadaan** (bulan / tanggal / id item) → kalau keadaan berubah (bulan baru, tenggat bergeser, agenda terdekat berganti), lonceng menyala lagi secara wajar; id yang notifikasinya sudah tidak ada dibuang saat menyimpan agar daftar tidak menumpuk
  - Hanya satu panel terbuka pada satu waktu (`openKey` yang sama dengan dropdown kategori) — membuka menu kategori otomatis menutup panel notifikasi, dan sebaliknya
- **Modal "Akun saya" (AccountModal)**: dibuka dari **chip pengguna** di header; berisi foto profil (pilih/ganti/hapus, dikecilkan otomatis ke 256px), Nama, Username, Password (kolom profil — **belum diverifikasi siapa pun**, dinyatakan terang di dalam modal), plus pintasan "Ganti pengguna" (kembali ke gerbang). Simpan → nama/username/avatar/password masuk snapshot data (`bayt-mustaqbal-data-v1`), inisial dihitung ulang dari nama, toast "Profil akun diperbarui"; fokus kembali ke chip saat ditutup

## 7. Touch Targets & Interaction Patterns

- **Minimum**: 44×44 px semua elemen interaktif; QuickAction 76px; tab bar 56px
- **Spacing**: 12px antar target (`gap-3`); area sentuh boleh lebih besar dari visual (checkbox 28px + `-m-2 h-11 w-11`)
- **Thumb zone**: aksi utama di bottom tab bar
- **Dropdown kategori (Agenda, Keuangan, Keluarga & Catatan)** (nav HP + desktop): buka = slide-up + fade 300ms `cubic-bezier(0.22,1,0.36,1)`, item berundak 30ms (`--i`), tutup = exit cepat 150ms; trigger `aria-expanded`/`aria-controls`/`aria-haspopup`, item `role="menuitemradio"` + `aria-checked`, tutup via Escape/klik luar, fokus item pertama di desktop; hanya satu dropdown terbuka pada satu waktu; `prefers-reduced-motion` → muncul langsung tanpa animasi
- **Chip filter** (di section Agenda — kategori jadwal & filter tugas, Keuangan, Keluarga & Catatan): `aria-pressed`, `flex-wrap` (tidak boleh terpotong satu baris), badge jumlah `font-mono`, aktif `bg-brandtint text-brandfg`; filter tugas = status (semua/belum/selesai) + prioritas (high/medium/low — `id` = nilai `priority` di data)
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

### Aset statis & build (PENTING)
- Vite **hanya** menyalin folder `public/` ke `dist/`. Jadi `manifest.json`, `service-worker.js`, dan `icons/` wajib berada di `public/` — kalau ditaruh di root, semuanya 404 di produksi (install PWA & mode offline mati, ikon tidak muncul)
- `service-worker.js`: naikkan nomor versi cache (`family-*-v7`) setiap ada perubahan tampilan/aset agar HP yang sudah memasang PWA mengambil berkas baru

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
- **Ukuran**: body 16px min; chart punya `aria-label` + `figcaption` sr-only (tabel data alternatif), donat tetap `role="img"`; batang & garis interaktif lewat tombol overlay satu-area yang bisa dijangkau keyboard (panah/Home/End/Escape) dengan pengumuman `aria-live`
- **Target sentuh**: 44px minimum (terverifikasi otomatis)
- **Fokus**: `:focus-visible` ring cyan 2px; gerbang meng-fokus tombol masuk saat dibuka
- **Screen reader**: HTML semantik, `aria-current="page"`, `aria-pressed`, `role="radio"` di pemilih pengguna
- **Badge hitungan tidak dibacakan sebagai angka telanjang**: jumlah belum dibaca masuk `aria-label` tombol lonceng ("Notifikasi, 4 belum dibaca") + satu wilayah `role="status"` sr-only ("4 notifikasi belum dibaca" / "Semua notifikasi sudah dibaca") — bukan satu live region per badge
- **Panel notifikasi**: daftar tombol biasa (tanpa `role="menu"`) karena isinya tautan aksi, bukan pilihan radio — dijangkau Tab dari tombol lonceng; di `lg` fokus otomatis ke item pertama; Escape menutup panel **dan** memulihkan fokus ke tombol lonceng; klik/ketuk di luar juga menutup
- **Modal Akun**: `role="dialog"` + `aria-modal` + `aria-labelledby` (judul "Akun saya"); fokus otomatis ke field Nama, Escape/backdrop/Batal/× menutup **dan** memulihkan fokus ke chip pengguna; label terhubung `htmlFor/id`; error per-field (`aria-invalid` + `aria-describedby`) **dan fokus pindah ke field bermasalah** saat gagal simpan; pesan galat foto profil memakai `role="alert"`; tombol lihat/sembunyikan password (`aria-pressed` + `aria-label` berganti) — panduan UX: pengguna harus bisa memeriksa apa yang diketik; scroll body dikunci selama modal terbuka
- **Batas yang diketahui (modal & bottom sheet)**: belum ada *focus trap* — Tab masih bisa berjalan ke tab bar/elemen di belakang dialog (perilaku sama dengan `FormSheet` sejak awal, jadi sengaja tidak dibedakan). Kalau ingin ditutup rapat, pasang trap di satu komponen dialog bersama agar keduanya konsisten

## 12. Animation & Motion

- **Token gerak** (tailwind.config.js): durasi `fast 120ms` · `base 200ms` · `slow 320ms`; easing `ease-smooth` = `cubic-bezier(0.22,1,0.36,1)` (masuk/decelerate) & `ease-crisp` = `cubic-bezier(0.4,0,0.2,1)` (umum). Pakai token ini, jangan angka/`cubic-bezier` lepas di komponen
- **Animasi yang ada**: `appFadeIn` (section), `gateIn` (gerbang), `dropMenuIn/Out` + `dropItemIn/Out` (dropdown kategori **& panel notifikasi** — panel notifikasi memakai `.drop-menu--right` agar tumbuh dari sudut kanan atas), `sheetBackdropIn` + `sheetPanelIn` (bottom sheet Tambah/Ubah), **`modalPanelIn`** (modal Akun membesar dari tengah: opacity + 8px + scale 0.97), `toastIn` (toast naik + fade), **`cardIn`** = item daftar masuk berundak (`.stagger > *`, opacity + 6px, delay 26ms untuk 6 item pertama)
- **Gerak berbasis transform (bukan layout)**: indikator tab menggeser (`translateX`), kartu hover terangkat (`-translate-y-0.5`), header bertransisi warna/bayangan saat digulir
- **Reduced motion**: `prefers-reduced-motion` mematikan semua animasi/transisi (App.css)
- **Glow**: statis (`shadow-glow`) pada elemen fokus/aksen (tab aktif, bilah indikator); tidak ada animasi denyut — `soft-pulse` dihapus bersama ilustrasi gerbang

## 13. Device-Specific Considerations

- **iOS**: safe-area notch & home indicator; `apple-mobile-web-app-status-bar-style: black`; Dynamic Type dihormati
- **Android**: maskable icon memakai safe zone 80%; bottom nav sesuai Material guidance
- **HP kelas bawah**: tanpa `backdrop-filter` berulang (kartu solid; glass hanya elemen kunci); fallback `@supports`

## 14. Performance Optimization

- **Bundle**: chart & ikon tanpa dependensi eksternal (SVG/div manual) → JS ~238 kB (gzip ~72 kB), CSS ~37 kB (gzip ~7,5 kB)
- **Animasi murah**: elevasi = `box-shadow` statis (bukan `backdrop-filter` berulang); masuknya item daftar hanya opacity/transform (GPU) → aman untuk HP kelas bawah
- **Reduce Repaints**: animasi via transform/opacity; `transition-[width]` pada progressbar
- **Blur hemat**: backdrop-filter hanya di header/tab bar/hero/gerbang
- **Chart**: `vectorEffect="non-scaling-stroke"` + label HTML → tidak ada teks yang melar saat responsive

---

Design system ini adalah **sumber kebenaran** visual app. Setiap perubahan tampilan harus menyesuaikan di sini (dan sebaliknya: catat dulu di sini sebelum implementasi besar).