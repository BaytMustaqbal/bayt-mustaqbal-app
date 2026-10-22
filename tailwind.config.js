/** @type {import('tailwindcss').Config} */
// Token desain "High-Tech Blue" — dua tema: gelap (default) & terang.
//
// PENTING: nilai warna TIDAK ditulis di sini, melainkan di App.css sebagai
// KANAL RGB (`:root` = gelap, `[data-theme='light']` = terang). Format kanal
// dipakai supaya pengubah opasitas Tailwind tetap bekerja, mis.
// `border-brand/20` → `rgb(var(--brand) / 0.2)`.
const tone = (name) => ({
  [`tone${name}`]: `rgb(var(--tone-${name}) / <alpha-value>)`,
  [`tone${name}fg`]: `rgb(var(--tone-${name}-fg) / <alpha-value>)`,
});

// Nada badge & tile ikon (satu pasangan latar + teks per nada).
const TONES = ['cyan', 'blue', 'violet', 'emerald', 'amber', 'rose'];

module.exports = {
  content: [
    './index.html',
    './*.jsx',
    './components/**/*.jsx',
  ],
  theme: {
    extend: {
      colors: {
        // ---------- Permukaan ----------
        canvas: 'rgb(var(--canvas) / <alpha-value>)',    // latar app
        surface: 'rgb(var(--surface) / <alpha-value>)',  // kartu & panel
        muted: 'rgb(var(--muted) / <alpha-value>)',      // latar hover / elevated
        line: 'rgb(var(--line) / <alpha-value>)',        // border & pemisah

        // ---------- Teks ----------
        ink: 'rgb(var(--ink) / <alpha-value>)',          // teks utama
        mutedfg: 'rgb(var(--muted-fg) / <alpha-value>)', // teks sekunder

        // ---------- Aksen ----------
        brand: 'rgb(var(--brand) / <alpha-value>)',      // garis, status aktif
        brandfg: 'rgb(var(--brand-fg) / <alpha-value>)', // teks/ikon di atas tint
        brandtint: 'rgb(var(--brand) / 0.14)',           // latar tint aksen
        cta: 'rgb(var(--cta) / <alpha-value>)',          // tombol utama
        ctahover: 'rgb(var(--cta-hover) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',    // penanda hangat
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',

        // ---------- Seri chart ----------
        chart1: 'rgb(var(--chart1) / <alpha-value>)',
        chart2: 'rgb(var(--chart2) / <alpha-value>)',
        chart3: 'rgb(var(--chart3) / <alpha-value>)',
        chart4: 'rgb(var(--chart4) / <alpha-value>)',
        chart5: 'rgb(var(--chart5) / <alpha-value>)',
        chart6: 'rgb(var(--chart6) / <alpha-value>)',

        // ---------- Warna anggota (titik di kalender) ----------
        member1: 'rgb(var(--member1) / <alpha-value>)',
        member2: 'rgb(var(--member2) / <alpha-value>)',
        member3: 'rgb(var(--member3) / <alpha-value>)',
        member4: 'rgb(var(--member4) / <alpha-value>)',
        member5: 'rgb(var(--member5) / <alpha-value>)',

        // ---------- Nada badge/tile: bg-tonecyan/15 text-tonecyanfg ----------
        ...TONES.reduce((acc, name) => Object.assign(acc, tone(name)), {}),
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        // Semua bayangan ikut tema (nilainya di App.css) karena di mode terang
        // bayangan navy pekat + garis cahaya putih tidak masuk akal.
        glow: 'var(--shadow-glow)', // halo aksen — hemat, hanya elemen fokus/aksen

        /* ---------- Skala elevasi (dimensional layering) ----------
           e1  = kartu diam        e2 = kartu hover / terangkat
           pop = panel melayang    nav = bilah bawah (bayangan ke atas)   */
        e1: 'var(--shadow-e1)',
        e2: 'var(--shadow-e2)',
        pop: 'var(--shadow-pop)',
        nav: 'var(--shadow-nav)',
      },
      /* ---------- Token gerak (durasi + easing) ----------
         fast = umpan balik tekan · base = transisi umum · slow = panel/overlay */
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)', // masuk (decelerate)
        crisp: 'cubic-bezier(0.4, 0, 0.2, 1)',    // umum
        /* Spring halus (overshoot kecil) — dipakai FAB Dashboard saat
           dilepas: tekan masuk cepat (crisp), keluar melenting (spring). */
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
