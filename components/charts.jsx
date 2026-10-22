import React, { useId, useState } from 'react';

/* =========================================================
   Chart tulis sendiri (tanpa dependensi chart library).

   Kenapa begini:
   - Bentuknya SVG (atau div untuk batang) → ringan, offline ramah,
     warna neon & grid bisa diatur penuh.
   - SEMUA TEKS ditaruh di HTML, bukan di dalam SVG. Kalau teks ada di
     dalam SVG dengan viewBox, ukurannya ikut menskalakan: di HP jadi
     ~6 px (tak terbaca) dan di desktop jadi ~40 px (kebablasan).
   - Grafik batang & garis bisa diketuk: seluruh area grafik jadi SATU sasaran
     sentuh besar (bukan tombol per batang yang cuma ~28px di layar 320px).
     Nilainya juga tersedia tanpa interaksi: aria-label + <figcaption
     class="sr-only"> berisi ringkasan lengkap semua titik.
   ========================================================= */

/* Kurva halus (Catmull-Rom → Bezier) */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

function summaryOf(data, formatValue) {
  return data.map((d) => `${d.label}: ${formatValue(d.value)}`).join('; ');
}

/* ---------------- Interaksi grafik: ketuk untuk lihat nilai ----------------

   Kenapa satu area sentuh besar, bukan tombol per batang:
   di layar 320px satu slot batang hanya ~28px — di bawah aturan target sentuh
   ≥44px. Jadi SELURUH area grafik yang jadi sasaran (jauh di atas 44px), lalu
   indeks terdekat dihitung dari posisi X. Tombolnya transparan (overlay), jadi
   isi grafik tetap boleh berupa <div> (isi <button> harus phrasing content).

   Cara pakai: klik/ketuk untuk memilih · ketuk lagi untuk melepas ·
   panah kiri/kanan/Home/End untuk keyboard · Escape untuk melepas.
   Default (belum dipilih) = `defaultIdx` (batang tertinggi / titik terakhir).
   ------------------------------------------------------------------------- */
const clampIdx = (i, count) => Math.max(0, Math.min(count - 1, i));

function useChartPick(count, defaultIdx, mode = 'slot') {
  const [picked, setPicked] = useState(null);

  // mode 'slot'  : lebar dibagi rata (batang)   → indeks = floor(rel × count)
  // mode 'point' : titik di ujung rentang (garis) → indeks = round(rel × (count−1))
  const idxAt = (clientX, el) => {
    const rect = el.getBoundingClientRect();
    const rel = rect.width ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    return mode === 'slot' ? clampIdx(Math.floor(rel * count), count) : clampIdx(Math.round(rel * (count - 1)), count);
  };

  const onClick = (e) => {
    const idx = idxAt(e.clientX, e.currentTarget);
    setPicked((prev) => (prev === idx ? null : idx));
  };

  const onKeyDown = (e) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (step) {
      e.preventDefault();
      setPicked(clampIdx((picked ?? defaultIdx) + step, count));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setPicked(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setPicked(count - 1);
    } else if (e.key === 'Escape') {
      setPicked(null);
    }
  };

  return { activeIdx: picked ?? defaultIdx, handlers: { onClick, onKeyDown } };
}

