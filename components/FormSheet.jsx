import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';

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

export function FormSheet({
  open,
  title,
  icon,
  fields,
  initialValues,
  submitLabel = 'Simpan',
  onClose,
  onSubmit,
}) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const firstFieldRef = useRef(null);
  const titleId = useId();

  // Isi nilai awal + fokus field pertama setiap kali dibuka
  useEffect(() => {
    if (!open) return undefined;
    const init = {};
    fields.forEach((f) => {
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
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

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
    onClose();
  };

  const inputCls =
    'input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand';

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* Backdrop: tutup saat diketuk di luar panel */}
      <button
        type="button"
        aria-label="Tutup formulir"
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm"
      />

      {/* Panel */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="sheet-panel absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl border border-b-0 border-line bg-surface/95 p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] shadow-glow backdrop-blur-xl"
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
            onClick={onClose}
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
          <button
            type="button"
            onClick={onClose}
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