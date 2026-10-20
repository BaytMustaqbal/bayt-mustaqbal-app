import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from './components/Icon';
import { Navigation } from './components/Navigation';
import { ScheduleItem } from './components/ScheduleItem';
import { FamilyMemberCard } from './components/FamilyMemberCard';
import { TaskList } from './components/TaskList';
import { NoteList } from './components/NoteList';
import { Dashboard } from './components/Dashboard';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { AccountModal } from './components/AccountModal';
import { Card, SectionHeader, EmptyState, ExpenseCard, FamilyList, initialsOf } from './components/ui';
import { FamilyCalendar } from './components/Calendar';
import { Timeline } from './components/Timeline';
import { FormSheet } from './components/FormSheet';
import { Toast } from './components/Toast';
import { buildNotifications } from './components/notifications';
import {
  AGENDA_CATEGORIES,
  BUCKETS,
  FINANCE_CATEGORIES,
  FAMILY_CATEGORIES,
  TASK_FILTERS,
  NOTE_CATEGORIES,
  NOTES_FILTERS,
  countByCategory,
  countByTaskFilter,
} from './components/categories';
import { getBudget } from './components/budget';
import { Budgeting } from './components/Budgeting';
import { auth, txn, cal, notesApi, settingsApi } from './services/client';
import './App.css';

/* ---- Data kosong untuk fitur TANPA tabel backend (localStorage-only) ----
   Fitur yang ada pasangan backend (schedule, expenses, notes, budget)
   dimuat dari API. Yang tidak ada pasangannya — mulai dari kosong;
   Kakang menambah lewat UI (mis. tombol "+ Data" di halaman Keluarga). */
const LOCAL_SEED = {
  family: [],
  familyMedical: [],
  familyDocuments: [],
  familyContacts: [],
  tasks: [],
};

/* ---- Computed data (derived from expenses, NOT stored) ---- */
const pad2 = (n) => String(n).padStart(2, '0');
const monthLabel = (d) => new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d).replace('.', '');
const dayLabel = (d) => new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d).replace('.', '');

// 6-bulan tren pengeluaran dari expenses
const computeMonthlyTrend = (expenses) => {
  const months = {};
  expenses.forEach((e) => {
    const m = (e.date || '').slice(0, 7);
    months[m] = (months[m] || 0) + (Number(e.amount) || 0);
  });
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    result.push({ label: monthLabel(d), value: months[key] || 0 });
  }
  return result;
};

// Distribusi mingguan dari expenses (berdasarkan hari)
const computeWeekly = (expenses) => {
  const days = Array(7).fill(0);
  expenses.forEach((e) => {
    const d = new Date((e.date || '').replace(/-/g, '/'));
    if (!Number.isNaN(d.getTime())) {
      days[d.getDay()] += Number(e.amount) || 0;
    }
  });
  const now = new Date();
  return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((label, i) => ({
    label: label,
    value: days[(i + 1) % 7], // Minggu=0, Senin=1, ... → susun Senin—Minggu
  }));
};

// Donut chart: agregat pengeluaran per kategori
const computeCategories = (expenses) => {
  const COLOR_MAP = {
    rumah: 'rgb(var(--chart8))',
    hiburan: 'rgb(var(--chart7))',
    belanja: 'rgb(var(--chart1))',
    tabungan: 'rgb(var(--chart9))',
    pendidikan: 'rgb(var(--chart2))',
    utilitas: 'rgb(var(--chart3))',
    ibadah: 'rgb(var(--chart4))',
    transportasi: 'rgb(var(--chart5))',
    kesehatan: 'rgb(var(--chart6))',
  };
  const totals = {};
  expenses.forEach((e) => {
    const cat = e.category || 'lainnya';
    totals[cat] = (totals[cat] || 0) + (Number(e.amount) || 0);
  });
  const LABEL_MAP = {};
  FINANCE_CATEGORIES.forEach((c) => { if (c.id !== 'semua') LABEL_MAP[c.id] = c.label; });
  return Object.entries(totals)
    .map(([cat]) => ({
      label: LABEL_MAP[cat] || cat,
      value: totals[cat],
      color: COLOR_MAP[cat] || 'rgb(var(--chart1))',
    }))
    .sort((a, b) => b.value - a.value);
};

// Month label for budget
const monthName = (d) => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);

