import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from './components/Icon';
import { Navigation } from './components/Navigation';
import { ScheduleItem } from './components/ScheduleItem';
import { FamilyMemberCard } from './components/FamilyMemberCard';
import { TaskList } from './components/TaskList';
import { NoteList } from './components/NoteList';
import { Dashboard } from './components/Dashboard';
import { WelcomeGate } from './components/WelcomeGate';
import { AccountModal } from './components/AccountModal';
import { Card, SectionHeader, EmptyState, ExpenseCard, FamilyList, initialsOf } from './components/ui';
import { FamilyCalendar } from './components/Calendar';
import { Timeline } from './components/Timeline';
import { FormSheet } from './components/FormSheet';
import { Toast } from './components/Toast';
import { buildNotifications } from './components/notifications';
import {
  AGENDA_CATEGORIES,
  FINANCE_CATEGORIES,
  FAMILY_CATEGORIES,
  TASK_FILTERS,
  NOTE_CATEGORIES,
  NOTES_FILTERS,
  countByCategory,
  countByTaskFilter,
} from './components/categories';
import './App.css';

// Data contoh (sementara, sampai backend Worker + D1 siap)
const mockData = {
  users: [
    { id: 'kakang', name: 'Rezki YT', role: 'Admin', initials: 'RY' },
    { id: 'istri', name: 'Hilda AK', role: 'Anggota', initials: 'HA' },
  ],
  family: [
    { id: 1, name: 'Rezki YT', role: 'Admin', initials: 'RY', status: 'active' },
    { id: 2, name: 'Hilda AK', role: 'Anggota', initials: 'HA', status: 'active' },
    { id: 3, name: 'RAGASUCI', role: 'Anggota', initials: 'RS', status: 'active' },
    { id: 4, name: 'RAJABRANA', role: 'Anggota', initials: 'RB', status: 'active' },
  ],
  schedule: [
    // Keluarga — kegiatan bersama
    { id: 1, title: 'Makan Malam Keluarga', time: '19:00', date: '2026-10-15', member: 'Rezki YT', category: 'keluarga' },
    { id: 2, title: 'Arisan Keluarga Besar', time: '18:30', date: '2026-10-22', member: 'Hilda AK', category: 'keluarga' },
    // Anak — sekolah, les & kegiatan anak
    { id: 3, title: 'Rapat Wali Murid', time: '14:00', date: '2026-10-16', member: 'Hilda AK', category: 'anak' },
    { id: 4, title: 'Les Musik Anak', time: '16:00', date: '2026-10-18', member: 'RAGASUCI', category: 'anak' },
    { id: 5, title: 'Olahraga Pagi Anak', time: '06:30', date: '2026-10-19', member: 'RAJABRANA', category: 'anak' },
    // Ibadah — pengajian, zakat & hari besar
    { id: 6, title: 'Pengajian Rutin Keluarga', time: '19:30', date: '2026-10-17', member: 'Keluarga', category: 'ibadah' },
    { id: 7, title: 'Donasi & Zakat Bulanan', time: '10:00', date: '2026-10-26', member: 'Keluarga', category: 'ibadah' },
    // Kesehatan — periksa & imunisasi (sinkron data sub-bagian Keluarga)
    { id: 8, title: 'Imunisasi lanjutan (RAGASUCI)', time: '09:00', date: '2026-11-02', member: 'Hilda AK', category: 'kesehatan' },
    { id: 9, title: 'Kontrol gigi', time: '15:30', date: '2026-10-25', member: 'Hilda AK', category: 'kesehatan' },
    // Rumah Tangga — kebersihan, belanja & perbaikan
    { id: 10, title: 'Kebersihan Rumah Akhir Pekan', time: '08:00', date: '2026-10-24', member: 'Keluarga', category: 'rumahtangga' },
    { id: 11, title: 'Perbaikan wastafel kamar mandi', time: '09:30', date: '2026-10-18', member: 'Rezki YT', category: 'rumahtangga' },
    // Kendaraan — servis & perawatan motor/mobil
    { id: 12, title: 'Service Motor', time: '09:00', date: '2026-10-17', member: 'Rezki YT', category: 'kendaraan' },
    { id: 13, title: 'Servis Rutin (ganti oli & filter)', time: '10:30', date: '2026-10-20', member: 'Rezki YT', category: 'kendaraan' },
  ],
  familyHealth: [
    { id: 1, title: 'Imunisasi lanjutan', meta: 'RAGASUCI · Puskesmas · 2026-11-02', badge: 'Jadwal', tone: 'brand' },
    { id: 2, title: 'Cek tinggi & berat badan', meta: 'RAGASUCI & RAJABRANA · 2026-10-20', badge: 'Jadwal', tone: 'brand' },
    { id: 3, title: 'Kontrol gigi', meta: 'Hilda AK · 2026-10-25', badge: 'Jadwal', tone: 'brand' },
    { id: 4, title: 'Vitamin & suplemen', meta: 'Semua anggota · rutin', badge: 'Rutin', tone: 'green' },
  ],
  familyEducation: [
    { id: 1, title: 'SPP & uang sekolah', meta: 'RAGASUCI · sudah dibayar', badge: 'Selesai', tone: 'green' },
    { id: 2, title: 'Les musik', meta: 'RAJABRANA · Sabtu 15:00', badge: 'Rutin', tone: 'green' },
    { id: 3, title: 'Rapat wali murid', meta: 'Hilda AK · 2026-10-16', badge: 'Jadwal', tone: 'brand' },
    { id: 4, title: 'Buku bacaan & PR', meta: 'RAGASUCI · Jumat sore', badge: 'Rutin', tone: 'green' },
  ],
  familyContacts: [
    { id: 1, title: 'Puskesmas', meta: '0812-3456-7890', badge: 'Darurat', tone: 'red' },
    { id: 2, title: 'Rumah Sakit Ibu & Anak', meta: '021-555-0199', badge: 'Darurat', tone: 'red' },
    { id: 3, title: 'Kakek & Nenek', meta: '0813-9876-5432' },
    { id: 4, title: 'Golongan darah', meta: 'Rezki YT: O · Hilda AK: A · Anak: B', badge: 'Catatan', tone: 'brand' },
  ],
  expenses: [
    { id: 1, category: 'belanja', description: 'Belanja kebutuhan dapur', amount: 1250000, date: '2026-10-14' },
    { id: 2, category: 'utilitas', description: 'Tagihan listrik & air', amount: 480000, date: '2026-10-13' },
    { id: 3, category: 'pendidikan', description: 'SPP sekolah', amount: 750000, date: '2026-10-12' },
    { id: 4, category: 'transportasi', description: 'Bensin & tol', amount: 300000, date: '2026-10-11' },
    { id: 5, category: 'utilitas', description: 'Internet & pulsa', amount: 280000, date: '2026-10-10' },
    { id: 6, category: 'ibadah', description: 'Zakat & infak', amount: 500000, date: '2026-10-09' },
    { id: 7, category: 'kesehatan', description: 'Obat & vitamin keluarga', amount: 150000, date: '2026-10-08' },
    { id: 8, category: 'belanja', description: 'Makan siang keluarga', amount: 350000, date: '2026-10-07' },
    { id: 9, category: 'pendidikan', description: 'Perlengkapan sekolah', amount: 200000, date: '2026-10-06' },
    { id: 10, category: 'transportasi', description: 'Servis motor', amount: 450000, date: '2026-10-05' },
  ],
  tasks: [
    { id: 1, title: 'Bersihkan dapur', completed: false, assignedTo: 'RAGASUCI', dueDate: '2026-10-15', priority: 'high' },
    { id: 2, title: 'Cuci mobil', completed: true, assignedTo: 'RAJABRANA', dueDate: '2026-10-14', priority: 'medium' },
    { id: 3, title: 'Belanja mingguan', completed: false, assignedTo: 'Hilda AK', dueDate: '2026-10-16', priority: 'high' },
    { id: 4, title: 'Baca buku anak', completed: true, assignedTo: 'Rezki YT', dueDate: '2026-10-14', priority: 'low' },
    { id: 5, title: 'Ganti oli motor', completed: false, assignedTo: 'Rezki YT', dueDate: '2026-10-18', priority: 'medium' },
    { id: 6, title: 'Strika seragam sekolah', completed: false, assignedTo: 'Hilda AK', dueDate: '2026-10-19', priority: 'low' },
    { id: 7, title: 'Potong rumput halaman', completed: false, assignedTo: 'RAJABRANA', dueDate: '2026-10-21', priority: 'medium' },
    { id: 8, title: 'Periksa tagihan listrik', completed: true, assignedTo: 'Rezki YT', dueDate: '2026-10-20', priority: 'high' },
  ],
  // Catatan keluarga — pin (pinned) menandai catatan penting.
  notes: [
    {
      id: 1,
      title: 'Kode & ukuran penting',
      body: 'WiFi rumah: BaytMustaqbal2026 · Kunci cadangan di laci meja kerja · Filter air ukuran 10 inci.',
      category: 'rumah',
      pinned: true,
      author: 'Rezki YT',
      updatedAt: '2026-10-10',
    },
    {
      id: 2,
      title: 'Daftar belanja mingguan',
      body: 'Beras 5 kg, minyak goreng 2 L, telur 1 kg, sabun cuci, sampo anak.',
      category: 'belanja',
      pinned: false,
      author: 'Hilda AK',
      updatedAt: '2026-10-11',
    },
    {
      id: 3,
      title: 'Resep sambal andalan',
      body: 'Cabai merah 250 g, bawang merah 6, terasi 1 sdt, gula & garam. Tumis ±5 menit.',
      category: 'dapur',
      pinned: true,
      author: 'Hilda AK',
      updatedAt: '2026-10-08',
    },
    {
      id: 4,
      title: 'Jadwal servis alat rumah',
      body: 'Cuci AC: Des & Jun · Ganti filter air: tiap 3 bulan · Servis motor: 2 bulan sekali.',
      category: 'rumah',
      pinned: false,
      author: 'Rezki YT',
      updatedAt: '2026-10-07',
    },
    {
      id: 5,
      title: 'Ide liburan akhir tahun',
      body: 'Candi Borobudur + kebun teh, atau pantai Anyer. Cek promo tiket bulan depan.',
      category: 'info',
      pinned: false,
      author: 'Rezki YT',
      updatedAt: '2026-10-06',
    },
    {
      id: 6,
      title: 'Obat & vitamin rutin',
      body: 'Vitamin D anak tiap pagi; paracetamol cadangan di kotak P3K dapur.',
      category: 'info',
      pinned: false,
      author: 'Hilda AK',
      updatedAt: '2026-10-05',
    },
    {
      id: 7,
      title: 'Bahan kue lebaran',
      body: 'Tepung 2 kg, mentega 500 g, keju, kismis, susu bubuk.',
      category: 'dapur',
      pinned: false,
      author: 'Hilda AK',
      updatedAt: '2026-10-04',
    },
    {
      id: 8,
      title: 'Kontak penting rumah',
      body: 'Tukang AC Pak Andi 0812-xxxx · PLN 123 · PDAM 0813-xxxx.',
      category: 'rumah',
      pinned: true,
      author: 'Rezki YT',
      updatedAt: '2026-10-03',
    },
  ],
  // --- Data analitik (dummy) ---
  // Anggaran & tren masih contoh: di D1 nanti ini dari tabel budget + expenses.
  budget: { total: 4500000, month: 'Oktober 2026' },
  monthlyTrend: [
    { label: 'Mei', value: 3120000 },
    { label: 'Jun', value: 2875000 },
    { label: 'Jul', value: 3410000 },
    { label: 'Agu', value: 2960000 },
    { label: 'Sep', value: 3620000 },
    { label: 'Okt', value: 2780000 },
  ],
  weekly: [
    { label: 'Sen', value: 95000 },
    { label: 'Sel', value: 120000 },
    { label: 'Rab', value: 60000 },
    { label: 'Kam', value: 180000 },
    { label: 'Jum', value: 240000 },
    { label: 'Sab', value: 420000 },
    { label: 'Min', value: 150000 },
  ],
  categories: [
    // Warna seri = token tema (bukan hex) supaya donut tetap terbaca di
    // mode terang maupun gelap. Diselesaikan CSS lewat inline `style`.
    { label: 'Belanja Bulanan', value: 1250000, color: 'rgb(var(--chart1))' },
    { label: 'Pendidikan', value: 750000, color: 'rgb(var(--chart2))' },
    { label: 'Listrik & Air', value: 480000, color: 'rgb(var(--chart3))' },
    { label: 'Transportasi', value: 300000, color: 'rgb(var(--chart4))' },
  ],
};

