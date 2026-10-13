/** @type {import('tailwindcss').Config} */
// Token desain "High-Tech Blue" — dark navy + electric cyan (lihat DESIGN-SYSTEM.md)
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
        canvas: '#0A192F',   // latar app (deep navy)
        surface: '#0F1E38',  // kartu & panel
        muted: '#16283F',    // latar hover / elevated
        line: '#1E3A5F',     // border & pemisah

        // ---------- Teks ----------
        ink: '#E8F1FF',      // teks utama (kontras 15:1 di atas canvas)
        mutedfg: '#93A7C4',  // teks sekunder (kontras 6,5:1 di atas surface)

        // ---------- Aksen ----------
        brand: '#22D3EE',    // electric cyan: garis, status aktif, glow
        brandfg: '#7DD3FC',  // cyan terang untuk teks/ikon di atas tint
        brandtint: 'rgb(34 211 238 / 0.14)',
        cta: '#2563EB',      // cobalt untuk tombol utama (teks putih, kontras 5,2:1)
        ctahover: '#1D4ED8',
        accent: '#F59E0B',   // penanda hangat
        success: '#22C55E',
        danger: '#F43F5E',

        // ---------- Seri chart ----------
        chart1: '#22D3EE',
        chart2: '#3B82F6',
        chart3: '#8B5CF6',
        chart4: '#F59E0B',
        chart5: '#10B981',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        // Glow cyan lembut — dipakai hemat, hanya pada elemen fokus/aksen
        glow: '0 10px 30px -18px rgba(0, 240, 255, 0.55)',

        /* ---------- Skala elevasi (dimensional layering) ----------
           Bayangan bernuansa navy (bukan hitam pekat) supaya kedalaman
           terbaca di atas permukaan navy, masing-masing ditemani garis
           cahaya 1px di tepi atas (kesan panel instrumen).
             e1  = kartu diam        e2 = kartu hover / terangkat
             pop = panel melayang    nav = bilah bawah (bayangan ke atas)   */
        e1: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 1px 2px 0 rgba(2, 8, 20, 0.40)',
        e2: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.07), 0 6px 14px -6px rgba(2, 8, 20, 0.60)',
        pop: '0 10px 30px -18px rgba(0, 240, 255, 0.35), 0 16px 34px -12px rgba(2, 8, 20, 0.74)',
        nav: '0 -6px 20px -10px rgba(2, 8, 20, 0.70)',
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
      },
    },
  },
  plugins: [],
};