// Gabungkan API data + local seed → data state penuh
const buildDataBundle = (apiData, currentUser) => {
  const budget = apiData?.budget || {};
  const expenses = apiData?.expenses || [];
  // Anggota keluarga = semua akun aktif dari backend (master sudah disembunyikan backend).
  // Fallback ke currentUser saja bila daftar users tidak tersedia (offline).
  const apiUsers = apiData?.users || [];
  const fallbackUsers = currentUser && apiUsers.length === 0
    ? [{ id: currentUser.id, nama: currentUser.nama, family_role: currentUser.family_role || 'anak', avatar_url: null }]
    : apiUsers;
  return {
    users: apiUsers.length > 0
      ? apiUsers.map((u) => ({ id: u.id, name: u.nama, username: u.username, role: u.family_role, initials: initialsOf(u.nama) }))
      : (currentUser ? [{ id: currentUser.id, name: currentUser.nama, username: currentUser.username, role: currentUser.role, initials: initialsOf(currentUser.nama) }] : []),
    family: mapUsersToFamily(fallbackUsers),
    schedule: apiData?.schedule || [],
    familyMedical: LOCAL_SEED.familyMedical,
    familyDocuments: LOCAL_SEED.familyDocuments,
    familyContacts: LOCAL_SEED.familyContacts,
    expenses,
    tasks: LOCAL_SEED.tasks,
    notes: apiData?.notes || [],
    budget: {
      month: budget.month || monthName(new Date()),
      income: Number(budget.income) || 8000000,
      ratios: budget.ratios || { needs: 50, wants: 30, savings: 20 },
      pos: budget.pos || {
        needs: [{ id: 'n1', label: 'Cicilan rumah/sewa' }, { id: 'n2', label: 'Belanja bahan makanan & beras' }, { id: 'n3', label: 'Tagihan utilitas (listrik/air/internet)' }, { id: 'n4', label: 'Transportasi (BBM/angkutan umum)' }, { id: 'n5', label: 'Sekolah anak' }, { id: 'n6', label: 'Asuransi kesehatan' }],
        wants: [{ id: 'w1', label: 'Makan di luar/hangout' }, { id: 'w2', label: 'Hobi & hiburan' }, { id: 'w3', label: 'Langganan streaming' }, { id: 'w4', label: 'Liburan/travelling' }],
        savings: [{ id: 's1', label: 'Dana darurat (target 3–6× pengeluaran bulanan)' }, { id: 's2', label: 'Tabungan' }, { id: 's3', label: 'Investasi' }, { id: 's4', label: 'Pembayaran cicilan/utang' }],
      },
    },
    monthlyTrend: computeMonthlyTrend(expenses),
    weekly: computeWeekly(expenses),
    categories: computeCategories(expenses),
  };
};

// Seed budget.pos default (imported by getBudget)
import { DEFAULT_POS, DEFAULT_RATIOS, DEFAULT_MONTH } from './components/budget';

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
      // Keranjang anggaran: "Otomatis" = ikut kategori (lihat CATEGORY_BUCKET
      // di components/categories.js); pilihan lain menimpanya untuk item ini.
      {
        key: 'bucket',
        label: 'Keranjang',
        type: 'select',
        defaultValue: 'auto',
        options: [
          { value: 'auto', label: 'Otomatis (ikut kategori)' },
          { value: 'needs', label: 'Kebutuhan' },
          { value: 'wants', label: 'Keinginan' },
          { value: 'savings', label: 'Tabungan & Utang' },
        ],
      },
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
          { value: 'medis', label: 'Info Medis' },
          { value: 'kontak', label: 'Kontak & Darurat' },
          { value: 'dokumen', label: 'Dokumen Penting' },
        ],
      },
      { key: 'title', label: 'Nama / Judul', type: 'text', required: true, placeholder: 'nama anggota, dokter, kontak, atau dokumen' },
      { key: 'meta', label: 'Info singkat (opsional)', type: 'text', placeholder: 'contoh: 0812-3456-7890 atau Berlaku s/d 2030-05-12' },
    ],
  },
  // Pos saran di halaman Anggaran. Sama seperti section lain, hanya label +
  // keranjang (tanpa nominal): nominalnya tetap turunan dari rasio.
  budgetPos: {
    title: 'Tambah Pos Anggaran',
    icon: 'target',
    fields: [
      { key: 'label', label: 'Nama pos', type: 'text', required: true, placeholder: 'contoh: Cicilan motor' },
      {
        key: 'bucket',
        label: 'Keranjang',
        type: 'select',
        required: true,
        defaultValue: BUCKETS[0].id,
        options: BUCKETS.map((b) => ({ value: b.id, label: b.label })),
      },
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
    return { description: item.description, amount: String(item.amount ?? ''), date: item.date, category: item.category, bucket: item.bucket || 'auto' };
  }
  if (section === 'tasks') {
    return { title: item.title, dueDate: item.dueDate, priority: item.priority, assignedTo: item.assignedTo };
  }
  if (section === 'notes') {
    return { title: item.title, body: item.body || '', category: item.category, pinned: !!item.pinned };
  }
  if (section === 'budgetPos') {
    return { label: item.label, bucket: item.bucket };
  }
  return {};
};

/* ---- localStorage cache & auth ----
   API_CACHE_KEY: cache data yang di-fetch dari backend (untuk offline fallback)
   STORAGE_KEY: snapshot gabungan (API + local) untuk persistensi antar reload
   TOKEN_KEY: JWT token dari login */
const STORAGE_KEY = 'bayt-mustaqbal-data-v2';
const API_CACHE_KEY = 'bayt-mustaqbal-api-cache-v1';
const TOKEN_KEY = 'bm-api-token';

const persist = (next) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    /* kuota penuh / mode privat → abaikan */
  }
};

const loadSnapshot = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.schedule) &&
        Array.isArray(parsed.expenses) &&
        Array.isArray(parsed.tasks) &&
        Array.isArray(parsed.family) &&
        Array.isArray(parsed.notes)
      ) {
        return parsed;
      }
    }
  } catch (e) {
    /* storage rusak → turun ke cache kosong */
  }
  return null;
};