// ---- Konfigurasi form "Tambah" per section (dipakai FormSheet) ----
const MEMBER_PEOPLE = ['Rezki YT', 'Hilda AK', 'RAGASUCI', 'RAJABRANA'];
const MEMBER_ALL = [...MEMBER_PEOPLE, 'Keluarga'];
const memberOptions = (list) => list.map((m) => ({ value: m, label: m }));

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const catOptions = (cats) =>
  cats
    .filter((c) => c.id !== 'semua')
    .map((c) => ({ value: c.id, label: c.label }));

const SHEET_CONFIG = {
  agenda: {
    title: 'Tambah Agenda',
    icon: 'calendar',
    fields: [
      { key: 'title', label: 'Judul agenda', type: 'text', required: true, placeholder: 'contoh: Piknik Keluarga' },
      { key: 'date', label: 'Tanggal', type: 'date', required: true, defaultValue: todayKey() },
      { key: 'time', label: 'Jam', type: 'time', defaultValue: '08:00' },
      { key: 'category', label: 'Kategori', type: 'select', required: true, defaultValue: catOptions(AGENDA_CATEGORIES)[0].value, options: catOptions(AGENDA_CATEGORIES) },
      { key: 'member', label: 'Anggota', type: 'select', required: true, defaultValue: MEMBER_ALL[0], options: memberOptions(MEMBER_ALL) },
    ],
  },
  expenses: {
    title: 'Tambah Pengeluaran',
    icon: 'wallet',
    fields: [
      { key: 'description', label: 'Deskripsi', type: 'text', required: true, placeholder: 'contoh: Bahan masakan mingguan' },
      { key: 'amount', label: 'Nominal (Rp)', type: 'number', required: true, min: 0, placeholder: 'contoh: 150000' },
      { key: 'date', label: 'Tanggal', type: 'date', required: true, defaultValue: todayKey() },
      { key: 'category', label: 'Kategori', type: 'select', required: true, defaultValue: catOptions(FINANCE_CATEGORIES)[0].value, options: catOptions(FINANCE_CATEGORIES) },
    ],
  },
  tasks: {
    title: 'Tambah Tugas',
    icon: 'tasks',
    fields: [
      { key: 'title', label: 'Judul tugas', type: 'text', required: true, placeholder: 'contoh: Rapikan lemari' },
      { key: 'dueDate', label: 'Jatuh tempo', type: 'date', required: true, defaultValue: todayKey() },
      {
        key: 'priority',
        label: 'Prioritas',
        type: 'select',
        required: true,
        defaultValue: 'medium',
        options: [
          { value: 'high', label: 'Tinggi' },
          { value: 'medium', label: 'Sedang' },
          { value: 'low', label: 'Rendah' },
        ],
      },
      { key: 'assignedTo', label: 'Penanggung jawab', type: 'select', required: true, defaultValue: MEMBER_PEOPLE[0], options: memberOptions(MEMBER_PEOPLE) },
    ],
  },
  notes: {
    title: 'Tambah Catatan',
    icon: 'note',
    fields: [
      { key: 'title', label: 'Judul catatan', type: 'text', required: true, placeholder: 'contoh: Daftar belanja mingguan' },
      { key: 'body', label: 'Isi catatan', type: 'textarea', rows: 3, placeholder: 'tulis detail catatan di sini…' },
      { key: 'category', label: 'Kategori', type: 'select', required: true, defaultValue: 'info', options: catOptions(NOTE_CATEGORIES) },
      { key: 'pinned', label: 'Tandai penting', type: 'checkbox', help: 'Muncul di filter "Penting"' },
    ],
  },
  family: {
    title: 'Tambah ke Keluarga',
    icon: 'users',
    fields: [
      {
        key: 'bagian',
        label: 'Simpan ke bagian',
        type: 'select',
        required: true,
        defaultValue: 'anggota',
        options: [
          { value: 'anggota', label: 'Anggota keluarga' },
          { value: 'kesehatan', label: 'Kesehatan' },
          { value: 'pendidikan', label: 'Pendidikan Anak' },
          { value: 'kontak', label: 'Kontak & Darurat' },
        ],
      },
      { key: 'title', label: 'Nama / Judul', type: 'text', required: true, placeholder: 'nama anggota, jadwal, atau kontak' },
      { key: 'meta', label: 'Info singkat (opsional)', type: 'text', placeholder: 'contoh: Puskesmas · 0812-3456-7890' },
    ],
  },
};

