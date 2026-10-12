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
        // Glow cyan lembut — dipakai hemat, hanya pada elemen fokus
        glow: '0 10px 30px -18px rgba(0, 240, 255, 0.55)',
        // Garis cahaya tipis di tepi atas kartu (kesan instrumen, tanpa blur)
        card: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};
