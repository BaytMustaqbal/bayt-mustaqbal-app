import React, { useState } from 'react';
import { Icon } from './Icon';

/* ============================================================================
   FamilyTree — diagram silsilah keluarga 3 tingkat.

   Data: daftar anggota (dari akun backend) dengan field:
     { id, name, role, initials, avatar, generasi, birthDate }
     - role     : label status (Suami / Istri / Anak / Lainnya)
     - generasi : posisi di pohon ('orangtua' | 'anak' | 'cucu')
     - birthDate: ISO YYYY-MM-DD atau null

   Level 1 (Orangtua): Suami kiri — pill ♥ Orangtua — Istri kanan
   Level 2 (Anak)   : grid di bawah
   Level 3 (Cucu)   : grid di bawah

   Level kosong → placeholder garis putus + tombol "+" (kalau master).
   Klik kotak → panel detail inline expand (info yang tersedia di DB).
   ============================================================================ */

const LABEL_GENERASI = { orangtua: 'Orangtua', anak: 'Anak', cucu: 'Cucu' };

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/* ISO YYYY-MM-DD → "12 Mei 1990". Null/invalid/tanggal tak nyata → null (baris disembunyikan). */
export function formatBirthDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Cek tanggal benar-benar ada (mis. 31 Februari → null)
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${d} ${BULAN[m - 1]} ${y}`;
}

function MemberBox({ member, onSelect }) {
  const [open, setOpen] = useState(false);
  const birth = formatBirthDate(member.birthDate);

  return (
    <button
      type="button"
      onClick={() => { setOpen((v) => !v); onSelect?.(member); }}
      aria-expanded={open}
      className="flex w-full flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-center shadow-e1 transition-colors hover:border-brand/30 sm:p-5"
    >
      <span
        className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-brand/25 bg-brandtint text-sm font-bold text-brandfg sm:h-16 sm:w-16"
        aria-hidden="true"
      >
        {member.avatar
          ? <img src={member.avatar} alt="" className="h-full w-full object-cover" />
          : (member.initials || '?')}
      </span>
      {/* w-full + break-words: nama panjang mengikuti lebar kartu dan
          membungkus (bukan terpotong/keluar kartu). items-center di atas
          membuat anak flex menyusut sesuai isi — w-full menegaskannya. */}
      <span className="w-full min-w-0">
        <span className="block break-words font-semibold text-ink">{member.nickname || member.name}</span>
        {member.nickname && member.nickname !== member.name && (
          <span className="mt-0.5 block break-words text-[11px] text-mutedfg">{member.name}</span>
        )}
        <span className="mt-1 block">
          <span className="inline-block rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mutedfg">
            {member.role}
          </span>
        </span>
        {birth && <span className="mt-1.5 block text-[11px] text-mutedfg">{birth}</span>}
      </span>

      {open && (
        <span className="mt-1 w-full space-y-1 border-t border-line pt-2 text-left text-[11px] text-mutedfg">
          <span className="block break-words">Nama: {member.name}</span>
          {member.nickname && <span className="block break-words">Panggilan: {member.nickname}</span>}
          <span className="block break-words">Email: {member.email || '—'}</span>
          <span className="block">Status: {member.role} · Posisi: {LABEL_GENERASI[member.generasi] || 'Orangtua'}</span>
          <span className="block">Tanggal lahir: {birth || 'belum diisi'}</span>
        </span>
      )}
    </button>
  );
}

function AddPlaceholder({ generasi, isMaster, onAdd }) {
  if (isMaster) {
    return (
      <button
        type="button"
        onClick={() => onAdd?.(generasi)}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-center text-mutedfg transition-colors hover:border-brand/30 hover:text-brandfg"
      >
        <Icon name="plus" size={20} />
        <span className="text-xs font-medium">Tambah {LABEL_GENERASI[generasi] || 'anggota'}</span>
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-center text-mutedfg">
      <span className="text-xs font-medium">Belum ada data {LABEL_GENERASI[generasi] || 'anggota'}</span>
      <span className="text-[11px]">Hanya akun master yang bisa menambah anggota.</span>
    </div>
  );
}

function LevelSection({ generasi, members, isMaster, onAdd, onSelect }) {
  const items = members || [];
  const empty = items.length === 0;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-mutedfg">
        <Icon name="users" size={16} />
        {LABEL_GENERASI[generasi] || generasi}
        <span className="ml-auto font-mono text-xs font-normal opacity-70">{items.length}</span>
      </h2>
      {empty ? (
        <AddPlaceholder generasi={generasi} isMaster={isMaster} onAdd={onAdd} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <MemberBox key={m.id} member={m} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
}

export function FamilyTree({ members = [], isMaster = false, onAdd = () => {}, onSelect = () => {} }) {
  const orantua = members.filter((m) => (m.generasi || 'orangtua') === 'orangtua');
  const anak = members.filter((m) => m.generasi === 'anak');
  const cucu = members.filter((m) => m.generasi === 'cucu');

  // "Kepala Keluarga" = posisi Suami di pohon (nama peran berubah, posisinya
  // tetap di kiri) — keduanya dicarikan supaya tak jatuh ke grid "lainnya".
  const suami = orantua.find((m) => m.role === 'Suami' || m.role === 'Kepala Keluarga');
  const istri = orantua.find((m) => m.role === 'Istri');
  const orantuaLain = orantua.filter((m) => m !== suami && m !== istri);

  return (
    <div className="space-y-8">
      {/* ---------- Level 1: Orangtua ---------- */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-mutedfg">
          <Icon name="users" size={16} />
          Orangtua
          <span className="ml-auto font-mono text-xs font-normal opacity-70">{orantua.length}</span>
        </h2>

        {orantua.length === 0 ? (
          <AddPlaceholder generasi="orangtua" isMaster={isMaster} onAdd={onAdd} />
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            {/* Kiri: Suami */}
            <div className="flex justify-center">
              {suami
                ? <div className="w-full max-w-[220px]"><MemberBox member={suami} onSelect={onSelect} /></div>
                : null}
            </div>

            {/* Tengah: pill penghubung ♥ Orangtua + garis horizontal */}
            <div className="flex items-center justify-center gap-2 self-center py-2 sm:py-8" aria-hidden="true">
              <span className="hidden h-px w-8 bg-line sm:block" />
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 text-[11px] font-semibold text-mutedfg shadow-e1">
                <Icon name="heart" size={13} className="text-brandfg" />
                Orangtua
              </span>
              <span className="hidden h-px w-8 bg-line sm:block" />
            </div>

            {/* Kanan: Istri */}
            <div className="flex justify-center">
              {istri
                ? <div className="w-full max-w-[220px]"><MemberBox member={istri} onSelect={onSelect} /></div>
                : null}
            </div>
          </div>
        )}

        {/* Anggota orantua lain (role 'Lainnya') */}
        {orantuaLain.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {orantuaLain.map((m) => (
              <MemberBox key={m.id} member={m} onSelect={onSelect} />
            ))}
          </div>
        )}

        {/* Garis penghubung turun ke level 2 */}
        {orantua.length > 0 && (
          <>
            <div className="mx-auto mt-1 h-6 w-px bg-line" aria-hidden="true" />
            <div className="mx-auto h-px w-full max-w-md bg-line" aria-hidden="true" />
          </>
        )}
      </section>

      {/* ---------- Level 2 & 3 ---------- */}
      <LevelSection generasi="anak" members={anak} isMaster={isMaster} onAdd={onAdd} onSelect={onSelect} />
      <LevelSection generasi="cucu" members={cucu} isMaster={isMaster} onAdd={onAdd} onSelect={onSelect} />
    </div>
  );
}
