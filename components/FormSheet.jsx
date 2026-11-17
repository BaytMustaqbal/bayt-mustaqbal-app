import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS, CurrencyInput } from './ui';
import { useFocusTrap } from './useFocusTrap';

/* ============================================================================
   Bottom sheet "Tambah / Ubah" — formulir generik per section.

   Field spec:
     { key, label, type: 'text'|'date'|'time'|'number'|'select'|'textarea'|'checkbox',
       required, options?:[{value,label}], defaultValue?, placeholder?, min?, rows?, help? }

   Mode ubah: kirim `initialValues` (nilai terisi) + `submitLabel` lain
   (mis. "Perbarui"). Tanpa `initialValues`, sheet berperilaku seperti tambah.

   Aksesibilitas: role="dialog" aria-modal, label terhubung (htmlFor/id),
   Escape/klik luar menutup, error wajib diisi + aria-invalid, scroll body
   dikunci selama sheet terbuka, reduced-motion nonaktifkan animasi (global).
   ============================================================================ */

/* Rincian belanja: baris nama + harga yang bisa ditambah/dihapus.
   Nilai field = [{ name, price }]. Baris kosong tidak ikut dikirim. */
function ItemsField({ id, label, help, value, onChange }) {
  const [rows, setRows] = useState(() => (Array.isArray(value) ? value : []).map((it) => ({
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(it?.name ?? ''),
    price: Number(it?.price) || 0,
  })));

  const commit = (next) => {
    setRows(next);
    onChange(
      next
        .map((r) => ({ name: r.name.trim(), price: Number(r.price) || 0 }))
        .filter((r) => r.name || r.price > 0),
    );
  };
  const tambah = () => commit([...rows, { key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: '', price: 0 }]);
  const ubah = (key, patch) => commit(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const hapus = (key) => commit(rows.filter((r) => r.key !== key));
  const total = rows.reduce((s, r) => s + (Number(r.price) || 0), 0);

  return (
    <details className="rounded-xl border border-line bg-canvas" open={rows.length > 0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold text-mutedfg transition-colors hover:text-ink">
        <span>{label}{rows.length > 0 ? ` (${rows.length})` : ''}</span>
        <Icon name="chevronDown" size={15} aria-hidden="true" />
      </summary>
      <div className="space-y-2 border-t border-line px-3.5 py-3">
        {help && <p className="text-xs leading-relaxed text-mutedfg">{help}</p>}
        {rows.length === 0 && <p className="text-xs text-mutedfg">Belum ada baris. Rincian boleh dikosongkan.</p>}
        {rows.map((r, index) => (
          <div key={r.key} className="flex items-center gap-2">
            <input
              id={index === 0 ? id : undefined}
              type="text"
              inputMode="text"
              placeholder="Nama barang"
              value={r.name}
              onChange={(e) => ubah(r.key, { name: e.target.value })}
              className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand"
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Harga"
              value={r.price ? Number(r.price).toLocaleString('id-ID') : ''}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                ubah(r.key, { price: digits ? parseInt(digits, 10) : 0 });
              }}
              className="min-h-[44px] w-28 shrink-0 rounded-lg border border-line bg-surface px-3 text-right font-mono text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand"
            />
            <button
              type="button"
              onClick={() => hapus(r.key)}
              aria-label={`Hapus baris ${index + 1}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-tonerose/15 hover:text-tonerosefg"
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={tambah}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-muted"
          >
            <Icon name="plus" size={14} />
            Tambah baris
          </button>
          {total > 0 && <span className="font-mono text-xs font-semibold text-mutedfg">Total rincian: Rp{total.toLocaleString('id-ID')}</span>}
        </div>
      </div>
    </details>
  );
}

export function FormSheet({
  open,
  title,
  icon,
  fields,
  initialValues,
  submitLabel = 'Simpan',
  onClose,
  onSubmit,
  onDelete,
}) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [closing, setClosing] = useState(false);
  const firstFieldRef = useRef(null);
  const panelRef = useRef(null);
  const titleId = useId();

  // Focus trap: Tab tersiklus di dalam panel (FormSheet sudah fokus ke field
  // pertama, jadi autoFocus dimatikan).
  useFocusTrap(panelRef, open, { autoFocus: false });

  // Tutup dengan animasi keluar (slide-down) lalu baru panggil onClose.
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 260);
  };

  // Isi nilai awal + fokus field pertama setiap kali dibuka
  useEffect(() => {
    if (!open) return undefined;
    setClosing(false);
    const init = {};
    fields.forEach((f) => {
      if (f.type === 'items') {
        init[f.key] = Array.isArray(initialValues?.[f.key]) ? initialValues[f.key] : [];
        return;
      }
      init[f.key] = initialValues?.[f.key] ?? f.defaultValue ?? '';
    });
    setValues(init);
    setErrors({});
    const t = setTimeout(() => firstFieldRef.current?.focus(), 80);
    return () => clearTimeout(t);
    // fields/initialValues dianggap statis per bukaan — cukup re-run saat open berubah
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kunci scroll body + tutup via Escape
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const setVal = (key, v) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    fields.forEach((f) => {
      if (f.required && !String(values[f.key] ?? '').trim()) errs[f.key] = 'Wajib diisi';
    });
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onSubmit(values);
    requestClose();
  };

  const inputCls =
    'input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand';

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* Backdrop: tutup saat diketuk di luar panel */}
      <button
        type="button"
        aria-label="Tutup formulir"
        onClick={requestClose}
        className={`sheet-backdrop absolute inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm ${closing ? 'sheet-backdrop--closing' : ''}`}
      />

      {/* Panel */}
      <form
        ref={panelRef}
        onSubmit={handleSubmit}
        noValidate
        className={`sheet-panel absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl border border-b-0 border-line bg-surface/95 p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] shadow-pop backdrop-blur-xl ${closing ? 'sheet-panel--closing' : ''}`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 text-base font-bold text-ink">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg"
              aria-hidden="true"
            >
              <Icon name={icon} size={16} />
            </span>
            {title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Tutup"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="max-h-[56vh] space-y-3.5 overflow-y-auto pr-1">
          {fields.map((f, index) => {
            const fieldId = `sheet-${f.key}`;
            const err = errors[f.key];
            return (
              <div key={f.key}>
                {f.type === 'checkbox' ? (
                  /* Baris centang (mis. "Tandai penting") — label sudah di dalam kotak */
                  <label
                    htmlFor={fieldId}
                    className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-line bg-canvas px-3.5 transition-colors hover:border-brand/50"
                  >
                    <input
                      id={fieldId}
                      ref={index === 0 ? firstFieldRef : null}
                      type="checkbox"
                      checked={!!values[f.key]}
                      onChange={(e) => setVal(f.key, e.target.checked)}
                      className="h-5 w-5 shrink-0 rounded accent-[#2563EB]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{f.label}</span>
                      {f.help && <span className="block text-xs text-mutedfg">{f.help}</span>}
                    </span>
                  </label>
                ) : f.type === 'items' ? (
                  <ItemsField
                    id={fieldId}
                    label={f.label}
                    help={f.help}
                    value={values[f.key] || []}
                    onChange={(v) => setVal(f.key, v)}
                  />
                ) : (
                  <>
                    <label htmlFor={fieldId} className="mb-1 block text-xs font-semibold text-mutedfg">
                      {f.label}
                      {f.required && (
                        <span className="text-brand" aria-hidden="true">
                          {' '}
                          *
                        </span>
                      )}
                    </label>

                    {f.type === 'select' ? (
                      <div className="relative">
                        <select
                          id={fieldId}
                          ref={index === 0 ? firstFieldRef : null}
                          value={values[f.key] || ''}
                          onChange={(e) => setVal(f.key, e.target.value)}
                          aria-invalid={!!err}
                          aria-describedby={err ? `${fieldId}-err` : undefined}
                          className={`${inputCls} appearance-none pr-10`}
                        >
                          {f.placeholder && <option value="">{f.placeholder}</option>}
                          {f.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <span
                          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-mutedfg"
                          aria-hidden="true"
                        >
                          <Icon name="chevronDown" size={16} />
                        </span>
                      </div>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        id={fieldId}
                        ref={index === 0 ? firstFieldRef : null}
                        rows={f.rows || 3}
                        placeholder={f.placeholder}
                        value={values[f.key] || ''}
                        onChange={(e) => setVal(f.key, e.target.value)}
                        aria-invalid={!!err}
                        aria-describedby={err ? `${fieldId}-err` : undefined}
                        className={`${inputCls} resize-y py-2.5 leading-relaxed`}
                      />
                    ) : f.type === 'currency' ? (
                      <CurrencyInput
                        id={fieldId}
                        value={values[f.key] || 0}
                        onChange={(n) => setVal(f.key, n)}
                        placeholder={f.placeholder}
                        aria-invalid={!!err}
                        aria-describedby={err ? `${fieldId}-err` : undefined}
                        className={`${inputCls} appearance-none`}
                      />
                    ) : (
                      <input
                        id={fieldId}
                        ref={index === 0 ? firstFieldRef : null}
                        type={f.type}
                        inputMode={f.type === 'number' ? 'decimal' : undefined}
                        min={f.min}
                        placeholder={f.placeholder}
                        value={values[f.key] || ''}
                        onChange={(e) => setVal(f.key, e.target.value)}
                        aria-invalid={!!err}
                        aria-describedby={err ? `${fieldId}-err` : undefined}
                        className={inputCls}
                      />
                    )}
                  </>
                )}

                {err && (
                  <p id={`${fieldId}-err`} className="mt-1 text-xs font-medium text-danger">
                    {err}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex gap-2.5">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl border border-danger/40 px-3.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              <Icon name="trash" size={16} />
              Hapus
            </button>
          )}
          <button
            type="button"
            onClick={requestClose}
            className="min-h-[48px] flex-1 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-mutedfg transition-colors hover:text-ink"
          >
            Batal
          </button>
          <button type="submit" className={`${CTA_CLASS} min-h-[48px] flex-[2]`}>
            <Icon name="check" size={16} />
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}