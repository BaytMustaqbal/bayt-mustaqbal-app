import React, { useId } from 'react';

/* =========================================================
   Chart tulis sendiri (tanpa dependensi chart library).

   Kenapa begini:
   - Bentuknya SVG (atau div untuk batang) → ringan, offline ramah,
     warna neon & grid bisa diatur penuh.
   - SEMUA TEKS ditaruh di HTML, bukan di dalam SVG. Kalau teks ada di
     dalam SVG dengan viewBox, ukurannya ikut menskalakan: di HP jadi
     ~6 px (tak terbaca) dan di desktop jadi ~40 px (kebablasan).
   - Tiap chart punya penjelasan teks untuk pembaca layar
     (role="img" + aria-label + <figcaption class="sr-only">).
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

/* ---------------- Batang (perbandingan antar kategori/hari) ---------------- */

export function BarChart({ data, height = 160, color = '#22D3EE', formatValue = (v) => v }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const maxIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const summary = summaryOf(data, formatValue);

  return (
    <figure className="m-0" role="img" aria-label={`Grafik batang. ${summary}`}>
      <div className="grid-lines relative overflow-hidden rounded-xl border border-line/70 px-3 pt-8" style={{ height }}>
        {/* Garis bantu */}
        {[0, 25, 50, 75].map((t) => (
          <span key={t} aria-hidden="true" className="absolute inset-x-0 border-t border-line/60" style={{ top: `${t}%` }} />
        ))}

        <div className="relative flex h-full items-end gap-1.5">
          {data.map((d, i) => {
            const h = Math.max(4, (d.value / max) * 84);
            const isMax = i === maxIdx;
            return (
              <div key={d.label} className="relative flex h-full flex-1 items-end justify-center">
                <div
                  className="w-full max-w-[22px] rounded-t-md transition-[height] duration-300"
                  style={{
                    height: `${h}%`,
                    background: isMax
                      ? `linear-gradient(180deg, ${color}, rgba(34,211,238,0.35))`
                      : `linear-gradient(180deg, ${color}, rgba(34,211,238,0.08))`,
                    opacity: isMax ? 1 : 0.7,
                    boxShadow: isMax ? `0 0 14px ${color}66` : undefined,
                  }}
                />
                {isMax && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line/70 bg-canvas/85 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink">
                    {formatValue(d.value)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5 flex gap-1.5 text-[11px] text-mutedfg" aria-hidden="true">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center">
            {d.label}
          </span>
        ))}
      </div>

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
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E3A5F" strokeWidth={thickness} opacity="0.55" />
            {data.map((d) => {
              const len = (d.value / total) * c;
              const el = (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
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

export function LineChart({ data, height = 170, color = '#22D3EE', formatValue = (v) => v }) {
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
  const last = pts[n - 1];
  const summary = summaryOf(data, formatValue);

  return (
    <figure className="m-0" role="img" aria-label={`Grafik tren. ${summary}`}>
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
              <stop offset="0%" stopColor={color} stopOpacity="0.38" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#area-${gid})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
          {/* Penanda titik tertinggi */}
          <line x1="0" x2={W} y1={pts[values.indexOf(max)][1]} y2={pts[values.indexOf(max)][1]} stroke={color} strokeOpacity="0.35" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Titik terakhir + nilainya (HTML) */}
        <span
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-canvas bg-brand"
          style={{
            left: `${(last[0] / W) * 100}%`,
            top: `${(last[1] / H) * 100}%`,
            boxShadow: '0 0 12px rgba(34, 211, 238, 0.9)',
          }}
          aria-hidden="true"
        />
        <span
          className="absolute -translate-x-full -translate-y-1/2 whitespace-nowrap rounded-md border border-line/70 bg-canvas/85 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink"
          style={{ left: `calc(${(last[0] / W) * 100}% - 10px)`, top: `${(last[1] / H) * 100}%` }}
          aria-hidden="true"
        >
          {formatValue(values[n - 1])}
        </span>
      </div>

      <div className="mt-1.5 flex text-[11px] text-mutedfg" aria-hidden="true">
        {data.map((d) => (
          <span key={d.label} className="flex-1 truncate text-center">
            {d.label}
          </span>
        ))}
      </div>

      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/* ---------------- Sparkline (garis mini untuk kartu KPI) ---------------- */

export function Sparkline({ data, color = '#22D3EE' }) {
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
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}
