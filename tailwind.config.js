/** @type {import('tailwindcss').Config} */
// Design tokens dari skill ui-ux-pro-max (Flat Design: teal + orange)
module.exports = {
  content: [
    './index.html',
    './*.jsx',
    './components/**/*.jsx',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F0FDFA',
        surface: '#FFFFFF',
        ink: '#134E4A',
        muted: '#E8F1F4',
        mutedfg: '#475569',
        line: '#99F6E4',
        brand: '#0D9488',
        branddark: '#0F766E',
        brandtint: '#CCFBF1',
        accent: '#EA580C',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