// Cache API data untuk offline fallback
const cacheApiData = (data) => {
  try {
    localStorage.setItem(API_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* abaikan */
  }
};
const readApiCache = () => {
  try {
    const raw = localStorage.getItem(API_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Auth token helpers
const tokenExists = () => {
  try {
    return !!localStorage.getItem(TOKEN_KEY);
  } catch {
    return false;
  }
};
const clearAuthToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* abaikan */
  }
};

// Merge API data + local seed → full data bundle
const buildMergedData = (apiData, currentUser) => {
  const bundle = buildDataBundle(apiData, currentUser);
  // Overlay localStorage-only data yang sudah dimodifikasi (tasks, family)
  const snapshot = loadSnapshot();
  if (snapshot) {
    return {
      ...bundle,
      // family sekarang dari daftar akun backend (bukan localStorage-only lagi)
      family: bundle.family,
      tasks: snapshot.tasks || bundle.tasks,
      familyMedical: snapshot.familyMedical || bundle.familyMedical,
      familyDocuments: snapshot.familyDocuments || bundle.familyDocuments,
      familyContacts: snapshot.familyContacts || bundle.familyContacts,
    };
  }
  return bundle;
};

// Fetch all API data (schedule, expenses, notes, budget settings)
const fetchApiData = async () => {
  const [schedule, expenses, notes, settings, users] = await Promise.all([
    cal.fetch().catch(() => []),
    txn.fetch().catch(() => []),
    notesApi.fetch(null).catch(() => []),
    settingsApi.fetchAll().catch(() => []),
    auth.users().catch(() => []),
  ]);

  // Parse budget settings
  const budgetSettings = {};
  settings.forEach((s) => {
    budgetSettings[s.key] = s.value;
  });

  let budget = {};
  if (budgetSettings.budget_income) {
    budget.income = Number(budgetSettings.budget_income);
  }
  if (budgetSettings.budget_ratios) {
    try { budget.ratios = JSON.parse(budgetSettings.budget_ratios); } catch {}
  }
  if (budgetSettings.budget_month) {
    budget.month = budgetSettings.budget_month;
  }
  if (budgetSettings.budget_pos) {
    try { budget.pos = JSON.parse(budgetSettings.budget_pos); } catch {}
  }

  return { schedule, expenses, notes, budget, users };
};

/* Label status keluarga dari kolom family_role backend */
const FAMILY_ROLE_LABEL = { suami: 'Suami', istri: 'Istri', anak: 'Anak', lainnya: 'Lainnya' };

/* Map akun backend → format anggota keluarga (FamilyMemberCard) */
const mapUsersToFamily = (users) =>
  (users || []).map((u) => ({
    id: u.id,
    name: u.nama,
    role: FAMILY_ROLE_LABEL[u.family_role] || 'Anak',
    initials: initialsOf(u.nama),
    avatar: u.avatar_url || undefined,
    status: 'active',
    birthDate: '',
    blood: '—',
    allergy: '—',
    phone: '—',
  }));

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

/* ---- Auth state helpers ----
   Token + user info disimpan di localStorage untuk persistensi sesi.
   `getUser()` mengembalikan user object dari login response (bukan mockData). */
const USER_KEY = 'bm-user';

const storedToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
};

const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const storeUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* diabaikan */
  }
};

