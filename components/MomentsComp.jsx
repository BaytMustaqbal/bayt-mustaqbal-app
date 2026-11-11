import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { SectionHeader, EmptyState, Badge, CTA_CLASS } from './ui';

/* Kategori tetap momen (sinkron dengan backend /api/moment). */
const MOMENT_CATEGORIES = [
  { id: 'kuliner', label: 'Kuliner', icon: 'utensils' },
  { id: 'wisata', label: 'Wisata', icon: 'mapPin' },
  { id: 'ibadah', label: 'Ibadah', icon: 'heart' },
  { id: 'acara_keluarga', label: 'Acara Keluarga', icon: 'users' },
  { id: 'kegiatan_rumah', label: 'Kegiatan di Rumah', icon: 'home' },
  { id: 'lainnya', label: 'Lainnya', icon: 'sparkles' },
];
const catMeta = (id) => MOMENT_CATEGORIES.find((c) => c.id === id) || MOMENT_CATEGORIES[MOMENT_CATEGORIES.length - 1];

const inputCls =
  'min-h-[48px] w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand';

/* Kartu satu momen. Foto (kalau ada) jadi header; tanpa foto → gradient + ikon. */
function MomentCard({ moment, canWrite, onEdit, onDelete }) {
  const meta = catMeta(moment.category);
  return (
    <div className="group overflow-hidden rounded-2xl border border-line bg-surface">
      {moment.photo_url ? (
        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
          <img
            src={moment.photo_url}
            alt={moment.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-brandtint to-muted text-brandfg">
          <Icon name={meta.icon} size={36} />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-ink">{moment.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mutedfg">
              <span>{moment.date}</span>
              {moment.location && (
                <span className="inline-flex items-center gap-1">
                  <Icon name="mapPin" size={11} />
                  {moment.location}
                </span>
              )}
            </p>
          </div>
          <Badge tone="brand">{meta.label}</Badge>
        </div>

        {moment.description && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-mutedfg">{moment.description}</p>
        )}

        {canWrite && (
          <div className="mt-3 flex gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(moment)}
              className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-2 text-xs font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink"
            >
              <Icon name="edit" size={14} />
              Ubah
            </button>
            <button
              type="button"
              onClick={() => onDelete(moment)}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-semibold text-mutedfg transition-colors hover:bg-tonerose/10 hover:text-tonerosefg"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Form tambah/ubah momen (bottom sheet sederhana). */
function MomentForm({ initial, canWrite, onCancel, onSubmit, onUploadPhoto }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [category, setCategory] = useState(initial?.category || 'lainnya');
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState(initial?.location || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photo_url || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const fileRef = useRef(null);

  // Kunci scroll body + tutup via Escape (sama seperti FormSheet).
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onCancel, 260);
  };

  useEffect(() => {
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
  }, [closing]);

  const submit = async () => {
    if (!title.trim() || !date) {
      setError('Judul dan tanggal wajib diisi.');
      return;
    }
    setError('');
    let finalPhoto = photoUrl;
    if (photoFile && onUploadPhoto) {
      setUploading(true);
      try {
        const up = await onUploadPhoto(photoFile);
        finalPhoto = up?.photo_url || photoUrl;
      } catch (e) {
        setUploading(false);
        setError(`Gagal unggah foto: ${e.message === 'NETWORK_ERROR' ? 'tanpa koneksi' : e.message}`);
        return;
      }
      setUploading(false);
    }
    await onSubmit({
      title: title.trim(),
      category,
      date,
      location: location.trim() || null,
      description: description.trim() || null,
      photo_url: finalPhoto || null,
    });
    requestClose();
  };

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      <button type="button" aria-label="Tutup" onClick={requestClose} className={`sheet-backdrop absolute inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm ${closing ? 'sheet-backdrop--closing' : ''}`} />
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        noValidate
        className={`sheet-panel absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl border border-b-0 border-line bg-surface/95 p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] shadow-pop backdrop-blur-xl ${closing ? 'sheet-panel--closing' : ''}`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
              <Icon name="camera" size={16} />
            </span>
            {initial ? 'Ubah Momen' : 'Momen Baru'}
          </h2>
          <button type="button" onClick={requestClose} aria-label="Tutup" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="max-h-[56vh] overflow-y-auto pr-1">
        {/* Foto */}
        <div className="mb-3.5">
          {photoUrl || photoFile ? (
            <div className="relative overflow-hidden rounded-xl border border-line">
              <img
                src={photoFile ? URL.createObjectURL(photoFile) : photoUrl}
                alt="Pratinjau momen"
                className="aspect-[16/9] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => { setPhotoUrl(''); setPhotoFile(null); }}
                className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-lg bg-canvas/80 text-mutedfg backdrop-blur transition-colors hover:text-danger"
                aria-label="Hapus foto"
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid min-h-[120px] w-full place-items-center rounded-xl border border-dashed border-line bg-canvas text-mutedfg transition-colors hover:border-brand/50 hover:text-brandfg"
            >
              <span className="flex flex-col items-center gap-1.5 text-xs font-medium">
                <Icon name="camera" size={22} />
                Tambah foto (opsional)
              </span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) setPhotoFile(f);
            }}
          />
          {photoFile && (
            <p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-mutedfg">
              Foto disimpan di penyimpanan Cloudflare app ini.
            </p>
          )}
        </div>

        {/* Judul */}
        <label className="mb-1 block text-xs font-semibold text-mutedfg">Judul momen</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Liburan ke Yogyakarta" className={inputCls} />

        <div className="mt-3.5 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-mutedfg">Tanggal</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mutedfg">Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {MOMENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="mb-1 mt-3.5 block text-xs font-semibold text-mutedfg">Lokasi (opsional)</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="mis. Candi Prambanan" className={inputCls} />

        <label className="mb-1 mt-3.5 block text-xs font-semibold text-mutedfg">Cerita singkat (opsional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Tuliskan kenangan di sini…"
          className={`${inputCls} resize-none py-2.5`}
        />
        </div>

        {error && <p role="alert" className="mb-3 text-xs font-medium text-danger">{error}</p>}

        <div className="mt-5 flex gap-2.5">
          <button type="button" onClick={requestClose} className="min-h-[48px] flex-1 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-mutedfg transition-colors hover:text-ink">
            Batal
          </button>
          <button type="submit" disabled={uploading} className={`${CTA_CLASS} min-h-[48px] flex-[2]`}>
            {uploading ? <div className="ld-trio ld-xs inline-block align-middle" aria-hidden="true"><i></i><i></i><i></i></div> : <Icon name="check" size={16} />}
            {uploading ? 'Mengunggah…' : initial ? 'Simpan Perubahan' : 'Simpan Momen'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function MomentsComp({ moments = [], canWrite = false, onSave, onDelete, onUploadPhoto, autoOpenAdd = null }) {
  const [form, setForm] = useState(null); // { mode: 'add' } | { mode: 'edit', moment }

  const openAdd = () => setForm({ mode: 'add' });
  const openEdit = (m) => setForm({ mode: 'edit', moment: m });

  // Auto-buka form "Momen Baru" saat sinyal dari FAB berubah.
  useEffect(() => {
    if (autoOpenAdd != null) openAdd();
  }, [autoOpenAdd]);

  return (
    <>
    <section className="app-fade-in">
      <SectionHeader
        icon="camera"
        title="Momen Keluarga"
        subtitle="Kenangan keluarga dalam satu arsip"
        actionLabel={canWrite ? 'Tambah Momen' : undefined}
        onAction={openAdd}
      />

      {!canWrite && moments.length === 0 ? (
        <EmptyState icon="camera" title="Belum ada momen" message="Momen keluarga akan tampil di sini." />
      ) : moments.length === 0 ? (
        <EmptyState
          icon="camera"
          title="Belum ada momen"
          message="Abadikan keseruan keluarga. Klik 'Tambah Momen' untuk mulai."
        />
      ) : (
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moments.map((m) => (
            <MomentCard key={m.id} moment={m} canWrite={canWrite} onEdit={openEdit} onDelete={() => onDelete(m)} />
          ))}
        </div>
      )}

    </section>

    {form && (
      <MomentForm
        initial={form.mode === 'edit' ? form.moment : null}
        canWrite={canWrite}
        onCancel={() => setForm(null)}
        onUploadPhoto={onUploadPhoto}
        onSubmit={async (data) => {
          try {
            if (form.mode === 'edit') await onSave(form.moment.id, data);
            else await onSave(null, data);
            setForm(null);
          } catch (e) {
            /* error sudah dipush oleh App */
          }
        }}
      />
    )}
    </>
  );
}

export default MomentsComp;