// ---- Pemetaan section → kunci array data & label Indonesia ----------------
// Dipakai seragam oleh tambah / ubah / hapus agar App tidak penuh if-else.
const SECTION_KEY = { agenda: 'schedule', expenses: 'expenses', tasks: 'tasks', notes: 'notes' };
const SECTION_LABEL = { agenda: 'Agenda', expenses: 'Pengeluaran', tasks: 'Tugas', notes: 'Catatan', family: 'Keluarga' };
const sectionItemLabel = (item) => item.title || item.description || item.name || 'Item';

// Nilai awal form ubah: bentuknya persis seperti `values` yang dikirim FormSheet
// (angka dijadikan string agar cocok dengan <input type="number">).
const toFormValues = (section, item) => {
  if (section === 'agenda') {
    return { title: item.title, date: item.date, time: item.time, category: item.category, member: item.member };
  }
  if (section === 'expenses') {
    return { description: item.description, amount: String(item.amount ?? ''), date: item.date, category: item.category };
  }
  if (section === 'tasks') {
    return { title: item.title, dueDate: item.dueDate, priority: item.priority, assignedTo: item.assignedTo };
  }
  if (section === 'notes') {
    return { title: item.title, body: item.body || '', category: item.category, pinned: !!item.pinned };
  }
  return {};
};

