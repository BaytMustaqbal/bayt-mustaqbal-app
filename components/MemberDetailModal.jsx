import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Card, CTA_CLASS } from './ui';
import { formatBirthDate } from './FamilyTree';
import { auth } from '../services/client';

/* Modal detail anggota keluarga — tampil & (master) ubah field lengkap. */
export function MemberDetailModal({ member, isMaster, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    if (!member) return;
    setForm({
      nickname: member.nickname || '',
      phone: member.phone || '',
      birth_date: member.birthDate || '',
      blood: member.blood || '',
      allergy: member.allergy || '',
      address: member.address || '',
      instagram: member.instagram || '',
      facebook: member.facebook || '',
      tiktok: member.tiktok || '',
      twitter: member.twitter || '',
      youtube: member.youtube || '',
      bank_name: member.bank_name || '',
      bank_account: member.bank_account || '',
      nik: member.nik || '',
    });
    setError('');
  }, [member]);

  if (!member) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canEdit = isMaster;
  const birth = formatBirthDate(member.birthDate);
  const initials = member.initials || '?';

  const save = async () => {
    if (!canEdit) { onClose?.(); return; }
    setSaving(true);
    setError('');
    try {
      await auth.updateMember(member.id, {
        nickname: form.nickname || null,
        phone: form.phone || null,
        birth_date: form.birth_date || null,
        blood: form.blood || null,
        allergy: form.allergy || null,
        address: form.address || null,
        instagram: form.instagram || null,
        facebook: form.facebook || null,
        tiktok: form.tiktok || null,
        twitter: form.twitter || null,
        youtube: form.youtube || null,
        bank_name: form.bank_name || null,
        bank_account: form.bank_account || null,
        nik: form.nik || null,
      });
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError('Gagal menyimpan: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto" role="dialog" aria-modal="true" aria-label={`Detail ${member.name}`}>
      <button type="button" aria-label="Tutup" onClick={onClose} className="fixed inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm" />
      <div ref={panelRef} className="relative mx-auto mt-6 mb-6 w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-3xl border border-line bg-surface/95 p-5 shadow-pop backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-brand/25 bg-brandtint text-lg font-bold text-brandfg" aria-hidden="true">
              {member.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover" /> : initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink">{member.name}</p>
              {member.nickname && <p className="truncate text-xs text-mutedfg">{member.nickname}</p>}
              <span className="mt-1 inline-block rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mutedfg">{member.role}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink">
            <Icon name="close" size={18} />
          </button>
        </div>

        {form && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-mutedfg">Panggilan</label>
                <input value={form.nickname} onChange={set('nickname')} disabled={!canEdit} className="input-field w-full rounded-xl border border-line bg-canvas px-3 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-mutedfg">No. Telp</label>
                <input value={form.phone} onChange={set('phone')} disabled={!canEdit} inputMode="tel" className="input-field w-full rounded-xl border border-line bg-canvas px-3 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-mutedfg">Tanggal lahir</label>
                <input type="date" value={form.birth_date} onChange={set('birth_date')} disabled={!canEdit} className="input-field w-full rounded-xl border border-line bg-canvas px-3 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-mutedfg">Gol. Darah</label>
                <input value={form.blood} onChange={set('blood')} disabled={!canEdit} placeholder="mis. O+" className="input-field w-full rounded-xl border border-line bg-canvas px-3 text-sm" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-mutedfg">Alergi / Pantangan</label>
              <input value={form.allergy} onChange={set('allergy')} disabled={!canEdit} placeholder="mis. kacang, udang" className="input-field w-full rounded-xl border border-line bg-canvas px-3 text-sm" />
            </div>
            <p className="pt-1 text-[10px] font-semibold uppercase text-mutedfg">Identitas</p>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-mutedfg">NIK (KTP)</label>
              <input value={form.nik} onChange={set('nik')} disabled={!canEdit} inputMode="numeric" maxLength={16} placeholder="3271xxxxxxxxxx" className="input-field w-full rounded-xl border border-line bg-canvas px-3 text-sm font-mono" />
            </div>

            <p className="pt-1 text-[10px] font-semibold uppercase text-mutedfg">Sosial Media</p>
            <div className="grid grid-cols-2 gap-2">
              {[['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['twitter', 'X (Twitter)'], ['youtube', 'YouTube']].map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-mutedfg">{label}</label>
                  <input value={form[key]} onChange={set(key)} disabled={!canEdit} placeholder="@handle" className="input-field w-full rounded-xl border border-line bg-canvas px-3 text-sm" />
                </div>
              ))}
            </div>

            <p className="pt-1 text-[10px] font-semibold uppercase text-mutedfg">Rekening</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-mutedfg">Bank</label>
                <input value={form.bank_name} onChange={set('bank_name')} disabled={!canEdit} placeholder="mis. BCA" className="input-field w-full rounded-xl border border-line bg-canvas px-3 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-mutedfg">No. Rekening</label>
                <input value={form.bank_account} onChange={set('bank_account')} disabled={!canEdit} placeholder="1234567890" className="input-field w-full rounded-xl border border-line bg-canvas px-3 text-sm" />
              </div>
            </div>

            {error && <p className="text-xs font-medium text-danger">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={onClose} className="rounded-xl border border-line px-3 py-1.5 text-sm font-semibold text-mutedfg hover:bg-muted hover:text-ink">Tutup</button>
              {canEdit && (
                <button type="button" onClick={save} disabled={saving} className={CTA_CLASS}>
                  {saving ? 'Menyimpan…' : 'Simpan'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default MemberDetailModal;
