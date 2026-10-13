import React from 'react';
import { Card, Badge, CARD_INTERACTIVE } from './ui';

/* Usia dari tanggal lahir (YYYY-MM-DD) per hari ini. Dihitung saat render
   supaya tidak pernah basi (tidak disimpan sebagai angka). */
const ageOf = (birthDate) => {
  if (!birthDate) return null;
  const b = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age;
};

/* "12 Mei 1990" — tanggal lahir dibaca lengkap, bukan angka mentah. */
const longDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
};

/* Kartu profil anggota: data diri yang stabil (bukan jadwal/biaya — itu modul
   lain). Tiap baris `<p>` bertumpuk, jadi tetap terbaca di kartu sempit 320px. */
export function FamilyMemberCard({ member }) {
  const isActive = member.status === 'active';
  const age = ageOf(member.birthDate);
  const rows = [
    ['Lahir', `${longDate(member.birthDate)}${age !== null ? ` · ${age} th` : ''}`],
    ['Gol. darah', member.blood || '—'],
    ['Alergi', member.allergy || '—'],
    ['WA', member.phone || '—'],
  ];

  return (
    <Card className={`p-4 text-center ${CARD_INTERACTIVE} hover:border-brand sm:p-5`}>
      <span
        className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-brand/25 bg-brandtint text-base font-bold text-brandfg sm:h-16 sm:w-16 sm:text-lg"
        aria-hidden="true"
      >
        {member.initials}
      </span>
      <h2 className="mt-2.5 truncate font-semibold text-ink sm:mt-3">{member.name}</h2>
      <p className="truncate text-sm text-mutedfg">{member.role}</p>
      <div className="mt-3 flex justify-center">
        <Badge tone={isActive ? 'green' : 'gray'}>
          {isActive ? 'Aktif' : 'Tidak aktif'}
        </Badge>
      </div>
      <dl className="mt-3.5 space-y-1 border-t border-line pt-3 text-left text-xs sm:mt-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-2">
            <dt className="shrink-0 text-mutedfg">{label}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
