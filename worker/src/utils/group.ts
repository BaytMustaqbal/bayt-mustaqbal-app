// Helper grup keluarga + hak tulis (dipakai semua route data bersama).
//
// Peran anggota grup: kepala_keluarga | suami | istri | anak | cucu.
// Yang boleh MENULIS data bersama: kepala_keluarga, suami, istri.
// anak & cucu = baca saja (read-only).

export const GROUP_WRITE_ROLES = ['kepala_keluarga', 'suami', 'istri'];

// Cek hak tulis dari context (groupRole di-set authMiddleware).
export function canWriteGroup(groupRole: string | null): boolean {
  return !!groupRole && GROUP_WRITE_ROLES.includes(groupRole);
}

// Filter WHERE untuk data bersama: milik grup; tanpa grup (akun lama /
// belum di-migrasi) jatuh kembali ke scope per-user supaya tak bocor.
// Pemanggil mengganti ? dengan nilai yang dikembalikan.
export function groupScope(groupId: string | null, userId: string): { sql: string; val: string } {
  if (groupId) return { sql: 'group_id = ?', val: groupId };
  return { sql: 'user_id = ?', val: userId };
}

// Jawaban 403 seragam untuk peran baca-saja.
export function forbiddenWrite() {
  return { ok: false, data: null, error: { code: 'FORBIDDEN', message: 'Peran Anda hanya boleh melihat data keluarga.' } };
}