const clearUser = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
  // Auth: isLoggedIn = punya token yang valid. authChecking = sedang verify token.
  const [isLoggedIn, setIsLoggedIn] = useState(storedToken() ? true : false);
  const [authChecking, setAuthChecking] = useState(storedToken() ? true : false);
  const [authError, setAuthError] = useState('');
  const stored = getUser();
  const transformedUser = stored
    ? { id: stored.id, name: stored.nama || stored.name, username: stored.username, role: stored.role, family_role: stored.family_role || 'anak', initials: initialsOf(stored.nama || stored.name) }
    : null;
  const [currentUser, setCurrentUser] = useState(transformedUser);
  // Splash screen: tampil setiap app dibuka, lepas setelah fade-out.
  const [splashDone, setSplashDone] = useState(false);
  // entered = pengguna sudah melewati splash & berada di app (atau login screen)
  const [entered, setEntered] = useState(false);
  // Filter kategori agenda (default: semua) — sinkron antara dropdown nav & chip di section
  const [agendaFilter, setAgendaFilter] = useState('semua');
  // Sub-tampilan Agenda: jadwal (daftar) | tugas | kalender keluarga
  const [agendaMode, setAgendaMode] = useState('jadwal');
  // Filter kategori pengeluaran (default: semua) — pola sama dengan agenda
  const [financeFilter, setFinanceFilter] = useState('semua');
  // Sub-tampilan Keuangan: daftar pengeluaran | halaman Anggaran (50/30/20)
  const [financeMode, setFinanceMode] = useState('pengeluaran');
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
  // Data state — dimuat dari API + localStorage cache
  const [data, setData] = useState(null);
  // Loading state untuk data API
  const [dataLoading, setDataLoading] = useState(false);

  // dataRef menjaga snapshot terbaru untuk aksi yang berjalan belakangan
  // (mis. tombol "Urungkan" dari toast) tanpa closure basi.
  const dataRef = useRef(data);

  const saveData = (next) => {
    dataRef.current = next;
    setData(next);
    persist(next);
  };

  // Tema: pilihan pengguna ('system' | 'light' | 'dark') + preferensi perangkat.
  // Tema yang benar-benar dipakai = hasil resolusi keduanya.
  const [theme, setTheme] = useState(readStoredTheme);
  const [systemLight, setSystemLight] = useState(systemPrefersLight);
  const resolvedTheme = theme === 'system' ? (systemLight ? 'light' : 'dark') : theme;

  // ---- Auth check on mount ----
  // Jika ada token di localStorage, verifikasi dengan /auth/me.
  // Jika valid → mark logged in + fetch data. Jika invalid → clear & show login.
  useEffect(() => {
    // Dev: clear token lama agar auto-login pakai akun dari .env
    if (import.meta.env.DEV) {
      clearAuthToken();
      localStorage.removeItem('bayt-mustaqbal-data-v2'); /* clear cache lama */
      setIsLoggedIn(false);
      setAuthChecking(false);
      return;
    }
    if (!storedToken()) {
      setAuthChecking(false);
      return;
    }
    setAuthChecking(true);
    auth.me()
      .then((user) => {
        // Token valid — user sudah terautentikasi
        setIsLoggedIn(true);
        setAuthError('');
        // Auto-enter: tidak perlu login lagi kalau token masih valid
        setEntered(true);
      })
      .catch((err) => {
        // Token invalid/expired → clear & show login
        clearUser();
        setIsLoggedIn(false);
        setAuthError(err.message === 'UNAUTHORIZED'
          ? 'Sesi berakhir. Masuk lagi.'
          : 'Tidak dapat memverifikasi sesi.');
      })
      .finally(() => setAuthChecking(false));
  }, []);

  // ---- Fetch data from API when logged in ----
  const loadFromAPI = async () => {
    if (!isOnline) {
      // Offline → gunakan cache
      const cached = readApiCache();
      if (cached) {
        const merged = buildMergedData(cached, currentUser);
        saveData(merged);
      } else {
        // Tidak ada cache → tetap tampilkan app dengan data lokal saja
        const merged = buildDataBundle({}, currentUser);
        saveData(merged);
        pushToast({ message: 'Offline — hanya data lokal yang tersedia.', duration: 4000, tone: 'warning' });
      }
      return;
    }
    setDataLoading(true);
    try {
      const apiData = await fetchApiData();
      cacheApiData(apiData);
      const merged = buildMergedData(apiData, currentUser);
      saveData(merged);
      setAuthError('');
    } catch (err) {
      // API fail → fallback ke cache, tampilkan notif
      const cached = readApiCache();
      if (cached) {
        const merged = buildMergedData(cached, currentUser);
        saveData(merged);
        setAuthError('Tidak dapat memuat data dari server. Menampilkan cache lokal.');
      } else {
        // Tidak ada cache sama sekali → tampilkan app dengan data lokal
        const merged = buildDataBundle({}, currentUser);
        saveData(merged);
        setAuthError('Gagal memuat data dari server. Menampilkan data lokal.');
      }
    } finally {
      setDataLoading(false);
    }
  };

  // Effect: load data ketika auth state berubah
  useEffect(() => {
    if (isLoggedIn) {
      loadFromAPI();
    }
  }, [isLoggedIn]);

  // Effect: reload data ketika online kembali
  useEffect(() => {
    if (isOnline && isLoggedIn && data) {
      loadFromAPI();
    }
  }, [isOnline]);

  /* ---------- Dev auto-login ----------
     Hanya di development (Vite DEV), auto-fill kredensial dari .env.development
     supaya tidak perlu ketik login berulang kali. */
  useEffect(() => {
    if (import.meta.env.DEV && !isLoggedIn && !entered && !authChecking && storedToken() === null) {
      const devUser = import.meta.env.VITE_DEV_USER || 'baytmustaqbal@gmail.com';
      const devPass = import.meta.env.VITE_DEV_PASS || '@_Eki091278';
      const timer = setTimeout(() => {
        auth.login(devUser, devPass)
          .then((result) => handleLogin(result.user))
          .catch((err) => console.error('[dev] auto-login gagal:', err.message));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, entered, authChecking]);

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

  // Beri tahu index.html bahwa pengguna sudah lewat layar gerbang; popup
  // "Pasang app" menunggu sinyal ini supaya tidak tersembunyi di balik gerbang.
  useEffect(() => {
    if (entered) window.dispatchEvent(new Event('bm:entered'));
  }, [entered]);

  // Tombol tema di header: lompat ke kebalikan tema yang sedang terlihat
  // (dari 'system' pun jadi pilihan tegas light/dark — tidak membingungkan).
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  // Toast: tambah/ubah = konfirmasi singkat; hapus = tawarkan "Urungkan".
  const pushToast = (t) => setToast({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...t });
  const dismissToast = (id) => setToast((prev) => (prev && prev.id === id ? null : prev));

  // Toggle selesai tugas → disimpan (tasks = localStorage-only, tidak ada backend)
  const toggleTask = (taskId) => {
    saveData({
      ...dataRef.current,
      tasks: dataRef.current.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
    });
  };

  // Reset data ke seed (tombol di LoginScreen — hanya untuk dev)
  const resetData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(API_CACHE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      /* abaikan */
    }
    clearUser();
    setIsLoggedIn(false);
  };

  /* Simpan perubahan profil akun yang sedang aktif (nama, username, avatar,
     password). Backend belum punya endpoint PUT /users → semua perubahan
     tetap lokal (snapshot). Ini untuk data lokal saja. */
  const saveAccount = (patch) => {
    if (!currentUser) return;
    const current = dataRef.current;
    saveData({
      ...current,
      users: current.users.map((u) => {
        if (u.id !== currentUser.id) return u;
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
    // Update currentUser di localStorage juga
    storeUser({ id: currentUser.id, nama: patch.name, username: patch.username, role: currentUser.role, avatar_url: patch.avatar });
    pushToast({ message: 'Profil akun diperbarui', duration: 2500 });
  };

  // Helper: recompute derived data (monthlyTrend, weekly, categories) setelah expenses berubah
  const recomputeDerived = (expenses) => {
    const trend = computeMonthlyTrend(expenses);
    const weekly = computeWeekly(expenses);
    const categories = computeCategories(expenses);
    return { trend, weekly, categories };
  };

  // Helper: update state + persist (sama seperti saveData tapi juga recompute derived data)
  const updateData = (updater) => {
    const current = dataRef.current;
    const next = typeof updater === 'function' ? updater(current) : updater;
    saveData(next);
  };

  // Helper: tambah item ke state (dipakai untuk local-only + sebagai state update setelah API)
  const addItemToState = (section, item) => {
    const current = dataRef.current;
    const key = SECTION_KEY[section] || section;
    let next = current;
    if (section === 'agenda') {
      next = { ...current, schedule: [...(current.schedule || []), item] };
    } else if (section === 'expenses') {
      next = { ...current, expenses: [...(current.expenses || []), item] };
      const d = recomputeDerived(next.expenses);
      next.monthlyTrend = d.trend;
      next.weekly = d.weekly;
      next.categories = d.categories;
    } else if (section === 'tasks') {
      next = { ...current, tasks: [...(current.tasks || []), item] };
    } else if (section === 'notes') {
      next = { ...current, notes: [...(current.notes || []), item] };
    } else if (section === 'family') {
      if (item.bagian === 'anggota') {
        next = { ...current, family: [...(current.family || []), { id: item.id, name: item.title, role: 'Anggota', initials: item.initials, status: 'active', birthDate: '', blood: '—', allergy: '—', phone: item.meta || '—' }] };
      } else if (item.bagian === 'medis') {
        next = { ...current, familyMedical: [...(current.familyMedical || []), { id: item.id, title: item.title, meta: item.meta, badge: 'Catatan', tone: 'gray' }] };
      } else if (item.bagian === 'dokumen') {
        next = { ...current, familyDocuments: [...(current.familyDocuments || []), { id: item.id, title: item.title, meta: item.meta, badge: 'Catatan', tone: 'gray' }] };
      } else {
        next = { ...current, familyContacts: [...(current.familyContacts || []), { id: item.id, title: item.title, meta: item.meta }] };
      }
    }
    saveData(next);
  };

  // Helper: update item di state
  const updateItemInState = (section, id, values) => {
    const key = SECTION_KEY[section];
    const current = dataRef.current;
    const list = current[key] || [];
    const applyEdit = (item) => {
      if (section === 'agenda') return { ...item, title: values.title, date: values.date, time: values.time || '08:00', category: values.category, member: values.member };
      if (section === 'expenses') return { ...item, description: values.description, amount: Number(values.amount) || 0, date: values.date, category: values.category, bucket: values.bucket || 'auto' };
      if (section === 'tasks') return { ...item, title: values.title, dueDate: values.dueDate, priority: values.priority, assignedTo: values.assignedTo };
      if (section === 'notes') return { ...item, title: values.title, body: values.body || '', category: values.category, pinned: !!values.pinned, updatedAt: todayKey() };
      return item;
    };
    const updated = list.map((it) => (it.id === id ? applyEdit(it) : it));
    const next = { ...current, [key]: updated };
    if (section === 'expenses') {
      const d = recomputeDerived(updated);
      next.monthlyTrend = d.trend;
      next.weekly = d.weekly;
      next.categories = d.categories;
    }
    saveData(next);
  };

  // Helper: delete item dari state
  const removeItemFromState = (section, item) => {
    const key = SECTION_KEY[section];
    const list = dataRef.current[key] || [];
    const next = { ...dataRef.current, [key]: list.filter((it) => it.id !== item.id) };
    if (section === 'expenses') {
      const d = recomputeDerived(next.expenses);
      next.monthlyTrend = d.trend;
      next.weekly = d.weekly;
      next.categories = d.categories;
    }
    saveData(next);
  };

  // Tambah item — untuk section yang terhubung API, panggil API dulu,
  // lalu update state. Untuk section lokal (tasks, family), update state langsung.
  const addItem = async (section, values) => {
    if (!isOnline) {
      // Offline → tambah lokal saja
      const id = Date.now();
      const item = buildLocalItem(section, values, id);
      addItemToState(section, item);
      pushToast({ message: `${SECTION_LABEL[section]} ditambahkan (offline)`, duration: 2500 });
      return;
    }

    try {
      if (section === 'agenda') {
        const result = await cal.create({ title: values.title, date: values.date, time: values.time || '08:00', category: values.category, member: values.member });
        addItemToState(section, result);
      } else if (section === 'expenses') {
        const result = await txn.create({ category: values.category, description: values.description, amount: Number(values.amount) || 0, date: values.date, bucket: values.bucket || 'auto' });
        addItemToState(section, result);
      } else if (section === 'notes') {
        const result = await notesApi.create({ title: values.title, body: values.body || '', category: values.category, pinned: !!values.pinned }, currentUser);
        addItemToState(section, result);
      } else {
        // Local-only: tasks, family
        const id = Date.now();
        const item = buildLocalItem(section, values, id);
        addItemToState(section, item);
      }
      pushToast({ message: `${SECTION_LABEL[section]} ditambahkan`, duration: 2500 });
    } catch (err) {
      pushToast({ message: `Gagal menambah ${SECTION_LABEL[section].toLowerCase()}: ${err.message}`, duration: 4000, tone: 'danger' });
    }
  };

  // Build item object for local-only sections
  const buildLocalItem = (section, values, id) => {
    if (section === 'agenda') return { id, title: values.title, date: values.date, time: values.time || '08:00', category: values.category, member: values.member };
    if (section === 'expenses') return { id, description: values.description, amount: Number(values.amount) || 0, date: values.date, category: values.category, bucket: values.bucket || 'auto' };
    if (section === 'tasks') return { id, title: values.title, dueDate: values.dueDate, priority: values.priority, assignedTo: values.assignedTo, completed: false };
    if (section === 'notes') return { id, title: values.title, body: values.body || '', category: values.category, pinned: !!values.pinned, author: currentUser?.name || '', updatedAt: todayKey() };
    if (section === 'family') {
      if (values.bagian === 'anggota') {
        const initials = values.title.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
        return { bagian: 'anggota', id, title: values.title, initials, meta: values.meta };
      }
      return { bagian: values.bagian, id, title: values.title, meta: values.meta || '' };
    }
    return { id };
  };

  // Ubah item — untuk section yang terhubung API, panggil API.
  const updateItem = async (section, id, values) => {
    const key = SECTION_KEY[section];
    const current = dataRef.current;

    if (!isOnline) {
      // Offline → update lokal
      updateItemInState(section, id, values);
      pushToast({ message: `${SECTION_LABEL[section]} diperbarui (offline)`, duration: 2500 });
      return;
    }

    try {
      if (section === 'agenda') {
        const result = await cal.update(id, calTransform.toPayload({ title: values.title, date: values.date, time: values.time, category: values.category, member: values.member }));
        const updated = calTransform.toSchedule(result);
        const list = current[key] || [];
        saveData({ ...current, [key]: list.map((it) => (it.id === id ? updated : it)) });
      } else if (section === 'expenses') {
        const result = await txn.update(id, txnTransform.toPayload({ category: values.category, description: values.description, amount: Number(values.amount) || 0, date: values.date, bucket: values.bucket || 'auto' }));
        const updated = txnTransform.toExpense(result);
        const list = current[key] || [];
        const next = { ...current, [key]: list.map((it) => (it.id === id ? updated : it)) };
        const d = recomputeDerived(next.expenses);
        next.monthlyTrend = d.trend;
        next.weekly = d.weekly;
        next.categories = d.categories;
        saveData(next);
      } else if (section === 'notes') {
        const result = await notesApi.update(id, noteTransform.toPayload({ title: values.title, body: values.body, category: values.category, pinned: !!values.pinned }), currentUser);
        const updated = noteTransform.toNote(result, currentUser);
        const list = current[key] || [];
        saveData({ ...current, [key]: list.map((it) => (it.id === id ? updated : it)) });
      } else {
        // Local-only
        updateItemInState(section, id, values);
      }
      pushToast({ message: `${SECTION_LABEL[section]} diperbarui`, duration: 2500 });
    } catch (err) {
      pushToast({ message: `Gagal memperbarui ${SECTION_LABEL[section].toLowerCase()}: ${err.message}`, duration: 4000, tone: 'danger' });
    }
  };

  // Simpan gaji & rasio anggaran (keuangan → settings API)
  const handleSaveBudget = async ({ income, ratios }) => {
    const current = dataRef.current;
    // Update state langsung (optimistic)
    saveData({ ...current, budget: { ...current.budget, income, ratios } });

    if (!isOnline) {
      pushToast({ message: 'Anggaran diperbarui (offline)', duration: 2500 });
      return;
    }

    try {
      await settingsApi.upsert('budget_income', String(income));
      await settingsApi.upsert('budget_ratios', JSON.stringify(ratios));
      pushToast({ message: 'Anggaran diperbarui', duration: 2500 });
    } catch (err) {
      pushToast({ message: 'Anggaran disimpan lokal (gagal sinkron ke server)', duration: 4000, tone: 'warning' });
    }
  };

  // Simpan pos anggaran (tambah/ubah) — keuangan settings
  const savePos = async (values, posId) => {
    const current = dataRef.current;
    const label = String(values.label || '').trim();
    if (!label) return;
    const budgetNow = getBudget(current);
    const bucketIds = BUCKETS.map((b) => b.id);
    const target = bucketIds.includes(values.bucket) ? values.bucket : bucketIds[0];
    const entry = { id: posId || `pos-${Date.now()}`, label };
    const pos = {};
    BUCKETS.forEach((b) => {
      pos[b.id] = (budgetNow.pos[b.id] || []).filter((p) => p.id !== entry.id);
    });
    pos[target] = [...pos[target], entry];
    saveData({ ...current, budget: { ...current.budget, pos } });
    pushToast({ message: posId ? 'Pos anggaran diperbarui' : 'Pos anggaran ditambahkan', duration: 2500 });

    // Simpan ke settings API
    if (isOnline) {
      try {
        await settingsApi.upsert('budget_pos', JSON.stringify(pos));
      } catch (err) {
        /* gagal sinkron — tetap tersimpan di localStorage */
      }
    }
  };

  // Hapus pos anggaran + tawarkan "Urungkan"
  const deletePos = (bucket, pos) => {
    const current = dataRef.current;
    const index = (getBudget(current).pos[bucket] || []).findIndex((p) => p.id === pos.id);
    if (index < 0) return;
    const posMap = {};
    BUCKETS.forEach((b) => {
      posMap[b.id] = (getBudget(current).pos[b.id] || []).filter((p) => p.id !== pos.id);
    });
    saveData({ ...current, budget: { ...current.budget, pos: posMap } });
    // Simpan ke settings API
    if (isOnline) {
      settingsApi.upsert('budget_pos', JSON.stringify(posMap)).catch(() => {});
    }
    pushToast({
      message: `Pos "${pos.label}" dihapus`,
      actionLabel: 'Urungkan',
      duration: 6000,
      onAction: () => {
        const now = getBudget(dataRef.current);
        const restored = {};
        BUCKETS.forEach((b) => {
          restored[b.id] = [...(now.pos[b.id] || [])];
        });
        const target = restored[bucket] ? bucket : BUCKETS[0].id;
        restored[target].splice(Math.min(index, restored[target].length), 0, pos);
        saveData({ ...dataRef.current, budget: { ...dataRef.current.budget, pos: restored } });
        // Simpan ke settings API
        if (isOnline) {
          settingsApi.upsert('budget_pos', JSON.stringify(restored)).catch(() => {});
        }
      },
    });
  };

  // Hapus item + tawarkan "Urungkan"
  const deleteItem = async (section, item) => {
    const key = SECTION_KEY[section];
    const list = dataRef.current[key] || [];
    const index = list.findIndex((it) => it.id === item.id);
    if (index < 0) return;

    // Optimistic: hapus dari state + persist
    removeItemFromState(section, item);

    // API call (async, fire-and-forget)
    if (isOnline) {
      try {
        if (section === 'agenda') {
          await cal.delete(item.id);
        } else if (section === 'expenses') {
          await txn.delete(item.id);
        } else if (section === 'notes') {
          await notesApi.delete(item.id);
        }
      } catch (err) {
        // API gagal → restore ke state, tampilkan error
        const restored = [...(dataRef.current[key] || [])];
        restored.splice(Math.min(index, restored.length), 0, item);
        saveData({ ...dataRef.current, [key]: restored });
        pushToast({ message: `Gagal menghapus ${sectionItemLabel(item)}: ${err.message}`, duration: 4000, tone: 'danger' });
        return;
      }
    }

    pushToast({
      message: `"${sectionItemLabel(item)}" dihapus`,
      actionLabel: 'Urungkan',
      duration: 6000,
      onAction: () => {
        const restored = [...(dataRef.current[key] || [])];
        restored.splice(Math.min(index, restored.length), 0, item);
        saveData({ ...dataRef.current, [key]: restored });
        // Jika online, restore via API juga
        if (isOnline) {
          if (section === 'agenda') cal.create(item).catch(() => {});
          else if (section === 'expenses') txn.create(item).catch(() => {});
          else if (section === 'notes') notesApi.create(item, currentUser).catch(() => {});
        }
      },
    });
  };

  // Bottom sheet "Tambah/Ubah" — null = tertutup, selain itu = kunci section.
  const [sheetOpen, setSheetOpen] = useState(null);
  // Mode ubah: { section, id } item yang sedang diedit + nilai awal formnya.
  const [editing, setEditing] = useState(null);
  const [sheetInitial, setSheetInitial] = useState(null);

  // `nilaiAwal` dipakai untuk form yang datang dengan konteks terisi
  // (mis. "Tambah pos" dari salah satu kartu keranjang → keranjang sudah dipilih).
  const openAdd = (section, nilaiAwal = null) => {
    setEditing(null);
    setSheetInitial(nilaiAwal);
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
  // Pos anggaran punya jalur sendiri (bukan array di `data`, tapi `budget.pos`).
  const submitSheet = (section, values) => {
    if (section === 'budgetPos') {
      savePos(values, editing && editing.section === 'budgetPos' ? editing.id : null);
      return;
    }
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

  // Gabungan semua data keluarga (tiap item diberi `category` = bagian).
  // Dipakai untuk badge jumlah di dropdown bagian keluarga.
  const familyAll = useMemo(
    () => (data ? [
      ...data.family.map((m) => ({ ...m, category: 'anggota' })),
      ...data.familyMedical.map((h) => ({ ...h, category: 'medis' })),
      ...data.familyContacts.map((c) => ({ ...c, category: 'kontak' })),
      ...data.familyDocuments.map((d) => ({ ...d, category: 'dokumen' })),
    ] : []),
    [data]
  );

  // Tugas sesuai filter aktif (status/prioritas) untuk daftar & chip.
  const filteredTasks = useMemo(() => {
    if (!data) return [];
    if (taskFilter === 'semua') return data.tasks;
    if (taskFilter === 'belum') return data.tasks.filter((t) => !t.completed);
    if (taskFilter === 'selesai') return data.tasks.filter((t) => t.completed);
    return data.tasks.filter((t) => t.priority === taskFilter);
  }, [data, taskFilter]);

  // Catatan sesuai filter aktif (semua | penting | kategori) + pencarian.
  const filteredNotes = useMemo(() => {
    if (!data) return [];
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
  const notifications = useMemo(() => data ? buildNotifications(data, formatCurrencyShort) : [], [data]);

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

  // Called by LoginScreen setelah login sukses
  const handleLogin = (user) => {
    // user = { id, username, nama, role, family_role } from backend
    const frontendUser = {
      id: user.id,
      name: user.nama,
      username: user.username,
      role: user.role,
      family_role: user.family_role || 'anak',
      initials: initialsOf(user.nama),
    };
    storeUser(frontendUser);
    setCurrentUser(frontendUser);
    setIsLoggedIn(true);
    setActiveSection('dashboard');
    setEntered(true);
  };

  // Logout — clear token + kembali ke login screen
  const handleLogout = () => {
    if (isOnline) auth.logout().catch(() => {});
    clearUser();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setEntered(false);
    setActiveSection('dashboard');
  };

  // Dipanggil dropdown kategori agenda di navigasi → buka section + set filter
  const handleAgendaSelect = (categoryId) => {
    setAgendaFilter(categoryId);
    setActiveSection('agenda');
  };

  // Dipanggil tombol "Lihat semua" pada kartu Timeline di Dashboard →
  // buka halaman Agenda langsung di sub-tab Timeline (tampilan penuh).
  const handleOpenAgendaTimeline = () => {
    setAgendaMode('timeline');
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
        const budget = getBudget(data);
        return (
          <section className="app-fade-in">
            {financeMode === 'anggaran' ? (
              <SectionHeader
                icon="pieChart"
                title="Anggaran"
                subtitle={`Gaji ${formatCurrencyShort(budget.income)} · ${budget.month}`}
              />
            ) : (
              <SectionHeader
                icon="wallet"
                title={activeMeta.label}
                subtitle={`Total: ${formatCurrency(filteredTotal)} · anggaran ${formatCurrencyShort(budget.income)}`}
                actionLabel="Tambah"
                actionTone="accent"
                onAction={() => openAdd('expenses')}
              />
            )}

            {/* Sub-tampilan Keuangan: Pengeluaran (daftar) | Anggaran (50/30/20) */}
            <div
              className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1 sm:inline-flex"
              role="group"
              aria-label="Mode tampilan keuangan"
            >
              <button
                type="button"
                onClick={() => setFinanceMode('pengeluaran')}
                aria-pressed={financeMode === 'pengeluaran'}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                  financeMode === 'pengeluaran'
                    ? 'bg-brandtint text-brandfg'
                    : 'text-mutedfg hover:text-ink'
                }`}
              >
                <Icon name="wallet" size={16} />
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setFinanceMode('anggaran')}
                aria-pressed={financeMode === 'anggaran'}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                  financeMode === 'anggaran' ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:text-ink'
                }`}
              >
                <Icon name="pieChart" size={16} />
                Anggaran
              </button>
            </div>

            {financeMode === 'anggaran' ? (
              <Budgeting
                data={data}
                formatCurrency={formatCurrency}
                formatCurrencyShort={formatCurrencyShort}
                onSaveBudget={handleSaveBudget}
                onAddPos={(bucket) => openAdd('budgetPos', { bucket })}
                onEditPos={(bucket, pos) => openEdit('budgetPos', { ...pos, bucket })}
                onDeletePos={(bucket, pos) => deletePos(bucket, pos)}
              />
            ) : filtered.length === 0 ? (
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
        const showMedis = familyFilter === 'semua' || familyFilter === 'medis';
        const showKontak = familyFilter === 'semua' || familyFilter === 'kontak';
        const showDokumen = familyFilter === 'semua' || familyFilter === 'dokumen';
        const bagianCount = familyFilter === 'semua' ? familyAll.length : countByCategory(familyAll, familyFilter);
        return (
          <section className="app-fade-in">
            <SectionHeader
              icon="users"
              title={activeMeta.label}
              subtitle={`${bagianCount} data keluarga`}
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
                    // Kartu profil memuat detail (lahir/gol.darah/alergi/WA) — butuh
                    // lebar. 1 kolom di HP, baru berjejer dari sm+.
                    <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                      {data.family.map((member) => (
                        <FamilyMemberCard key={member.id} member={member} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {showMedis && <FamilyList title="Info Medis" icon="activity" items={data.familyMedical} onAdd={() => openAdd('family', { bagian: 'medis' })} />}
              {showKontak && <FamilyList title="Kontak & Darurat" icon="phone" items={data.familyContacts} onAdd={() => openAdd('family', { bagian: 'kontak' })} />}
              {showDokumen && <FamilyList title="Dokumen Penting" icon="file" items={data.familyDocuments} onAdd={() => openAdd('family', { bagian: 'dokumen' })} />}
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
            onOpenTimeline={handleOpenAgendaTimeline}
            onEditItem={openEdit}
          />
        );
    }
  };

  // While checking auth or loading data, show splash
  if (authChecking || !isLoggedIn || !entered) {
    return (
      <>
        {/* Splash tetap muncul — berada sebelum early-return */}
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        {authChecking ? null : (
          <LoginScreen
            onLogin={handleLogin}
            onReset={resetData}
          />
        )}
        {authError && !authChecking && (
          <div
            role="status"
            className="fixed bottom-20 right-4 left-4 z-[95] rounded-xl border border-tonerose/40 bg-tonerose/10 px-4 py-3 text-sm text-tonerosefg sm:bottom-auto sm:left-auto"
          >
            {authError}
          </div>
        )}
      </>
    );
  }

  // Waiting for API data to load
  if (isLoggedIn && entered && !data) {
    return (
      <>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        {dataLoading && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-canvas/90">
            <div className="text-center">
              <Icon name="loader" size={32} className="animate-spin text-brand" />
              <p className="mt-3 text-sm text-mutedfg">Memuat data…</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="app-bg flex min-h-screen flex-col text-ink">
      <Navigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        user={currentUser}
        onOpenAccount={() => setAccountOpen(true)}
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
        onSwitchUser={handleLogout}
        onSave={saveAccount}
        onLogout={handleLogout}
        theme={theme}
        onThemeChange={setTheme}
      />

      {/* Toast: konfirmasi ringkas + "Urungkan" untuk hapus */}
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Splash screen — tampil setiap buka app, lepas setelah fade-out */}
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
    </div>
  );
}
