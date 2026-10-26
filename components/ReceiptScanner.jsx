import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';
import { saranDariTeks, daftarItemDariTeks, jumlahItemDariTeks } from './receiptOcr';

/* Pemindai struk: mode semi-auto.
   Foto (JPEG/PNG) hanya dibaca lewat OCR di browser, TIDAK pernah disimpan.
   Hasil OCR berupa saran isian form, pengguna mengedit lalu menekan Simpan.
   Simpan diserahkan ke App lewat onSave (App yang menyimpan sebagai pengeluaran). */

const INPUT_CLS =
  'min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand disabled:opacity-50';

const PICKER_CLS =
  'inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-sm font-medium text-ink transition-colors hover:bg-muted disabled:opacity-50';

// Format rupiah ringkas untuk rincian item (mis. Rp11.500)
const rp = (n) => `Rp${Number(n).toLocaleString('id-ID')}`;

export function ReceiptScanner({ categories = [], defaultDate = '', onClose, onSave }) {
  const titleId = useId();
  const camRef = useRef(null);
  const galRef = useRef(null);
  const urlRef = useRef('');

  const [preview, setPreview] = useState('');
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: defaultDate,
    category: categories[0]?.value || '',
  });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  // Teks mentah hasil OCR (bukan teks struk yang disimpan, hanya untuk
  // diperiksa pengguna & membantu diagnosis bila hasil bacaan tidak jelas)
  const [rawText, setRawText] = useState('');
  // Rincian item terbaca dari struk (read-only, untuk verifikasi pengguna)
  const [items, setItems] = useState([]);

  // Tutup dengan Escape (kecuali sedang OCR) + kunci scroll body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [busy, onClose]);

  // Cabut objectURL saat komponen dilepas: foto tidak boleh menetap di memori
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setErr('Format foto harus JPEG atau PNG.');
      return;
    }
    const url = URL.createObjectURL(file);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    setPreview(url);
    setForm((f) => ({ description: '', amount: '', date: defaultDate, category: f.category }));
    setNote('Foto siap. Tekan "Baca struk".');
    setErr('');
    setProgress(0);
    setRawText('');
    setItems([]);
  };

  const jalankanOCR = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setErr('');
    setNote('Membaca teks struk...');
    setProgress(0);
    try {
      // Dimuat saat dibutuhkan supaya bundel utama tetap ringan
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('ind+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round((m.progress || 0) * 100));
        },
      });
      const hasil = await worker.recognize(preview);
      await worker.terminate();

      const saran = saranDariTeks(hasil?.data?.text || '');
      setRawText(hasil?.data?.text || '');
      setItems(daftarItemDariTeks(hasil?.data?.text || ''));
      setForm((f) => ({
        ...f,
        description: saran.description || f.description,
        amount: saran.amount > 0 ? String(saran.amount) : f.amount,
        date: saran.date || f.date,
      }));
      setNote(
        saran.amount > 0
          ? 'Saran terbaca. Periksa isian lalu tekan Simpan.'
          : 'Teks belum terbaca jelas. Silakan isi manual di bawah.',
      );
      setProgress(100);
    } catch (e) {
      setErr(
        `Gagal membaca struk (${e?.message || 'kesalahan tidak diketahui'}). OCR butuh koneksi internet saat pertama kali, atau isi manual di bawah.`,
      );
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  const simpan = (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim() || !(amount > 0)) {
      setErr('Deskripsi dan nominal wajib diisi.');
      return;
    }
    setErr('');
    onSave({
      description: form.description.trim(),
      amount,
      date: form.date || defaultDate,
      category: form.category,
    });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* Backdrop: tutup saat diketuk di luar panel */}
      <button
        type="button"
        aria-label="Tutup pemindai struk"
        onClick={() => { if (!busy) onClose(); }}
        disabled={busy}
        className="modal-backdrop absolute inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm"
      />

      <form
        onSubmit={simpan}
        noValidate
        className="modal-panel relative max-h-[calc(100dvh_-_2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-surface/95 p-5 shadow-pop backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 text-base font-bold text-ink">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
              <Icon name="camera" size={16} />
            </span>
            Foto Struk
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            disabled={busy}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink disabled:opacity-50"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <p className="mb-3 text-xs leading-relaxed text-mutedfg">
          Foto hanya dipakai untuk membaca teks, tidak disimpan. Isian di bawah adalah saran dari hasil bacaan,
          silakan diperiksa dan diperbaiki sebelum disimpan.
        </p>

        {/* ---------- Pilih sumber foto ---------- */}
        <input ref={camRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={onFile} />
        <input ref={galRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onFile} />

        <div className="flex gap-2.5">
          <button type="button" className={PICKER_CLS} onClick={() => camRef.current?.click()} disabled={busy}>
            <Icon name="camera" size={17} />
            Ambil foto
          </button>
          <button type="button" className={PICKER_CLS} onClick={() => galRef.current?.click()} disabled={busy}>
            <Icon name="file" size={17} />
            Dari galeri
          </button>
        </div>

        {/* ---------- Preview + tombol OCR ---------- */}
        <div className="mt-3 rounded-2xl border border-line bg-canvas p-3.5">
          {preview ? (
            <img src={preview} alt="Pratinjau struk (tidak disimpan)" className="max-h-40 w-full rounded-xl object-contain" />
          ) : (
            <p className="py-4 text-center text-sm text-mutedfg">Belum ada foto. Pilih kamera atau galeri di atas.</p>
          )}

          <button
            type="button"
            onClick={jalankanOCR}
            disabled={!preview || busy}
            className={`${CTA_CLASS} mt-3 w-full`}
          >
            <Icon name="search" size={17} />
            {busy ? 'Membaca...' : 'Baca struk'}
          </button>

          {busy && (
            <div className="mt-2.5" role="status" aria-live="polite">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-300"
                  style={{ width: `${Math.max(6, progress)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-mutedfg">{note} {progress > 0 ? `${progress}%` : ''}</p>
            </div>
          )}
        </div>

        {/* ---------- Hasil semi-auto: pengguna mengedit ---------- */}
        <div className="mt-3.5 space-y-3 rounded-2xl border border-line bg-canvas p-3.5">
          <div>
            <label htmlFor={`${titleId}-desc`} className="mb-1.5 block text-xs font-semibold text-mutedfg">
              Deskripsi
            </label>
            <input
              id={`${titleId}-desc`}
              type="text"
              className={INPUT_CLS}
              value={form.description}
              onChange={set('description')}
              placeholder="contoh: Indomaret, Toko Bangunan"
              disabled={busy}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${titleId}-amount`} className="mb-1.5 block text-xs font-semibold text-mutedfg">
                Nominal (Rp)
              </label>
              <input
                id={`${titleId}-amount`}
                type="number"
                inputMode="numeric"
                min={0}
                className={INPUT_CLS}
                value={form.amount}
                onChange={set('amount')}
                placeholder="contoh: 75000"
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor={`${titleId}-date`} className="mb-1.5 block text-xs font-semibold text-mutedfg">
                Tanggal
              </label>
              <input
                id={`${titleId}-date`}
                type="date"
                className={INPUT_CLS}
                value={form.date}
                onChange={set('date')}
                disabled={busy}
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${titleId}-cat`} className="mb-1.5 block text-xs font-semibold text-mutedfg">
              Kategori
            </label>
            <select id={`${titleId}-cat`} className={INPUT_CLS} value={form.category} onChange={set('category')} disabled={busy}>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {!busy && note && (
            <p className="text-xs text-mutedfg" role="status" aria-live="polite">
              {note}
            </p>
          )}
        </div>

        {/* ---------- Rincian item terbaca (read-only, untuk verifikasi) ---------- */}
        {items.length > 0 && (
          <div className="mt-3.5 rounded-2xl border border-line bg-canvas p-3.5">
            <h3 className="mb-2 text-xs font-semibold text-mutedfg">Rincian terbaca</h3>
            <ul className="space-y-1.5">
              {items.map((it, idx) => (
                <li key={idx} className="flex justify-between text-sm">
                  <span className="text-mutedfg truncate">{it.nama}</span>
                  <span className="text-ink">{rp(it.harga)}</span>
                </li>
              ))}
            </ul>
            {items.reduce((s, i) => s + i.harga, 0) > 0 && (
              <div className="mt-2 border-t border-line pt-2 text-right text-sm font-semibold text-ink">
                Total item: {rp(items.reduce((s, i) => s + i.harga, 0))}
              </div>
            )}
          </div>
        )}

        {/* ---------- Teks mentah hasil OCR (untuk diperiksa / diagnosis) ---------- */}
        {rawText && !busy && (
          <details className="mt-3 rounded-2xl border border-line bg-canvas">
            <summary className="cursor-pointer list-none px-3.5 py-2.5 text-xs font-semibold text-mutedfg transition-colors hover:text-ink">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="chevronDown" size={14} aria-hidden="true" />
                Lihat teks hasil baca
              </span>
            </summary>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap border-t border-line px-3.5 py-2.5 text-[11px] leading-relaxed text-mutedfg">
              {rawText}
            </pre>
          </details>
        )}

        {err && (
          <p className="mt-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {err}
          </p>
        )}

        {/* ---------- Aksi ---------- */}
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-4 text-sm font-semibold text-ink transition-colors hover:bg-muted disabled:opacity-50"
          >
            Batal
          </button>
          <button type="submit" className={`${CTA_CLASS} flex-[2]`} disabled={busy}>
            <Icon name="circleCheck" size={17} />
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}