/* Label nilai mengambang (HTML, bukan SVG → tetap tajam dan tidak ikut skala) */
function ValueTag({ children, className = '', ...rest }) {
  return (
    <span
      className={`pointer-events-none absolute whitespace-nowrap rounded-md border border-line/70 bg-canvas/95 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

/* Lapisan tak terlihat di atas grafik: seluruh area grafik jadi satu sasaran sentuh */
function ChartTapLayer({ label, handlers }) {
  return (
    <button
      type="button"
      {...handlers}
      aria-label={label}
      className="absolute inset-0 z-10 cursor-pointer rounded-xl"
    />
  );
}

/* ---------------- Batang (perbandingan antar kategori/hari) ---------------- */

export function BarChart({ data, height = 160, color = 'rgb(var(--chart1))', formatValue = (v) => v }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const maxIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const summary = summaryOf(data, formatValue);
  const { activeIdx, handlers } = useChartPick(data.length, maxIdx);
  const active = data[activeIdx];

  return (
    <figure className="m-0" aria-label="Grafik pengeluaran harian">
      <div className="relative" style={{ height }}>
        {/* Lapisan dekoratif dipisah dari batang: `overflow-hidden` di sini hanya
            memotong garis bantu/grid, sehingga label nilai yang menjulang di atas
            batang paling kiri/kanan tidak ikut terpotong. */}
        <div
          className="grid-lines pointer-events-none absolute inset-0 overflow-hidden rounded-xl border border-line/70"
          aria-hidden="true"
        >
          {[0, 25, 50, 75].map((t) => (
            <span key={t} className="absolute inset-x-0 border-t border-line/60" style={{ top: `${t}%` }} />
          ))}
        </div>

        <div className="absolute inset-0 flex items-end gap-1.5 px-3 pt-8" aria-hidden="true">
          {data.map((d, i) => {
            const h = Math.max(4, (d.value / max) * 84);
            const isActive = i === activeIdx;
            return (
              <div key={d.label} className="relative flex h-full flex-1 items-end justify-center">
                <div
                  className="w-full max-w-[22px] rounded-t-md transition-[height,opacity] duration-300"
                  style={{
                    height: `${h}%`,
                    // Fade ke `transparent` (bukan ke cyan hardcode) supaya
                    // gradasi ikut tema lewat `color` yang diarahkan ke token.
                    background: `linear-gradient(180deg, ${color}, transparent)`,
                    opacity: isActive ? 1 : 0.6,
                    boxShadow: isActive ? `0 0 14px ${color}` : undefined,
                  }}
                />
                {isActive && <ValueTag className="-top-6 left-1/2 -translate-x-1/2">{formatValue(d.value)}</ValueTag>}
              </div>
            );
          })}
        </div>

        <ChartTapLayer
          label="Ketuk batang, atau pakai tombol panah kiri/kanan, untuk melihat nilai tiap hari."
          handlers={handlers}
        />
      </div>

      <div className="mt-1.5 flex gap-1.5 text-[11px] text-mutedfg" aria-hidden="true">
        {data.map((d, i) => (
          <span
            key={d.label}
            className={`flex-1 truncate text-center ${i === activeIdx ? 'font-semibold text-brandfg' : ''}`}
          >
            {d.label}
          </span>
        ))}
      </div>

      {/* Nilai yang sedang dipilih dibacakan (untuk pengguna pembaca layar) */}
      <p className="sr-only" aria-live="polite">
        {active ? `${active.label}: ${formatValue(active.value)}` : ''}
      </p>

      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/* ---------------- Batang berpasangan (dua seri per label) ----------------
   Dipakai tab Ringkasan: tren pemasukan vs pengeluaran per bulan. Pola &
   aksesibilitas sama dengan BarChart (satu area sentuh besar, nilai lewat
   ValueTag, ringkasan lengkap di figcaption sr-only). data: [{ label,
   income, expense }]. */
export function GroupedBarChart({
  data,
  height = 180,
  inColor = 'rgb(var(--success))',
  outColor = 'rgb(var(--danger))',
  formatValue = (v) => v,
}) {
  const max = Math.max(...data.flatMap((d) => [d.income || 0, d.expense || 0]), 1);
  const maxIdx = data.reduce(
    (best, d, i) => ((d.income || 0) + (d.expense || 0) > (data[best].income || 0) + (data[best].expense || 0) ? i : best),
    0
  );
  const { activeIdx, handlers } = useChartPick(data.length, maxIdx);
  const active = data[activeIdx];
  const summary = data
    .map((d) => `${d.label}: masuk ${formatValue(d.income || 0)}, keluar ${formatValue(d.expense || 0)}`)
    .join('; ');

  return (
    <figure className="m-0" aria-label="Grafik tren pemasukan dan pengeluaran per bulan">
      {/* Legenda — warna + teks, jangan hanya warna */}
      <div className="mb-2 flex items-center gap-4 text-[11px] text-mutedfg" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ background: inColor }} />
          Pemasukan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm" style={{ background: outColor }} />
          Pengeluaran
        </span>
      </div>

      <div className="relative" style={{ height }}>
        <div
          className="grid-lines pointer-events-none absolute inset-0 overflow-hidden rounded-xl border border-line/70"
          aria-hidden="true"
        >
          {[0, 25, 50, 75].map((t) => (
            <span key={t} className="absolute inset-x-0 border-t border-line/60" style={{ top: `${t}%` }} />
          ))}
        </div>

        <div className="absolute inset-0 flex items-end gap-1.5 px-3 pt-8" aria-hidden="true">
          {data.map((d, i) => {
            const isActive = i === activeIdx;
            const hi = Math.max(4, ((d.income || 0) / max) * 84);
            const he = Math.max(4, ((d.expense || 0) / max) * 84);
            return (
              <div key={d.label} className="relative flex h-full flex-1 items-end justify-center gap-1">
                <div className="flex h-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[15px] rounded-t-md transition-[height,opacity] duration-300"
                    style={{
                      height: `${hi}%`,
                      background: `linear-gradient(180deg, ${inColor}, transparent)`,
                      opacity: isActive ? 1 : 0.6,
                      boxShadow: isActive ? `0 0 14px ${inColor}` : undefined,
                    }}
                  />
                </div>
                <div className="flex h-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[15px] rounded-t-md transition-[height,opacity] duration-300"
                    style={{
                      height: `${he}%`,
                      background: `linear-gradient(180deg, ${outColor}, transparent)`,
                      opacity: isActive ? 1 : 0.6,
                      boxShadow: isActive ? `0 0 14px ${outColor}` : undefined,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {active && (
          <ValueTag className="-top-6 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            <span style={{ color: inColor }}>{formatValue(active.income || 0)}</span>
            <span className="opacity-50">/</span>
            <span style={{ color: outColor }}>{formatValue(active.expense || 0)}</span>
          </ValueTag>
        )}

        <ChartTapLayer
          label="Ketuk kelompok batang, atau pakai tombol panah kiri/kanan, untuk melihat nilai pemasukan dan pengeluaran tiap bulan."
          handlers={handlers}
        />
      </div>

      <div className="mt-1.5 flex gap-1.5 text-[11px] text-mutedfg" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.label} className={`flex-1 truncate text-center ${i === activeIdx ? 'font-semibold text-brandfg' : ''}`}>
            {d.label}
          </span>
        ))}
      </div>

      {/* Nilai yang sedang dipilih dibacakan (untuk pengguna pembaca layar) */}
      <p className="sr-only" aria-live="polite">
        {active ? `${active.label}: pemasukan ${formatValue(active.income || 0)}, pengeluaran ${formatValue(active.expense || 0)}` : ''}
      </p>

      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/* ---------------- Donat (komposisi) ---------------- */

export function DonutChart({
  data,
  size = 168,
  thickness = 20,
  formatValue = (v) => v,
  centerLabel = 'Total',
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const summary = summaryOf(data, formatValue);

  let offset = 0;

  return (
    <figure
      className="m-0 flex flex-col items-stretch gap-5 sm:flex-row sm:items-center"
      role="img"
      aria-label={`Diagram donat. ${summary}`}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              style={{ stroke: 'rgb(var(--donut-track))' }}
              strokeWidth={thickness}
              opacity="0.55"
            />
            {data.map((d) => {
              const len = (d.value / total) * c;
              const el = (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  // `style` (bukan atribut `stroke`): atribut SVG tidak
                  // menyelesaikan `var()`, sedangkan inline CSS iya.
                  style={{ stroke: d.color }}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
          </g>
        </svg>

        {/* Nilai tengah (HTML → tetap tajam) */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-mono text-base font-bold text-ink">{formatValue(total)}</p>
            <p className="text-[11px] text-mutedfg">{centerLabel}</p>
          </div>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{d.label}</span>
            <span className="shrink-0 font-mono text-xs text-mutedfg">{Math.round((d.value / total) * 100)}%</span>
            <span className="shrink-0 font-mono text-xs font-semibold text-brandfg">{formatValue(d.value)}</span>
          </li>
        ))}
      </ul>

      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/* ---------------- Garis (tren) ---------------- */

export function LineChart({ data, height = 170, color = 'rgb(var(--chart1))', formatValue = (v) => v }) {
  const W = 600;
  const H = 200;
  const padX = 12;
  const padTop = 18;
  const padBottom = 14;

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const n = data.length;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const pts = data.map((d, i) => [
    padX + (i / (n - 1)) * innerW,
    padTop + innerH - ((d.value - min) / span) * innerH,
  ]);

  const line = smoothPath(pts);
  const area = `${line} L ${pts[n - 1][0].toFixed(2)} ${H} L ${pts[0][0].toFixed(2)} ${H} Z`;
  const gid = useId().replace(/[:]/g, '');
  const summary = summaryOf(data, formatValue);
  const { activeIdx, handlers } = useChartPick(n, n - 1, 'point');
  const active = pts[activeIdx];
  // Label diletakkan di sisi yang lapang: titik di paruh kiri → label ke kanan
  // (dan sebaliknya) supaya label tidak menjulur keluar tepi grafik/kartu.
  const labelRight = activeIdx < n / 2;

  return (
    <figure className="m-0" aria-label="Grafik tren pengeluaran bulanan">
      <div className="relative">
        <div className="grid-lines absolute inset-0 rounded-xl border border-line/70" aria-hidden="true" />

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="relative block w-full"
          style={{ height }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: color }} stopOpacity="0.38" />
              <stop offset="100%" style={{ stopColor: color }} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#area-${gid})`} />
          <path d={line} fill="none" style={{ stroke: color }} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
          {/* Penanda titik tertinggi */}
          <line
            x1="0"
            x2={W}
            y1={pts[values.indexOf(max)][1]}
            y2={pts[values.indexOf(max)][1]}
            style={{ stroke: color }}
            strokeOpacity="0.35"
            strokeDasharray="4 5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Titik aktif + nilainya (HTML → tetap tajam) */}
        <span
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-brand"
          style={{
            left: `${(active[0] / W) * 100}%`,
            top: `${(active[1] / H) * 100}%`,
            boxShadow: '0 0 12px rgb(var(--brand) / 0.9)',
          }}
          aria-hidden="true"
        />
        <ValueTag
          className={labelRight ? '-translate-y-1/2' : '-translate-x-full -translate-y-1/2'}
          style={{
            left: `calc(${(active[0] / W) * 100}% ${labelRight ? '+' : '-'} 10px)`,
            top: `${(active[1] / H) * 100}%`,
          }}
          aria-hidden="true"
        >
          {formatValue(values[activeIdx])}
        </ValueTag>

        <ChartTapLayer
          label="Ketuk grafik, atau pakai tombol panah kiri/kanan, untuk melihat nilai tiap bulan."
          handlers={handlers}
        />
      </div>

      <div className="mt-1.5 flex text-[11px] text-mutedfg" aria-hidden="true">
        {data.map((d, i) => (
          <span
            key={d.label}
            className={`flex-1 truncate text-center ${i === activeIdx ? 'font-semibold text-brandfg' : ''}`}
          >
            {d.label}
          </span>
        ))}
      </div>

      {/* Nilai yang sedang dipilih dibacakan (untuk pengguna pembaca layar) */}
      <p className="sr-only" aria-live="polite">
        {data[activeIdx] ? `${data[activeIdx].label}: ${formatValue(data[activeIdx].value)}` : ''}
      </p>

      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/* ---------------- Sparkline (garis mini untuk kartu KPI) ---------------- */

export function Sparkline({ data, color = 'rgb(var(--chart1))' }) {
  const values = data.map((d) => (typeof d === 'number' ? d : d.value));
  if (values.length < 2) return null;

  const W = 96;
  const H = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    H - 4 - ((v - min) / span) * (H - 8),
  ]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-24" aria-hidden="true">
      <path d={smoothPath(pts)} fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}
