import React, { useRef } from 'react';
import { Icon } from './Icon';
import { CTA_CLASS } from './ui';
import { formatBirthDate } from './FamilyTree';

/* Modal detail anggota keluarga — READ ONLY. Edit dilakukan di tab Akun. */
export function MemberDetailModal({ member, onClose }) {
  const panelRef = useRef(null);
  if (!member) return null;

  const birth = formatBirthDate(member.birthDate);
  const initials = member.initials || '?';

  const row = (label, value) => (
    <div key={label}>
      <p className="mb-0.5 text-[10px] font-semibold uppercase text-mutedfg">{label}</p>
      <p className="text-sm text-ink">{value || '—'}</p>
    </div>
  );

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

        <div className="grid grid-cols-2 gap-3">
          {row('Panggilan', member.nickname)}
          {row('No. Telp', member.phone)}
          {row('Tanggal lahir', birth)}
          {row('Gol. Darah', member.blood)}
        </div>

        <div className="mt-3">{row('NIK', member.nik)}</div>
        <div className="mt-3">{row('Alergi / Pantangan', member.allergy)}</div>

        <p className="mt-4 mb-1.5 text-[10px] font-semibold uppercase text-mutedfg">Sosial Media</p>
        <div className="grid grid-cols-2 gap-3">
          {row('Instagram', member.instagram)}
          {row('Facebook', member.facebook)}
          {row('TikTok', member.tiktok)}
          {row('X / Twitter', member.twitter)}
          {row('YouTube', member.youtube)}
        </div>

        <p className="mt-4 mb-1.5 text-[10px] font-semibold uppercase text-mutedfg">Rekening</p>
        <div className="grid grid-cols-2 gap-3">
          {row('Bank', member.bank_name)}
          {row('No. Rekening', member.bank_account)}
        </div>

        <button type="button" onClick={onClose} className={`${CTA_CLASS} w-full mt-5`}>Tutup</button>
      </div>
    </div>
  );
}
export default MemberDetailModal;