// Kunci localStorage untuk snapshot data (seed awal = mockData).
const STORAGE_KEY = 'bayt-mustaqbal-data-v1';
const loadInitialData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const valid =
        parsed &&
        Array.isArray(parsed.users) &&
        parsed.users.length > 0 &&
        Array.isArray(parsed.schedule) &&
        Array.isArray(parsed.tasks) &&
        Array.isArray(parsed.expenses) &&
        Array.isArray(parsed.family);
      if (valid) {
        // Gabung dengan seed: snapshot lama (tanpa `notes`) tetap jalan,
        // kunci baru otomatis terisi dari data contoh.
        const merged = { ...mockData, ...parsed };
        if (!Array.isArray(merged.notes)) merged.notes = mockData.notes;
        return merged;
      }
    }
  } catch (e) {
    /* storage rusak/unavailable → pakai data contoh */
  }
  return mockData;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

// Versi ringkas untuk KPI & label chart: 2.780.000 → "Rp 2,8 jt"
const formatCurrencyShort = (value) => {
  const n = Number(value) || 0;
  const short = (v, unit) => `Rp ${v.toFixed(1).replace('.', ',').replace(',0', '')} ${unit}`;
  if (n >= 1_000_000_000) return short(n / 1_000_000_000, 'M');
  if (n >= 1_000_000) return short(n / 1_000_000, 'jt');
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)} rb`;
  return formatCurrency(n);
};

const USER_STORAGE_KEY = 'bm-user';

// localStorage bisa dilarang (mode privat) → jangan sampai app gagal render
const readStoredUser = () => {
  try {
    return localStorage.getItem(USER_STORAGE_KEY) || 'kakang';
  } catch {
    return 'kakang';
  }
};

const storeUser = (userId) => {
  try {
    localStorage.setItem(USER_STORAGE_KEY, userId);
  } catch {
    /* diabaikan */
  }
};

// Status "sudah dibaca" notifikasi — kunci terpisah dari snapshot data karena
// ini keadaan tampilan, bukan data keluarga. Isinya daftar `id` notifikasi.
const NOTIF_STORAGE_KEY = 'bayt-mustaqbal-notif-read-v1';

const readNotifRead = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const storeNotifRead = (ids) => {
  try {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* diabaikan */
  }
};

/* ---------- Tema terang/gelap ----------
   Pilihan pengguna: 'system' | 'light' | 'dark' (kunci terpisah dari snapshot
   data karena ini preferensi tampilan). Skrip "anti-kedip" di index.html
   membaca kunci yang sama SEBELUM React jalan. */
const THEME_STORAGE_KEY = 'bm-theme';
const THEMES = ['system', 'light', 'dark'];
const LIGHT_MEDIA = '(prefers-color-scheme: light)';

const readStoredTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

/* Perangkat sedang memakai tema terang? (kalau API tak ada → anggap gelap) */
const systemPrefersLight = () => {
  try {
    return window.matchMedia(LIGHT_MEDIA).matches;
  } catch {
    return false;
  }
};

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeUserId, setActiveUserId] = useState(readStoredUser);
  // Gerbang welcome muncul SETIAP app dibuka (keputusan Kakang).
  // Saat backend siap, state ini tinggal ditukar jadi status login.
  const [entered, setEntered] = useState(false);
  // Filter kategori agenda (default: semua) — sinkron antara dropdown nav & chip di section
  const [agendaFilter, setAgendaFilter] = useState('semua');
  // Sub-tampilan Agenda: jadwal (daftar) | tugas | kalender keluarga
  const [agendaMode, setAgendaMode] = useState('jadwal');
  // Filter kategori pengeluaran (default: semua) — pola sama dengan agenda
  const [financeFilter, setFinanceFilter] = useState('semua');
  // Filter bagian keluarga (default: semua) — pola sama dengan agenda & keuangan
  const [familyFilter, setFamilyFilter] = useState('semua');
  // Filter tugas: status (semua/belum/selesai) & prioritas (tinggi/sedang/rendah)
  const [taskFilter, setTaskFilter] = useState('semua');
  // Filter catatan: semua | penting (disematkan) | kategori
  const [noteFilter, setNoteFilter] = useState('semua');
  // Pencarian catatan (judul + isi) — hanya berlaku di tab Catatan
  const [noteQuery, setNoteQuery] = useState('');
  // Notifikasi ringkas + tombol "Urungkan" (undo hapus)
  const [toast, setToast] = useState(null);
  // Notifikasi belum dibaca: daftar `id` yang sudah dilihat (tersimpan)
  const [notifRead, setNotifRead] = useState(readNotifRead);
  // Modal "Akun saya" (nama, username, avatar, password) — dibuka dari chip pengguna
  const [accountOpen, setAccountOpen] = useState(false);
  // Tema: pilihan pengguna ('system' | 'light' | 'dark') + preferensi perangkat.
  // Tema yang benar-benar dipakai = hasil resolusi keduanya.
  const [theme, setTheme] = useState(readStoredTheme);
  const [systemLight, setSystemLight] = useState(systemPrefersLight);
  const resolvedTheme = theme === 'system' ? (systemLight ? 'light' : 'dark') : theme;

  // Data dummy murni — belum terhubung ke backend/API apa pun.
  // Seed = mockData; setiap perubahan disimpan ke localStorage (snapshot),
  // jadi interaksi (tambah/ubah/hapus/toggle) tidak hilang saat reload.
  const [data, setData] = useState(loadInitialData);
  const currentUser = data.users.find((u) => u.id === activeUserId) || data.users[0];

  // dataRef menjaga snapshot terbaru untuk aksi yang berjalan belakangan
  // (mis. tombol "Urungkan" dari toast) tanpa closure basi.
  const dataRef = useRef(data);

  const persist = (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      /* kuota penuh / mode privat → abaikan, tetap jalan di memori */
    }
  };

  const saveData = (next) => {
    dataRef.current = next;
    setData(next);
    persist(next);
  };

  /* ---------- Tema ----------
     1) Terapkan tema yang sudah diresolusi ke elemen akar + meta warna browser.
        Atribut `data-theme` yang dipasang skrip di index.html ditimpa dengan
        nilai yang sama (idempoten), jadi tidak ada kedipan saat React mount.
     2) Simpan pilihan pengguna.
     3) Ikuti perubahan pengaturan perangkat selama pilihan = 'system'. */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', resolvedTheme === 'light' ? '#F2FAFD' : '#0A192F');
    const statusBar = document.getElementById('apple-status-style');
    if (statusBar) statusBar.setAttribute('content', resolvedTheme === 'light' ? 'default' : 'black');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      /* localStorage dilarang → tema tetap jalan untuk sesi ini */
    }
  }, [theme, resolvedTheme]);

  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia(LIGHT_MEDIA);
    } catch (e) {
      return undefined;
    }
    const onChange = (e) => setSystemLight(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Tombol tema di header: lompat ke kebalikan tema yang sedang terlihat
  // (dari 'system' pun jadi pilihan tegas light/dark — tidak membingungkan).
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  // Toast: tambah/ubah = konfirmasi singkat; hapus = tawarkan "Urungkan".
  const pushToast = (t) => setToast({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...t });
  const dismissToast = (id) => setToast((prev) => (prev && prev.id === id ? null : prev));

  // Toggle selesai tugas → disimpan (tidak hilang saat reload)
  const toggleTask = (taskId) => {
    saveData({
      ...dataRef.current,
      tasks: dataRef.current.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
    });
  };

  // Kembalikan data ke contoh awal (tombol di layar gerbang)
  const resetData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* abaikan */
    }
    dataRef.current = mockData;
    setData(mockData);
  };

  /* Simpan perubahan profil akun yang sedang aktif (nama, username, avatar,
     password). Inisial dihitung ulang dari nama supaya avatar cadangan ikut
     berubah. `password`: undefined = tidak diubah, '' = dihapus, string = baru. */
  const saveAccount = (patch) => {
    const current = dataRef.current;
    saveData({
      ...current,
      users: current.users.map((u) => {
        if (u.id !== activeUserId) return u;
        const next = {
          ...u,
          name: patch.name,
          username: patch.username,
          avatar: patch.avatar,
          initials: initialsOf(patch.name),
        };
        if (patch.password !== undefined) next.password = patch.password;
        return next;
      }),
    });
    pushToast({ message: 'Profil akun diperbarui', duration: 2500 });
  };

  // Tambah item sesuai section (dipanggil FormSheet)
  const addItem = (section, values) => {
    const id = Date.now();
    const current = dataRef.current;
    let next = current;
    if (section === 'agenda') {
      next = {
        ...current,
        schedule: [
          ...current.schedule,
          { id, title: values.title, date: values.date, time: values.time || '08:00', category: values.category, member: values.member },
        ],
      };
    } else if (section === 'expenses') {
      next = {
        ...current,
        expenses: [
          ...current.expenses,
          { id, description: values.description, amount: Number(values.amount) || 0, date: values.date, category: values.category },
        ],
      };
    } else if (section === 'tasks') {
      next = {
        ...current,
        tasks: [
          ...current.tasks,
          { id, title: values.title, dueDate: values.dueDate, priority: values.priority, assignedTo: values.assignedTo, completed: false },
        ],
      };
    } else if (section === 'notes') {
      next = {
        ...current,
        notes: [
          ...current.notes,
          {
            id,
            title: values.title,
            body: values.body || '',
            category: values.category,
            pinned: !!values.pinned,
            author: currentUser.name,
            updatedAt: todayKey(),
          },
        ],
      };
    } else if (section === 'family') {
      if (values.bagian === 'anggota') {
        const initials =
          values.title
            .split(/\s+/)
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';
        next = { ...current, family: [...current.family, { id, name: values.title, role: 'Anggota', initials, status: 'active' }] };
      } else {
        const entry = { id, title: values.title, meta: values.meta || '' };
        if (values.bagian === 'kesehatan') {
          next = { ...current, familyHealth: [...current.familyHealth, { ...entry, badge: 'Catatan', tone: 'gray' }] };
        } else if (values.bagian === 'pendidikan') {
          next = { ...current, familyEducation: [...current.familyEducation, { ...entry, badge: 'Catatan', tone: 'gray' }] };
        } else {
          next = { ...current, familyContacts: [...current.familyContacts, entry] };
        }
      }
    }
    saveData(next);
    pushToast({ message: `${SECTION_LABEL[section]} ditambahkan`, duration: 2500 });
  };

  // Ubah item yang sudah ada (mode edit FormSheet) — `completed`/`author` tetap.
  const updateItem = (section, id, values) => {
    const key = SECTION_KEY[section];
    const current = dataRef.current;
    const list = current[key] || [];
    const applyEdit = (item) => {
      if (section === 'agenda') {
        return { ...item, title: values.title, date: values.date, time: values.time || '08:00', category: values.category, member: values.member };
      }
      if (section === 'expenses') {
        return { ...item, description: values.description, amount: Number(values.amount) || 0, date: values.date, category: values.category };
      }
      if (section === 'tasks') {
        return { ...item, title: values.title, dueDate: values.dueDate, priority: values.priority, assignedTo: values.assignedTo };
      }
      if (section === 'notes') {
        return { ...item, title: values.title, body: values.body || '', category: values.category, pinned: !!values.pinned, updatedAt: todayKey() };
      }
      return item;
    };
    saveData({ ...current, [key]: list.map((it) => (it.id === id ? applyEdit(it) : it)) });
    pushToast({ message: `${SECTION_LABEL[section]} diperbarui`, duration: 2500 });
  };

  // Hapus item + tawarkan "Urungkan" (dipulihkan ke posisi semula).
  const deleteItem = (section, item) => {
    const key = SECTION_KEY[section];
    const list = dataRef.current[key] || [];
    const index = list.findIndex((it) => it.id === item.id);
    if (index < 0) return;
    saveData({ ...dataRef.current, [key]: list.filter((it) => it.id !== item.id) });
    pushToast({
      message: `"${sectionItemLabel(item)}" dihapus`,
      actionLabel: 'Urungkan',
      duration: 6000,
      onAction: () => {
        const restored = [...(dataRef.current[key] || [])];
        restored.splice(Math.min(index, restored.length), 0, item);
        saveData({ ...dataRef.current, [key]: restored });
      },
    });
  };

  // Bottom sheet "Tambah/Ubah" — null = tertutup, selain itu = kunci section.
  const [sheetOpen, setSheetOpen] = useState(null);
  // Mode ubah: { section, id } item yang sedang diedit + nilai awal formnya.
  const [editing, setEditing] = useState(null);
  const [sheetInitial, setSheetInitial] = useState(null);

  const openAdd = (section) => {
    setEditing(null);
    setSheetInitial(null);
    setSheetOpen(section);
  };
  const openEdit = (section, item) => {
    setEditing({ section, id: item.id });
    setSheetInitial(toFormValues(section, item));
    setSheetOpen(section);
  };
  const closeSheet = () => {
    setSheetOpen(null);
    setEditing(null);
    setSheetInitial(null);
  };

  // Kirim dari FormSheet: mode ubah → perbarui item, mode tambah → tambah baru.
  const submitSheet = (section, values) => {
    if (editing && editing.section === section) updateItem(section, editing.id, values);
    else addItem(section, values);
  };

  // Pantau status online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Gabungan semua catatan keluarga (tiap item diberi `category` = bagian).
  // Dipakai untuk badge jumlah di dropdown & chip filter bagan keluarga.
  const familyAll = useMemo(
    () => [
      ...data.family.map((m) => ({ ...m, category: 'anggota' })),
      ...data.familyHealth.map((h) => ({ ...h, category: 'kesehatan' })),
      ...data.familyEducation.map((e) => ({ ...e, category: 'pendidikan' })),
      ...data.familyContacts.map((c) => ({ ...c, category: 'kontak' })),
    ],
    [data]
  );

  // Tugas sesuai filter aktif (status/prioritas) untuk daftar & chip.
  const filteredTasks = useMemo(() => {
    if (taskFilter === 'semua') return data.tasks;
    if (taskFilter === 'belum') return data.tasks.filter((t) => !t.completed);
    if (taskFilter === 'selesai') return data.tasks.filter((t) => t.completed);
    return data.tasks.filter((t) => t.priority === taskFilter);
  }, [data, taskFilter]);

  // Catatan sesuai filter aktif (semua | penting | kategori) + pencarian.
  const filteredNotes = useMemo(() => {
    const base =
      noteFilter === 'semua'
        ? data.notes
        : noteFilter === 'penting'
          ? data.notes.filter((n) => n.pinned)
          : data.notes.filter((n) => n.category === noteFilter);
    const q = noteQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((n) => `${n.title} ${n.body || ''}`.toLowerCase().includes(q));
  }, [data, noteFilter, noteQuery]);

  // Notifikasi turunan data (tanpa backend) — lihat components/notifications.js.
  // Dihitung ulang tiap data berubah, jadi isinya ikut berubah, tidak basi.
  const notifications = useMemo(() => buildNotifications(data, formatCurrencyShort), [data]);

  // Simpan status "sudah dibaca" sekaligus buang id notifikasi yang sudah tidak
  // ada — supaya daftarnya tidak menumpuk selamanya di localStorage.
  const saveNotifRead = (ids) => {
    const alive = new Set(notifications.map((n) => n.id));
    const next = ids.filter((id) => alive.has(id));
    setNotifRead(next);
    storeNotifRead(next);
  };

  const markAllNotifRead = () => saveNotifRead(notifications.map((n) => n.id));

  // Ketuk notifikasi → tandai terbaca + lompat ke bagian terkait, dengan filter
  // ikut disetel supaya yang dimaksud langsung terlihat.
  const openNotification = (notif) => {
    saveNotifRead(notifRead.includes(notif.id) ? notifRead : [...notifRead, notif.id]);
    const t = notif.target || {};
    if (t.mode) setAgendaMode(t.mode);
    if (t.agendaFilter) setAgendaFilter(t.agendaFilter);
    if (t.taskFilter) setTaskFilter(t.taskFilter);
    if (t.financeFilter) setFinanceFilter(t.financeFilter);
    if (t.noteFilter) setNoteFilter(t.noteFilter);
    if (t.section) setActiveSection(t.section);
  };

  const handleEnter = (userId) => {
    storeUser(userId);
    setActiveUserId(userId);
    setActiveSection('dashboard');
    setEntered(true);
  };

  // Dipanggil dropdown kategori agenda di navigasi → buka section + set filter
  const handleAgendaSelect = (categoryId) => {
    setAgendaFilter(categoryId);
    setActiveSection('agenda');
  };

  // Dipanggil dropdown kategori keuangan di navigasi → buka section + set filter
  const handleFinanceSelect = (categoryId) => {
    setFinanceFilter(categoryId);
    setActiveSection('expenses');
  };

  // Dipanggil dropdown bagian keluarga di navigasi → buka section + set filter
  const handleFamilySelect = (categoryId) => {
    setFamilyFilter(categoryId);
    setActiveSection('family');
  };

  // Dipanggil dropdown catatan di navigasi → buka section + set filter
  const handleNoteSelect = (filterId) => {
    setNoteFilter(filterId);
    setActiveSection('notes');
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'agenda': {
        const activeMeta =
          AGENDA_CATEGORIES.find((c) => c.id === agendaFilter) || AGENDA_CATEGORIES[0];
        const filtered =
          agendaFilter === 'semua'
            ? data.schedule
            : data.schedule.filter((item) => item.category === agendaFilter);
        return (
          <section className="app-fade-in">
            <SectionHeader
              {...(agendaMode === 'tugas'
                ? (() => {
                    const taskMeta = TASK_FILTERS.find((c) => c.id === taskFilter) || TASK_FILTERS[0];
                    return {
                      icon: taskMeta.icon,
                      title: taskMeta.label,
                      subtitle: `${filteredTasks.length} dari ${data.tasks.length} tugas`,
                      actionLabel: 'Tambah',
                      onAction: () => openAdd('tasks'),
                    };
                  })()
                : agendaMode === 'timeline'
                  ? {
                      icon: 'activity',
                      title: 'Timeline Keluarga',
                      subtitle: 'Alur agenda, tugas, keuangan & catatan',
                    }
                  : {
                      icon: 'calendar',
                      title: activeMeta.label,
                      subtitle: `${filtered.length} dari ${data.schedule.length} jadwal`,
                      actionLabel: 'Tambah',
                      onAction: () => openAdd('agenda'),
                    })}
            />

            {/* Sub-tampilan Agenda: Jadwal | Tugas | Kalender | Timeline */}
            <div
              className="mb-5 grid grid-cols-4 gap-1 rounded-xl border border-line bg-surface p-1 sm:inline-flex"
              role="group"
              aria-label="Mode tampilan agenda"
            >
              <button
                type="button"
                onClick={() => setAgendaMode('jadwal')}
                aria-pressed={agendaMode === 'jadwal'}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
                  agendaMode === 'jadwal' ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:text-ink'
                }`}
              >
                <Icon name="clock" size={16} />
                Jadwal
              </button>
              <button
                type="button"
                onClick={() => setAgendaMode('tugas')}
                aria-pressed={agendaMode === 'tugas'}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
                  agendaMode === 'tugas' ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:text-ink'
                }`}
              >
                <Icon name="tasks" size={16} />
                Tugas
              </button>
              <button
                type="button"
                onClick={() => setAgendaMode('kalender')}
                aria-pressed={agendaMode === 'kalender'}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
                  agendaMode === 'kalender' ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:text-ink'
                }`}
              >
                <Icon name="calendar" size={16} />
                Kalender
              </button>
              <button
                type="button"
                onClick={() => setAgendaMode('timeline')}
                aria-pressed={agendaMode === 'timeline'}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
                  agendaMode === 'timeline' ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:text-ink'
                }`}
              >
                <Icon name="activity" size={16} />
                Timeline
              </button>
            </div>

            {agendaMode === 'tugas' ? (
              <>
                {/* Filter tugas — status & prioritas (chip di dalam sub-tampilan Tugas) */}
                <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter tugas">
                  {TASK_FILTERS.map((cat) => {
                    const active = taskFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setTaskFilter(cat.id)}
                        aria-pressed={active}
                        className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                          active
                            ? 'border-brand/50 bg-brandtint text-brandfg'
                            : 'border-line bg-surface text-mutedfg hover:bg-muted hover:text-ink'
                        }`}
                      >
                        <Icon name={cat.icon} size={16} />
                        {cat.label}
                        <span className="font-mono text-xs opacity-80">{countByTaskFilter(data.tasks, cat.id)}</span>
                      </button>
                    );
                  })}
                </div>
                {filteredTasks.length === 0 ? (
                  <EmptyState
                    icon="tasks"
                    title="Tidak ada tugas di filter ini"
                    message="Ubah filter (status/prioritas) atau tambahkan tugas baru."
                  />
                ) : (
                  <TaskList
                    tasks={filteredTasks}
                    onToggle={toggleTask}
                    onEdit={(item) => openEdit('tasks', item)}
                    onDelete={(item) => deleteItem('tasks', item)}
                  />
                )}
              </>
            ) : agendaMode === 'timeline' ? (
              <Timeline data={data} onEdit={openEdit} formatCurrency={formatCurrency} />
            ) : (
              <>
                {agendaMode === 'jadwal' ? (
                  filtered.length === 0 ? (
                    <EmptyState
                      icon="calendar"
                      title="Tidak ada agenda di kategori ini"
                      message="Pilih kategori lain, atau tambahkan agenda baru."
                    />
                  ) : (
                    <div className="stagger grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filtered.map((item) => (
                        <ScheduleItem
                          key={item.id}
                          item={item}
                          onEdit={(it) => openEdit('agenda', it)}
                          onDelete={(it) => deleteItem('agenda', it)}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <FamilyCalendar items={filtered} tasks={data.tasks} />
                )}
              </>
            )}
          </section>
        );
      }

      case 'expenses': {
        const activeMeta =
          FINANCE_CATEGORIES.find((c) => c.id === financeFilter) || FINANCE_CATEGORIES[0];
        const filtered =
          financeFilter === 'semua'
            ? data.expenses
            : data.expenses.filter((item) => item.category === financeFilter);
        const filteredTotal = filtered.reduce((sum, item) => sum + item.amount, 0);
        return (
          <section className="app-fade-in">
            <SectionHeader
              icon="wallet"
              title={activeMeta.label}
              subtitle={`Total: ${formatCurrency(filteredTotal)} · anggaran ${formatCurrencyShort(data.budget.total)}`}
              actionLabel="Tambah"
              actionTone="accent"
              onAction={() => openAdd('expenses')}
            />

            {filtered.length === 0 ? (
              <EmptyState
                icon="wallet"
                title="Tidak ada pengeluaran di kategori ini"
                message="Pilih kategori lain, atau catat pengeluaran baru."
              />
            ) : (
              <div className="stagger grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => (
                  <ExpenseCard
                    key={item.id}
                    item={item}
                    formatCurrency={formatCurrency}
                    onEdit={(it) => openEdit('expenses', it)}
                    onDelete={(it) => deleteItem('expenses', it)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      }

      case 'family': {
        const activeMeta = FAMILY_CATEGORIES.find((c) => c.id === familyFilter) || FAMILY_CATEGORIES[0];
        const showAnggota = familyFilter === 'semua' || familyFilter === 'anggota';
        const showKesehatan = familyFilter === 'semua' || familyFilter === 'kesehatan';
        const showPendidikan = familyFilter === 'semua' || familyFilter === 'pendidikan';
        const showKontak = familyFilter === 'semua' || familyFilter === 'kontak';
        const bagianCount = familyFilter === 'semua' ? familyAll.length : countByCategory(familyAll, familyFilter);
        return (
          <section className="app-fade-in">
            <SectionHeader
              icon="users"
              title={activeMeta.label}
              subtitle={`${bagianCount} catatan keluarga`}
              actionLabel="Tambah"
              onAction={() => openAdd('family')}
            />

            <div className="space-y-8">
              {showAnggota && (
                <div>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-mutedfg">
                    <Icon name="users" size={16} />
                    Anggota
                    <span className="ml-auto font-mono text-xs font-normal opacity-70">{data.family.length}</span>
                  </h2>
                  {data.family.length === 0 ? (
                    <EmptyState icon="users" title="Belum ada anggota" message="Tambahkan anggota keluarga untuk mulai berkolaborasi." />
                  ) : (
                    <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {data.family.map((member) => (
                        <FamilyMemberCard key={member.id} member={member} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {showKesehatan && <FamilyList title="Kesehatan" icon="activity" items={data.familyHealth} />}
              {showPendidikan && <FamilyList title="Pendidikan Anak" icon="book" items={data.familyEducation} />}
              {showKontak && <FamilyList title="Kontak & Darurat" icon="phone" items={data.familyContacts} />}
            </div>
          </section>
        );
      }

      case 'notes': {
        const activeMeta = NOTES_FILTERS.find((c) => c.id === noteFilter) || NOTES_FILTERS[0];
        const searching = noteQuery.trim().length > 0;
        return (
          <section className="app-fade-in">
            <SectionHeader
              icon={activeMeta.icon}
              title={activeMeta.label}
              subtitle={`${filteredNotes.length} dari ${data.notes.length} catatan`}
              actionLabel="Tambah"
              onAction={() => openAdd('notes')}
            />

            {/* Pencarian catatan (judul + isi) — kotak cari 48px, ikon di kiri */}
            <div className="relative mb-4">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mutedfg" aria-hidden="true">
                <Icon name="search" size={17} />
              </span>
              <input
                type="search"
                value={noteQuery}
                onChange={(e) => setNoteQuery(e.target.value)}
                placeholder="Cari judul atau isi catatan…"
                aria-label="Cari catatan"
                className="input-field min-h-[48px] w-full rounded-xl border border-line bg-canvas py-2 pl-11 pr-12 text-sm text-ink outline-none transition-colors placeholder:text-mutedfg/60 focus:border-brand"
              />
              {searching && (
                <button
                  type="button"
                  onClick={() => setNoteQuery('')}
                  aria-label="Bersihkan pencarian"
                  className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-mutedfg transition-colors hover:bg-muted hover:text-ink"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>

            {filteredNotes.length === 0 ? (
              <EmptyState
                icon={searching ? 'search' : 'note'}
                title={searching ? 'Catatan tidak ditemukan' : 'Tidak ada catatan di filter ini'}
                message={
                  searching
                    ? `Tidak ada catatan yang cocok dengan "${noteQuery.trim()}". Coba kata kunci lain.`
                    : 'Ubah filter, atau tambahkan catatan baru.'
                }
              />
            ) : (
              <NoteList
                notes={filteredNotes}
                onEdit={(item) => openEdit('notes', item)}
                onDelete={(item) => deleteItem('notes', item)}
              />
            )}
          </section>
        );
      }

      default:
        return (
          <Dashboard
            data={data}
            user={currentUser}
            formatCurrency={formatCurrency}
            formatCurrencyShort={formatCurrencyShort}
            onNavigate={setActiveSection}
          />
        );
    }
  };

  if (!entered) {
    return <WelcomeGate users={data.users} defaultUserId={activeUserId} onEnter={handleEnter} onReset={resetData} />;
  }

  return (
    <div className="app-bg flex min-h-screen flex-col text-ink">
      <Navigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        user={currentUser}
        onOpenAccount={() => setAccountOpen(true)}
        theme={theme}
        resolvedTheme={resolvedTheme}
        onToggleTheme={toggleTheme}
        schedule={data.schedule}
        expenses={data.expenses}
        family={familyAll}
        notes={data.notes}
        agendaFilter={agendaFilter}
        onAgendaSelect={handleAgendaSelect}
        financeFilter={financeFilter}
        onFinanceSelect={handleFinanceSelect}
        familyFilter={familyFilter}
        onFamilySelect={handleFamilySelect}
        noteFilter={noteFilter}
        onNoteSelect={handleNoteSelect}
        notifications={notifications}
        notifReadIds={notifRead}
        onNotificationOpen={openNotification}
        onMarkAllNotificationsRead={markAllNotifRead}
      />

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:pb-12"
      >
        {!isOnline && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-tonerosefg"
          >
            <Icon name="wifiOff" size={16} />
            <span>Mode offline — perubahan akan disinkronkan saat online.</span>
          </div>
        )}
        {renderSection()}
      </main>

      {/* Bottom sheet "Tambah/Ubah" — form per section (mode edit = nilai terisi) */}
      <FormSheet
        open={!!sheetOpen}
        title={
          sheetOpen
            ? editing
              ? SHEET_CONFIG[sheetOpen].title.replace(/^Tambah/, 'Ubah')
              : SHEET_CONFIG[sheetOpen].title
            : ''
        }
        icon={sheetOpen ? SHEET_CONFIG[sheetOpen].icon : 'calendar'}
        fields={sheetOpen ? SHEET_CONFIG[sheetOpen].fields : []}
        initialValues={sheetInitial}
        submitLabel={editing ? 'Perbarui' : 'Simpan'}
        onClose={closeSheet}
        onSubmit={(values) => submitSheet(sheetOpen, values)}
      />

      {/* Modal "Akun saya" — dibuka dari chip pengguna di header */}
      <AccountModal
        open={accountOpen}
        user={currentUser}
        users={data.users}
        onClose={() => setAccountOpen(false)}
        onSwitchUser={() => {
          setAccountOpen(false);
          setEntered(false);
        }}
        onSave={saveAccount}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Toast: konfirmasi ringkas + "Urungkan" untuk hapus */}
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
