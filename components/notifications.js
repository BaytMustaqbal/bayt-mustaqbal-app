// Notifikasi turunan data — satu sumber kebenaran.
//
// Belum ada backend, jadi TIDAK ADA pesan yang "dikirim" dari luar: semua
// dihitung dari data yang sudah ada (anggaran, tugas, agenda, pengeluaran).
// Keuntungannya isi selalu ikut berubah saat data berubah — tidak pernah basi.
//
// Dipakai App (menghitung + menyimpan status "sudah dibaca") dan Navigation
// (lonceng di pojok kanan atas header).

import { getBudget } from './budget';

const pad = (n) => String(n).padStart(2, '0');

// Kunci tanggal lokal (YYYY-MM-DD) — hindari toISOString() yang memakai UTC.
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

// Selisih hari dari `today` ke `dateStr`: 0 = hari ini, 1 = besok, -1 = kemarin.
const daysUntil = (dateStr, today) => {
  const target = new Date(`${dateStr}T00:00:00`);
  const base = new Date(`${today}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target - base) / 86400000);
};

// "15 Okt" — cukup pendek untuk panel sempit.
const dayLabel = (dateStr) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(`${dateStr}T00:00:00`));

// Jarak yang masih dianggap "dekat" (memicu pengingat tugas / agenda).
const NEAR_DAYS = 3;
const AGENDA_WINDOW = 14;
// Pengeluaran satu item dianggap "besar" kalau menelan porsi anggaran segini.
const BIG_EXPENSE_SHARE = 20;

/* Susun daftar notifikasi dari data. Urutannya sudah dari yang paling perlu
   ditindak (anggaran → tugas → agenda → pengeluaran).

   `formatShort` = pemformat rupiah ringkas milik App ("Rp 4,7 jt"), sengaja
   dioper agar tidak ada rumus format yang digandakan di dua tempat.

   Setiap item: { id, tone, icon, title, message, target }.
   `id` stabil per keadaan (mis. per bulan / per tanggal) → dipakai menyimpan
   status "sudah dibaca"; kalau keadaannya berubah, id ikut berubah sehingga
   lonceng menyala lagi. `target` = tujuan saat item diketuk. */
export function buildNotifications(data, formatShort, now = new Date()) {
  if (!data) return [];
  const today = dayKey(now);
  const month = monthKey(now);
  const fmt = (v) => (typeof formatShort === 'function' ? formatShort(v) : String(v));
  const out = [];

  // ---- 1) Anggaran bulan ini: hanya bersuara kalau sudah mengkhawatirkan ----
  // Anggaran selalu lewat `getBudget` — sama seperti Dashboard & header
  // Keuangan — supaya snapshot lama (yang masih pakai `budget.total`) ikut
  // terbaca dan tidak ada sumber anggaran kedua.
  const budget = getBudget(data).income;
  const spent = (data.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const usedPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  if (budget > 0 && usedPct >= 100) {
    out.push({
      id: `anggaran-lewat:${month}`,
      tone: 'rose',
      icon: 'alertTriangle',
      title: 'Anggaran bulan ini terlewati',
      message: `Terpakai ${fmt(spent)} dari ${fmt(budget)} (${usedPct}%).`,
      target: { section: 'expenses', financeFilter: 'semua' },
    });
  } else if (budget > 0 && usedPct >= 80) {
    out.push({
      id: `anggaran-hampir:${month}`,
      tone: 'amber',
      icon: 'alertTriangle',
      title: 'Anggaran hampir habis',
      message: `Terpakai ${fmt(spent)} dari ${fmt(budget)} (${usedPct}%).`,
      target: { section: 'expenses', financeFilter: 'semua' },
    });
  }

  // ---- 2) Tugas: yang mendekati/melewati tenggat dulu, sisanya ringkasan ----
  const pending = (data.tasks || [])
    .filter((t) => !t.completed)
    .map((t) => ({ ...t, sisa: t.dueDate ? daysUntil(t.dueDate, today) : null }))
    .filter((t) => t.sisa !== null)
    .sort((a, b) => a.sisa - b.sisa);
  const nearDue = pending.filter((t) => t.sisa <= NEAR_DAYS);
  if (nearDue.length > 0) {
    const late = nearDue.filter((t) => t.sisa < 0);
    const soonest = nearDue[0];
    const kapan = soonest.sisa < 0 ? 'terlambat' : soonest.sisa === 0 ? 'hari ini' : `${soonest.sisa} hari lagi`;
    out.push({
      // Diikat ke tanggal: besok jadi "belum dibaca" lagi (pengingat harian).
      id: `tugas-jatuh:${today}`,
      tone: late.length > 0 ? 'rose' : 'amber',
      icon: 'tasks',
      title:
        late.length > 0
          ? `${late.length} tugas melewati jatuh tempo`
          : `${nearDue.length} tugas mendekati jatuh tempo`,
      message: `Terdekat: ${soonest.title} · ${dayLabel(soonest.dueDate)} (${kapan}).`,
      target: { section: 'agenda', mode: 'tugas', taskFilter: 'belum' },
    });
  } else if (pending.length > 0) {
    out.push({
      id: 'tugas-belum',
      tone: 'violet',
      icon: 'tasks',
      title: `${pending.length} tugas belum selesai`,
      message: 'Belum ada yang mendekati tenggat.',
      target: { section: 'agenda', mode: 'tugas', taskFilter: 'belum' },
    });
  }

  // ---- 3) Agenda terdekat dalam 2 pekan ----
  const upcoming = (data.schedule || [])
    .filter((s) => s.date)
    .map((s) => ({ ...s, sisa: daysUntil(s.date, today) }))
    .filter((s) => s.sisa !== null && s.sisa >= 0 && s.sisa <= AGENDA_WINDOW)
    .sort((a, b) => a.sisa - b.sisa || String(a.time || '').localeCompare(String(b.time || '')));
  if (upcoming.length > 0) {
    const next = upcoming[0];
    out.push({
      // Diikat ke item + tanggal: kalau agenda terdekat berganti, menyala lagi.
      id: `agenda-dekat:${next.id}:${today}`,
      tone: next.sisa === 0 ? 'amber' : 'blue',
      icon: 'calendar',
      title: next.sisa === 0 ? 'Agenda hari ini' : next.sisa === 1 ? 'Agenda besok' : 'Agenda terdekat',
      message: `${next.title} · ${dayLabel(next.date)}, ${next.time || '-'}`,
      target: { section: 'agenda', mode: 'jadwal', agendaFilter: next.category || 'semua' },
    });
  }

  // ---- 4) Pengeluaran terbesar bulan ini (kalau porsinya besar) ----
  const expenses = data.expenses || [];
  const biggest = expenses.reduce(
    (max, e) => ((Number(e.amount) || 0) > (Number(max?.amount) || 0) ? e : max),
    null
  );
  const share =
    budget > 0 && biggest ? Math.round(((Number(biggest.amount) || 0) / budget) * 100) : 0;
  if (biggest && share >= BIG_EXPENSE_SHARE) {
    out.push({
      id: `pengeluaran-besar:${month}:${biggest.id}`,
      tone: 'cyan',
      icon: 'wallet',
      title: 'Pengeluaran terbesar bulan ini',
      message: `${biggest.description} · ${fmt(biggest.amount)} (${share}% anggaran).`,
      target: { section: 'expenses', financeFilter: biggest.category || 'semua' },
    });
  }

  return out;
}
