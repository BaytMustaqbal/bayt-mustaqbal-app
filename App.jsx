import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Icon } from './components/Icon';
import { Navigation } from './components/Navigation';
import { Sidebar } from './components/Sidebar';
import { ScheduleItem } from './components/ScheduleItem';
import { TaskList } from './components/TaskList';
import { NoteList } from './components/NoteList';
import { Dashboard } from './components/Dashboard';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { AccountModal } from './components/AccountModal';
import { ReceiptScanner } from './components/ReceiptScanner';
import { Card, SectionHeader, EmptyState, ExpenseCard, IncomeCard, StatCard, FamilyList, initialsOf, Badge } from './components/ui';
import ShoppingList from './components/ShoppingListComp';
import Service from './components/ServiceComp';
import SubscriptionsComp from './components/SubscriptionsComp';
const SettingsComp = lazy(() => import('./components/SettingsComp'));
const InsightComp = lazy(() => import('./components/InsightComp').then((m) => ({ default: m.InsightComp })));
import ChoresComp from './components/ChoresComp';
import TargetTabunganComp from './components/TargetTabunganComp';
const DebtComp = lazy(() => import('./components/DebtComp'));
import { monthTitle, weekTitle, parseShoppingNote, serializeShopping, isShoppingNote, emptyShopping, newShoppingItem, copyForMonth, toTemplateItems, SHOPPING_CATEGORY, SHOPPING_MONTH_PREFIX, SHOPPING_WEEK_PREFIX, SHOPPING_TEMPLATE_TITLE, sumItems } from './components/shoppingList';
import { newSparepart, emptyServiceRecord, SERVICE_CATEGORY, sumServiceItems, sparepartToPayload, serviceRecordToPayload, calculateNextDue } from './components/service';
import { toCalendarEvents } from './components/calendarEvents';
import { GroupedBarChart, DonutChart, BarChart } from './components/charts';
import { FamilyCalendar } from './components/Calendar';
import { Timeline } from './components/Timeline';
import { FormSheet } from './components/FormSheet';
import { FamilyTree } from './components/FamilyTree';
import { SlideTabs } from './components/SlideTabs';
import { SegmentedControl } from './components/SegmentedControl';
import { Toast } from './components/Toast';
import { buildNotifications } from './components/notifications';
import {
  AGENDA_CATEGORIES,
  BUCKETS,
  FINANCE_CATEGORIES,
  INCOME_CATEGORIES,
  FAMILY_CATEGORIES,
  TASK_FILTERS,
  NOTE_CATEGORIES,
  NOTES_FILTERS,
  countByCategory,
  countByTaskFilter,
} from './components/categories';
import { getBudget } from './components/budget';
const Budgeting = lazy(() => import('./components/Budgeting').then((m) => ({ default: m.Budgeting })));
import { auth, txn, cal, notesApi, settingsApi, billsApi, gcalApi, setToken, insightApi, goalsApi, scheduledTasksApi, pushApi, subApi, serviceInvApi, serviceHistoryApi, tasksApi, familyEntryApi, choresApi, debtApi, vehicleApi } from './services/client';
import { readUiPrefs, applyUiPrefs } from './services/uiPrefs';
import './App.css';

/* eslint-disable no-undef */
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';
/* eslint-enable no-undef */

/* ---- Data kosong untuk fitur TANPA tabel backend (localStorage-only) ----
   Fitur yang ada pasangan backend (schedule, expenses, notes, budget)
   dimuat dari API. Yang tidak ada pasangannya � mulai dari kosong;
   Kakang menambah lewat UI (mis. tombol "+ Data" di halaman Keluarga). */
const LOCAL_SEED = {
  family: [],
  familyMedical: [],
  familyDocuments: [],
  familyContacts: [],
  tasks: [],
  serviceInventory: [],
  serviceHistory: [],
};

/* Guard migrasi tagihan localStorage → API: React StrictMode (dev) menjalankan
   effect dua kali; flag sinkron ini memastikan migrasi hanya berjalan sekali
   per muat halaman, bahkan sebelum await pertama selesai. */
let tagihanMigrationStarted = false;

/* ---- Computed data (derived from expenses, NOT stored) ---- */
const pad2 = (n) => String(n).padStart(2, '0');

/* Ubah VAPID public key base64-url → Uint8Array (untuk pushManager.subscribe). */
const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
};
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
    value: days[(i + 1) % 7], // Minggu=0, Senin=1, ... ? susun Senin�Minggu
  }));
};

// Donut chart: agregat per kategori. Dipakai pengeluaran (default) & pemasukan
// (lewat parameter daftar kategori + peta warna).
const INCOME_COLOR_MAP = {
  gaji: 'rgb(var(--chart2))',
  bonus: 'rgb(var(--chart5))',
  sidejob: 'rgb(var(--chart3))',
  investasi: 'rgb(var(--chart6))',
  pemberian: 'rgb(var(--chart4))',
  lainnya: 'rgb(var(--chart9))',
};

const computeCategories = (items, categories = FINANCE_CATEGORIES, colorMap) => {
  const COLOR_MAP = colorMap || {
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
  items.forEach((e) => {
    const cat = e.category || 'lainnya';
    totals[cat] = (totals[cat] || 0) + (Number(e.amount) || 0);
  });
  const LABEL_MAP = {};
  categories.forEach((c) => { if (c.id !== 'semua') LABEL_MAP[c.id] = c.label; });
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

/* ---- Helper tab Ringkasan (halaman Keuangan) ---- */
const monthKeyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const monthNameLong = (key) => {
  const [y, m] = String(key).split('-').map(Number);
  if (!y || !m) return monthName(new Date());
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
};
// Tren berpasangan 6 bulan TERAKHIR dari bulan acuan (bukan selalu bulan ini),
// supaya Kakang bisa meninjau bulan lalu lengkap dengan konteks 6 bulannya.
const buildPairedTrend = (expenses, income, endKey) => {
  const [y, m] = String(endKey).split('-').map(Number);
  const sumBy = (list) => {
    const t = {};
    (list || []).forEach((i) => {
      const k = (i.date || '').slice(0, 7);
      if (k) t[k] = (t[k] || 0) + (Number(i.amount) || 0);
    });
    return t;
  };
  const te = sumBy(expenses);
  const ti = sumBy(income);
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const key = monthKeyOf(d);
    out.push({ label: monthLabel(d), key, income: ti[key] || 0, expense: te[key] || 0 });
  }
  return out;
};
// Status anggaran: aman (<80%), hati-hati (80-100%), lewat (>100%).
// Anggaran belum diisi ? 'belum' (bukan 0% yang menyesatkan).
const budgetStatus = (expense, budgetIncome) => {
  const total = Number(budgetIncome) || 0;
  if (total <= 0) return { level: 'belum', pct: 0, sisa: 0 };
  const pct = Math.round((expense / total) * 100);
  const level = expense > total ? 'lewat' : pct >= 80 ? 'hati-hati' : 'aman';
  return { level, pct, sisa: total - expense };
};

// Gabungkan API data + local seed ? data state penuh
const buildDataBundle = (apiData, currentUser) => {
  const budget = apiData?.budget || {};
  const expenses = apiData?.expenses || [];
  const income = apiData?.income || [];
  // Anggota keluarga = semua akun aktif dari backend (master sudah disembunyikan backend).
  // Fallback ke currentUser saja bila daftar users tidak tersedia (offline).
  const apiUsers = apiData?.users || [];
  const fallbackUsers = currentUser && apiUsers.length === 0
    ? [{ id: currentUser.id, nama: currentUser.nama, family_role: currentUser.family_role || 'anak', avatar_url: null }]
    : apiUsers;
  return {
    users: mapUsersToFamily(fallbackUsers),
    family: mapUsersToFamily(fallbackUsers),
    schedule: apiData?.schedule || [],
    familyMedical: apiData?.familyMedical || [],
    familyDocuments: apiData?.familyDocuments || [],
    familyContacts: apiData?.familyContacts || [],
    expenses,
    income,
    scheduledExpenses: apiData?.scheduledExpenses || [],
    tasks: apiData?.tasks || [],
    vehicles: apiData?.vehicles || [],
    chores: apiData?.chores || [],
    debts: apiData?.debts || [],
    serviceHistory: apiData?.serviceHistory || [],
    notes: apiData?.notes || [],
    budget: {
      month: budget.month || monthName(new Date()),
      income: Number(budget.income) || 8000000,
      ratios: budget.ratios || { needs: 50, wants: 30, savings: 20 },
      pos: budget.pos || {
        needs: [{ id: 'n1', label: 'Cicilan rumah/sewa' }, { id: 'n2', label: 'Belanja bahan makanan & beras' }, { id: 'n3', label: 'Tagihan utilitas (listrik/air/internet)' }, { id: 'n4', label: 'Transportasi (BBM/angkutan umum)' }, { id: 'n5', label: 'Sekolah anak' }, { id: 'n6', label: 'Asuransi kesehatan' }],
        wants: [{ id: 'w1', label: 'Makan di luar/hangout' }, { id: 'w2', label: 'Hobi & hiburan' }, { id: 'w3', label: 'Langganan streaming' }, { id: 'w4', label: 'Liburan/travelling' }],
        savings: [{ id: 's1', label: 'Dana darurat (target 3-6 bulan pengeluaran bulanan)' }, { id: 's2', label: 'Tabungan' }, { id: 's3', label: 'Investasi' }, { id: 's4', label: 'Pembayaran cicilan/utang' }],
      },
    },
    monthlyTrend: computeMonthlyTrend(expenses),
    weekly: computeWeekly(expenses),
    categories: computeCategories(expenses),
    incomeTrend: computeMonthlyTrend(income),
    incomeCategories: computeCategories(income, INCOME_CATEGORIES, INCOME_COLOR_MAP),
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

// --- Fungsi CRUD Kategori Budget (dimanage pengguna) ---

// Simpan kategori ke localStorage agar bertahan setelah refresh
const STORAGE_KEY_BUDGET_CAT = 'bayt-mustaqbal-budget-categories';

const loadBudgetCategories = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BUDGET_CAT);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Gagal load budget categories', e);
    return [];
  }
};

const saveBudgetCategories = (categories) => {
  try {
    localStorage.setItem(STORAGE_KEY_BUDGET_CAT, JSON.stringify(categories));
  } catch (e) {
    console.error('Gagal save budget categories', e);
  }
};

// ---- Pemetaan section ? kunci array data & label Indonesia ----------------
// Dipakai seragam oleh tambah / ubah / hapus agar App tidak penuh if-else.
const SECTION_KEY = { agenda: 'schedule', expenses: 'expenses', income: 'income', tasks: 'tasks', notes: 'notes' };
const SECTION_LABEL = { agenda: 'Agenda', expenses: 'Pengeluaran', income: 'Pemasukan', tasks: 'Tugas', notes: 'Catatan', family: 'Keluarga' };
const sectionItemLabel = (item) => item.title || item.description || item.name || 'Item';

// Map baris tasks backend (snake_case) → bentuk frontend (camelCase).
const mapTask = (t) => ({
  id: t.id,
  title: t.title,
  dueDate: t.due_date || '',
  priority: t.priority || 'sedang',
  assignedTo: t.assigned_to || '',
  completed: !!t.completed,
});

// Map baris family_entries backend (snake_case) → bentuk frontend.
const mapFamilyEntry = (e) => ({
  id: e.id,
  title: e.title,
  meta: e.meta || '',
  badge: e.badge || 'Catatan',
  tone: e.tone || 'gray',
});

// Map baris chores backend (snake_case) → bentuk frontend.
const mapChore = (c) => ({
  id: c.id,
  title: c.title,
  dueDate: c.due_date || '',
  status: c.status || 'open',
  assigneeId: c.assignee_id || '',
});

// Kunci state frontend untuk masing-masing bagian family.
const FAMILY_SECTION_KEY = { medis: 'familyMedical', dokumen: 'familyDocuments', kontak: 'familyContacts' };

// Map baris service_history backend → bentuk frontend (dibaca ServiceComp).
const mapServiceHistory = (r) => ({
  id: r.id,
  date: r.tanggal,
  odometer: Number(r.odometer) || 0,
  items: r.items || [],
  total: Number(r.total) || 0,
  technician: r.technician || '',
  notes: r.notes || '',
  kategori: r.kategori || 'service',
  vehicleId: r.vehicleId || '',
});

// Nilai awal form ubah: bentuknya persis seperti `values` yang dikirim FormSheet
// (angka dijadikan string agar cocok dengan <input type="number">).
const toFormValues = (section, item) => {
  if (section === 'agenda') {
    return { title: item.title, date: item.date, time: item.time, category: item.category, member: item.member };
  }
  if (section === 'expenses') {
    return { description: item.description, amount: String(item.amount ?? ''), date: item.date, category: item.category, bucket: item.bucket || 'auto' };
  }
  if (section === 'income') {
    return { description: item.description, amount: String(item.amount ?? ''), date: item.date, category: item.category };
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
  if (section === 'shopping') {
    return { nama: item.nama || '', qty: String(item.qty || 1), harga: String(item.harga || 0) };
  }
  if (section === 'service') {
    return {
      nama: item.nama || '',
      intervalType: item.intervalType || 'km',
      intervalValue: String(item.intervalValue || 3000),
    };
  }
  if (section === 'scheduledTemplate') {
    return {
      name: item.name || '',
      amount: String(item.amount ?? ''),
      category: item.category || 'lainnya',
      day: String(item.day ?? 1),
      bucket: item.bucket || 'auto',
      active: item.active !== false,
    };
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
    /* kuota penuh / mode privat ? abaikan */
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
        Array.isArray(parsed.notes) &&
        Array.isArray(parsed.serviceInventory) &&
        Array.isArray(parsed.serviceHistory)
      ) {
        return parsed;
      }
    }
  } catch (e) {
    /* storage rusak ? turun ke cache kosong */
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

// Auth token helpers (dua penyimpanan: localStorage = "Ingat saya", sessionStorage = sesi)
const tokenExists = () => {
  try {
    return !!(localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY));
  } catch {
    return false;
  }
};
const clearAuthToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* abaikan */
  }
};

// Merge API data + local seed ? full data bundle
const buildMergedData = (apiData, currentUser) => {
  const bundle = buildDataBundle(apiData, currentUser);
  // Overlay localStorage-only data yang sudah dimodifikasi (tasks, family, service)
  const snapshot = loadSnapshot();
  if (snapshot) {
    return {
      ...bundle,
      // family sekarang dari daftar akun backend (bukan localStorage-only lagi)
      family: bundle.family,
      tasks: bundle.tasks,
      familyMedical: bundle.familyMedical,
      familyDocuments: bundle.familyDocuments,
      familyContacts: bundle.familyContacts,
      serviceInventory: snapshot.serviceInventory || [],
      serviceHistory: bundle.serviceHistory,
    };
  }
  return bundle;
};

// Fetch all API data (schedule, expenses, income, notes, budget settings)
const fetchApiData = async () => {
  const [schedule, expenses, income, notes, settings, users, scheduledTasks, tasks, familyEntries, serviceHistory, chores, debts, vehicles] = await Promise.all([
    cal.fetch().catch(() => []),
    txn.fetch().catch(() => []),
    txn.fetchIncome().catch(() => []),
    notesApi.fetch(null).catch(() => []),
    settingsApi.fetchAll().catch(() => []),
    auth.users().catch(() => []),
    scheduledTasksApi.fetch().catch(() => []),
    tasksApi.fetch().catch(() => []),
    familyEntryApi.fetch().catch(() => []),
    serviceHistoryApi.fetch().catch(() => []),
    choresApi.fetch().catch(() => []),
    debtApi.fetch().catch(() => []),
    vehicleApi.fetch().catch(() => []),
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

  // Pengeluaran terjadwal: sekarang dari backend /rec/scheduled (type pengeluaran),
  // bukan lagi blob JSON di settings. Bentuk frontend: { id, name, amount, day, active }.
  const scheduledExpenses = Array.isArray(scheduledTasks)
    ? scheduledTasks
        .filter((t) => t.type === 'pengeluaran')
        .map((t) => ({ id: t.id, name: t.name, amount: t.amount, category: t.category, day: t.day, active: t.active }))
    : [];

  const rows = Array.isArray(familyEntries) ? familyEntries : [];
  const familyMedical = rows.filter((r) => r.bagian === 'medis').map(mapFamilyEntry);
  const familyDocuments = rows.filter((r) => r.bagian === 'dokumen').map(mapFamilyEntry);
  const familyContacts = rows.filter((r) => r.bagian === 'kontak').map(mapFamilyEntry);
  const mappedHistory = Array.isArray(serviceHistory) ? serviceHistory.map(mapServiceHistory) : [];
  const mappedChores = Array.isArray(chores) ? chores.map(mapChore) : [];
  const mappedDebts = Array.isArray(debts) ? debts : [];
  const mappedVehicles = Array.isArray(vehicles) ? vehicles : [];

  return { schedule, expenses, income, notes, budget, scheduledExpenses, users, tasks: Array.isArray(tasks) ? tasks : [], familyMedical, familyDocuments, familyContacts, serviceHistory: mappedHistory, chores: mappedChores, debts: mappedDebts, vehicles: mappedVehicles };
};

/* Label status keluarga dari kolom family_role backend */
const FAMILY_ROLE_LABEL = { suami: 'Suami', istri: 'Istri', anak: 'Anak', lainnya: 'Lainnya' };

/* Map akun backend ? format anggota keluarga (FamilyTree) */
const VALID_GENERASI = ['orangtua', 'anak', 'cucu'];
const mapUsersToFamily = (users) => {
  const list = (users || []).map((u) => ({
    id: u.id,
    name: u.nama,
    nickname: u.nickname || null,
    email: u.username || null,
    phone: u.phone || null,
    // Peran grup menang atas status keluarga: Kepala Keluarga tampil sebagai
    // "Kepala Keluarga" (bukan "Suami") di papan keluarga.
    role: u.group_role === 'kepala_keluarga' ? 'Kepala Keluarga' : FAMILY_ROLE_LABEL[u.family_role] || 'Anak',
    initials: initialsOf(u.nickname || u.nama),
    avatar: u.avatar_url || undefined,
    // Normalisasi generasi tak dikenal (mis. typo dari SQL manual) ? 'orangtua'
    // supaya anggota tak "hilang" dari pohon.
    generasi: VALID_GENERASI.includes(u.generasi) ? u.generasi : 'orangtua',
    birthDate: u.birth_date || null,
    // Field mentah dari backend (dipakai form edit anggota di AccountModal).
    family_role: u.family_role || 'anak',
    group_role: u.group_role || 'anak',
  }));

  // Urutan anak: tertua = ke-1, dst. Dalam pohon saat ini hanya ada satu
  // pasangan orangtua inti, sehingga "per pasangan" = urutkan semua anak dalam
  // keluarga ini berdasarkan tanggal lahir. Yang belum punya tanggal lahir
  // ditaruh di akhir.
  const anak = list.filter((m) => m.generasi === 'anak');
  anak.sort((a, b) => String(a.birthDate || '9999-99-99').localeCompare(String(b.birthDate || '9999-99-99')));
  anak.forEach((m, i) => { m.childOrdinal = i + 1; });

  return list;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

// Versi ringkas untuk KPI & label chart: 2.780.000 ? "Rp 2,8 jt"
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

/* Token bisa berada di localStorage ("Ingat saya" dicentang) atau
   sessionStorage (tidak dicentang) � baca keduanya. */
const storedToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
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
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* diabaikan */
  }
};

// Status "sudah dibaca" notifikasi � kunci terpisah dari snapshot data karena
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

/* Perangkat sedang memakai tema terang? (kalau API tak ada ? anggap gelap) */
const systemPrefersLight = () => {
  try {
    return window.matchMedia(LIGHT_MEDIA).matches;
  } catch {
    return false;
  }
};

// ---- Helper parsing perintah suara untuk pengeluaran cepat ----
const VOICE_CATEGORY_KEYWORDS = [
  { id: 'belanja', words: ['belanja', 'sayur', 'beras', 'makanan', 'pasar', 'sembako'] },
  { id: 'utilitas', words: ['listrik', 'air', 'internet', 'token', 'pulsa', 'gas'] },
  { id: 'transportasi', words: ['bensin', 'bbm', 'transport', 'ojek', 'grab', 'gojek', 'parkir', 'tol'] },
  { id: 'pendidikan', words: ['sekolah', 'buku', 'les', 'kursus'] },
  { id: 'kesehatan', words: ['obat', 'dokter', 'rumah sakit', 'vitamin', 'apotek'] },
  { id: 'ibadah', words: ['zakat', 'infak', 'sedekah', 'donasi'] },
  { id: 'rumah', words: ['cicilan', 'sewa', 'rumah', 'listrik rumah'] },
  { id: 'hiburan', words: ['hiburan', 'nonton', 'bioskop', 'game'] },
  { id: 'tabungan', words: ['tabungan', 'nabung'] },
];

const parseVoiceExpense = (text) => {
  const t = String(text || '').toLowerCase();
  let amount = 0;
  const m = t.match(/(\d[\d.,]*)\s*(ribu|rb|ratus|juta|k)?/);
  if (m) {
    let num = m[1].replace(/\./g, '').replace(',', '.');
    let val = parseFloat(num) || 0;
    const mult = m[2];
    if (mult === 'ribu' || mult === 'rb' || mult === 'k') val *= 1000;
    else if (mult === 'ratus') val *= 100;
    else if (mult === 'juta') val *= 1000000;
    amount = Math.round(val);
  }
  let category = 'belanja';
  for (const c of VOICE_CATEGORY_KEYWORDS) {
    if (c.words.some((w) => t.includes(w))) {
      category = c.id;
      break;
    }
  }
  return { amount, category, description: String(text || '').trim() };
};

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Auth: isLoggedIn = punya token yang valid. authChecking = sedang verify token.
  const [isLoggedIn, setIsLoggedIn] = useState(storedToken() ? true : false);
  const [authChecking, setAuthChecking] = useState(storedToken() ? true : false);
  // authReady: baru true setelah verifikasi auth selesai (DEV: token dibersihkan;
  // prod: /auth/me sudah diputuskan). Mencegah data-effect memakai token basi.
  const [authReady, setAuthReady] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const stored = getUser();
  const transformedUser = stored
    ? { id: stored.id, name: stored.nama || stored.name, username: stored.username, role: stored.role, family_role: stored.family_role || 'anak', generasi: stored.generasi || 'orangtua', birthDate: stored.birth_date || null, nickname: stored.nickname || null, phone: stored.phone || null, avatar: stored.avatar || stored.avatar_url || null, initials: initialsOf(stored.nickname || stored.nama || stored.name), group_id: stored.group_id || null, group_role: stored.group_role || 'anak', group_name: stored.group_name || null }
    : null;
  const [currentUser, setCurrentUser] = useState(transformedUser);
  // Hak tulis data keluarga: kepala_keluarga, suami, istri. anak & cucu = baca saja
  // (backend juga menolak 403; UI hanya menyembunyikan jalur tulis).
  const canWrite = ['kepala_keluarga', 'suami', 'istri'].includes(currentUser?.group_role);
  // Splash screen: tampil setiap app dibuka, lepas setelah fade-out.
  const [splashDone, setSplashDone] = useState(false);
  // entered = pengguna sudah melewati splash & berada di app (atau login screen)
  const [entered, setEntered] = useState(false);
  // Filter kategori agenda (default: semua) � sinkron antara dropdown nav & chip di section
  const [agendaFilter, setAgendaFilter] = useState('semua');
  // Sub-tampilan Agenda: jadwal (daftar) | tugas | kalender keluarga
  const [agendaMode, setAgendaMode] = useState('jadwal');
  // Filter kategori pengeluaran (default: semua) � pola sama dengan agenda
  const [financeFilter, setFinanceFilter] = useState('semua');
  const [incomeFilter, setIncomeFilter] = useState('semua');
  // Kategori budget yang dikelola pengguna (ditetapkan di menu Budget)
  // Setiap kategori: { id, name, limit }
  const [budgetCategories, setBudgetCategories] = useState([]);
  // Tagihan & Utang-Piutang yang dikelola pengguna
  // Setiap tagihan: { id, nama, kategori, amount, dueDate, dibayar, lastPaidDate, lastNotified, createdAt }
  const [tagihans, setTagihans] = useState([]);
  // Langganan & Utilitas (API /api/sub)
  const [subs, setSubs] = useState([]);
  // Analitik & insight (API /api/insight)
  const [insight, setInsight] = useState(null);
  // Status integrasi Google Calendar (dipakai halaman Pengaturan)
  const [gcal, setGcal] = useState({
    loading: false,
    connecting: false,
    connected: false,
    email: null,
    error: null,
    notConfigured: false,
  });

// Perencanaan Impian & Tabungan — dikelola pengguna, terpisah dari budget kategori
// Setiap goal: { id, nama, targetAmount, currentAmount, targetDate, achieved, createdAt }
const [goals, setGoals] = useState([]);

// Muat target tabungan dari API; migrasi sekali dari localStorage bila kosong
useEffect(() => {
  if (!isLoggedIn || !authReady) return;
  let alive = true;
  (async () => {
    let rows = [];
    try {
      rows = await goalsApi.fetch();
    } catch {
      return;
    }
    if (rows.length === 0) {
      try {
        const raw = localStorage.getItem('bm-goals');
        if (raw) {
          const legacy = JSON.parse(raw);
          for (const g of legacy) {
            try {
              rows.push(await goalsApi.create(g));
            } catch { /* lewati */ }
          }
          if (rows.length) localStorage.removeItem('bm-goals');
        }
      } catch { /* abaikan */ }
    }
    if (alive) setGoals(rows);
  })();
  return () => {
    alive = false;
  };
}, [isLoggedIn, authReady]);

const addGoal = async (g) => {
  const created = await goalsApi.create(g);
  setGoals((prev) => [...prev, created]);
};
const updateGoal = async (id, patch) => {
  const updated = await goalsApi.update(id, patch);
  setGoals((prev) => prev.map((x) => (x.id === id ? updated : x)));
};
const deleteGoal = async (id) => {
  await goalsApi.delete(id);
  setGoals((prev) => prev.filter((x) => x.id !== id));
};

  // Pemindai struk: foto dibaca OCR di perangkat, disimpan sebagai pengeluaran biasa
  const [scanOpen, setScanOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceLevels, setVoiceLevels] = useState(() => Array(8).fill(0));
  const voiceSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const voiceRecRef = useRef(null);
  const voiceCleanupRef = useRef(null);

  // Sidebar navigasi (desktop-trigger header, mobile-tetap bottom navbar)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Fitur budget, tagihan & SHEET_CONFIG: WAJIB di dalam component ----
  // (sebelumnya salah tempat di module scope -> "Invalid hook call")
  // Inisialisasi state dari localStorage saat komponen pertama kali render
  // (Sudah dilakukan di useState di bawah, tapi fungsi ini tersedia untuk dipakai lagi)
  const initBudgetCategories = () => {
    const loaded = loadBudgetCategories();
    // Konversi format: pastikan setiap kategori punya id, name, limit
    const normalized = loaded.map((c) => ({
      id: c.id || `cat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: c.name || 'Kategori Baru',
      limit: c.limit !== undefined ? Number(c.limit) : 0,
    }));
    setBudgetCategories(normalized);
    saveBudgetCategories(normalized);
  };

  // Buat kategori baru
  const addBudgetCategory = (name, limit) => {
    const newCategory = {
      id: `cat-${Date.now()}`, // ID unik
      name: name.toLowerCase().trim() || 'belum nama',
      limit: Number(limit) || 0,
    };
    setBudgetCategories(prev => {
      // Cek apakah kategori sudah ada (case-insensitive)
      const exists = prev.some((c) => c.name === newCategory.name);
      if (exists) {
        alert('Kategori sudah ada! Gunakan nama yang berbeda.');
        return prev;
      }
      return [...prev, newCategory];
    });
    saveBudgetCategories(prev => [...prev, newCategory]);
  };

  // Edit kategori existente
  const editBudgetCategory = (categoryId, newName, newLimit) => {
    setBudgetCategories(prev =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, name: newName.toLowerCase().trim() || c.name, limit: Number(newLimit) || c.limit }
          : c
      )
    );
    saveBudgetCategories(prev =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, name: newName.toLowerCase().trim() || c.name, limit: Number(newLimit) || c.limit } : c
      )
    );
  };

  // Hapus kategori
  const deleteBudgetCategory = (categoryId) => {
    // Cek apakah kategori sedang digunakan di transaksi expenses
    // (state `data` berisi seluruh data keluarga; `expenses` bukan variabel sendiri)
    const isUsed = (data?.expenses || []).some((e) => e.category === categoryId);
    if (isUsed) {
      alert('Tidak bisa menghapus kategori ini karena masih ada transaksi yang menggunakan kategori ini.');
      return;
    }
    
    setBudgetCategories(prev => prev.filter((c) => c.id !== categoryId));
    saveBudgetCategories(prev => prev.filter((c) => c.id !== categoryId));
  };

  // Konversi budgetCategories ke options select
  const getBudgetCategoryOptions = () => {
    if (!budgetCategories || budgetCategories.length === 0) {
      // Fallback ke FINANCE_CATEGORIES jika belum ada budget categories
      return catOptions(FINANCE_CATEGORIES);
    }
    // Convert budgetCategories {id, name, limit} ke format select options
    return budgetCategories
      .filter((c) => c.id !== 'semua' && c.id) // filter invalid
      .map((c) => ({ value: c.id, label: c.name }))
      .concat([{ value: 'semua', label: 'Semua' }]); // tambahkan "semua" option
  };

  // --- Fungsi CRUD Tagihan & Utang-Piutang (sumber data: API /api/bill) ---
  //
  // Data lama di localStorage ('bayt-mustaqbal-tagihans') dimigrasi SEKALI ke
  // API saat load pertama (bila API masih kosong), lalu ditandai selesai.
  // localStorage lama TIDAK dihapus dan TIDAK ditulis lagi — hanya dipakai
  // sebagai cadangan baca saat API tidak terjangkau.
  const STORAGE_KEY_TAGIHAN = 'bayt-mustaqbal-tagihans';
  const STORAGE_MIGRATED_TAGIHAN = 'bayt-mustaqbal-tagihans-migrated';

  const loadTagihans = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TAGIHAN);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Gagal load tagihans', e);
      return [];
    }
  };

  // Samakan bentuk entri (baik dari API maupun cadangan lokal)
  const normalizeTagihan = (t) => ({
    id: t.id || `tag-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nama: t.nama || 'Tagihan Baru',
    kategori: t.kategori || 'lainnya',
    amount: t.amount !== undefined ? Number(t.amount) : 0,
    dueDate: t.dueDate || '',
    dibayar: t.dibayar !== undefined ? Number(t.dibayar) : 0,
    lastPaidDate: t.lastPaidDate || null,
    lastNotified: t.lastNotified || null,
    createdAt: t.createdAt || new Date().toISOString(),
  });

  // Muat tagihan dari API + migrasi sekali-jalan dari localStorage.
  // Berjalan setelah login (sebelum login API menjawab 401).
  useEffect(() => {
    if (!isLoggedIn || !authReady || tagihanMigrationStarted) return;
    tagihanMigrationStarted = true;
    let alive = true;
    (async () => {
      try {
        let rows = await billsApi.fetch();
        if (rows.length === 0) {
          const legacy = loadTagihans();
          if (legacy.length > 0 && !localStorage.getItem(STORAGE_MIGRATED_TAGIHAN)) {
            const created = [];
            for (const t of legacy) {
              try {
                created.push(await billsApi.create(t));
              } catch (e) {
                console.error('Migrasi tagihan gagal:', t.nama, e.message);
              }
            }
            if (created.length > 0) {
              localStorage.setItem(STORAGE_MIGRATED_TAGIHAN, new Date().toISOString());
            }
            rows = created;
          }
        }
        if (alive) setTagihans(rows.map(normalizeTagihan));
      } catch (e) {
        // API tidak terjangkau → pakai cadangan lokal (baca saja) supaya
        // pengingat & anggaran tetap punya data.
        console.warn('Tagihan pakai cadangan lokal:', e.message);
        if (alive) setTagihans(loadTagihans().map(normalizeTagihan));
      }
    })();
    return () => {
      alive = false;
    };
  }, [isLoggedIn, authReady]);

  // Muat langganan & utilitas.
  useEffect(() => {
    if (!isLoggedIn || !authReady) return;
    let alive = true;
    subApi
      .fetch()
      .then((rows) => {
        if (alive) setSubs(rows || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isLoggedIn, authReady]);

  // Muat inventory service dari backend + migrasi localStorage sekali-jalan.
  const svcMigratedRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || !authReady || svcMigratedRef.current) return;
    svcMigratedRef.current = true;
    let alive = true;
    (async () => {
      try {
        const rows = await serviceInvApi.fetch();
        if (alive) {
          // Gabung: data backend menang; localStorage lama jadi seed bila kosong.
          const localInv = dataRef.current?.serviceInventory || [];
          if (rows.length === 0 && localInv.length > 0) {
            for (const it of localInv) {
              try { await serviceInvApi.create(it); } catch { /* lewati */ }
            }
            const fresh = await serviceInvApi.fetch();
            if (alive) saveData({ ...dataRef.current, serviceInventory: fresh });
          } else {
            saveData({ ...dataRef.current, serviceInventory: rows });
          }
        }
      } catch { /* non-kritis */ }
    })();
    return () => { alive = false; };
  }, [isLoggedIn, authReady]);

  // Muat analitik & insight setelah login.
  useEffect(() => {
    if (!isLoggedIn || !authReady) return;
    let alive = true;
    insightApi
      .fetch()
      .then((d) => {
        if (alive) setInsight(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isLoggedIn, authReady]);

  const refreshInsight = async () => {
    try {
      setInsight(await insightApi.fetch());
    } catch {
      /* biarkan */
    }
  };

  // ---- Status & aksi integrasi Google Calendar (halaman Pengaturan) ----
  const refreshGcalStatus = async () => {
    setGcal((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const s = await gcalApi.status();
      setGcal({
        loading: false,
        connecting: false,
        connected: !!s.connected,
        email: s.email || null,
        calendarId: s.calendar_id || null,
        error: null,
        notConfigured: false,
      });
    } catch (e) {
      setGcal((prev) => ({
        ...prev,
        loading: false,
        error: e.message === 'NETWORK_ERROR' ? 'Tidak dapat menghubungi server.' : e.message,
      }));
    }
  };

  // Pergi ke halaman consent Google; balikannya lewat ?gcal=connected / ?gcal=error
  const connectGoogleCalendar = async () => {
    setGcal((prev) => ({ ...prev, connecting: true, error: null }));
    try {
      const { url } = await gcalApi.login(window.location.origin);
      window.location.href = url;
    } catch (e) {
      const notConfigured = e.message.includes('belum di-set');
      setGcal((prev) => ({
        ...prev,
        connecting: false,
        notConfigured,
        error: notConfigured ? null : `Gagal memulai: ${e.message}`,
      }));
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      await gcalApi.disconnect();
      setGcal((prev) => ({ ...prev, connected: false, email: null }));
      pushToast({
        message: 'Google Calendar diputus. Event yang sudah terlanjur dikirim tetap tersimpan di Google.',
        duration: 4500,
      });
    } catch (e) {
      pushToast({ message: `Gagal memutus koneksi: ${e.message}`, duration: 3500, tone: 'danger' });
    }
  };

  // Hasil OAuth Google: ?gcal=connected atau ?gcal=error&reason=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('gcal');
    if (!result) return;
    const reason = params.get('reason');
    params.delete('gcal');
    params.delete('reason');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);

    if (result === 'connected') {
      pushToast({
        message: 'Google Calendar tersambung. Agenda & tagihan otomatis ikut ter-push.',
        duration: 4500,
      });
    } else {
      pushToast({
        message: `Gagal menyambungkan Google Calendar${reason ? ` (${reason})` : ''}. Coba lagi dari menu Pengaturan.`,
        duration: 5500,
        tone: 'danger',
      });
    }
    refreshGcalStatus();
  }, []);

  // Hasil login Google: ?google=success&token=… atau ?google=error&reason=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('google');
    if (!result) return;
    const reason = params.get('reason');
    const token = params.get('token');
    params.delete('google');
    params.delete('reason');
    params.delete('token');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);

    if (result !== 'success' || !token) {
      pushToast({
        message: `Gagal masuk dengan Google${reason ? ` (${reason})` : ''}. Pastikan akun sudah terdaftar, atau pakai password.`,
        duration: 5500,
        tone: 'danger',
      });
      return;
    }

    // Simpan token lalu ambil profil untuk masuk.
    setToken(token, true);
    auth
      .me()
      .then((user) => handleLogin(user))
      .catch(() => {
        pushToast({ message: 'Token login Google tidak valid. Coba lagi.', duration: 4500, tone: 'danger' });
      });
  }, []);

  // Tambah tagihan baru (API dulu, lalu state)
  const addTagihan = async (nama, kategori, amount, dueDate) => {
    const newTagihan = {
      nama: (nama || '').toLowerCase().trim() || 'belum nama',
      kategori: kategori || 'lainnya',
      amount: Number(amount) || 0,
      dueDate: dueDate || '',
      dibayar: 0,
      lastPaidDate: null,
      lastNotified: null,
      createdAt: new Date().toISOString(),
    };
    if (tagihans.some((t) => t.nama === newTagihan.nama)) {
      alert('Tagihan sudah ada! Gunakan nama yang berbeda.');
      return null;
    }
    try {
      const created = await billsApi.create(newTagihan);
      setTagihans((prev) => [...prev, normalizeTagihan(created)]);
      return created;
    } catch (e) {
      alert(`Gagal menyimpan tagihan: ${e.message === 'NETWORK_ERROR' ? 'tanpa koneksi' : e.message}`);
      return null;
    }
  };

  // Edit tagihan
  const editTagihan = async (tagihanId, newNama, newKategori, newAmount, newDueDate) => {
    const current = tagihans.find((t) => t.id === tagihanId);
    if (!current) return;
    const patch = {
      ...current,
      nama: (newNama || '').toLowerCase().trim() || current.nama,
      kategori: newKategori || current.kategori,
      amount: Number(newAmount) || current.amount,
      dueDate: newDueDate || current.dueDate,
    };
    try {
      const updated = await billsApi.update(tagihanId, patch);
      setTagihans((prev) => prev.map((t) => (t.id === tagihanId ? normalizeTagihan(updated) : t)));
    } catch (e) {
      alert(`Gagal mengubah tagihan: ${e.message === 'NETWORK_ERROR' ? 'tanpa koneksi' : e.message}`);
    }
  };

  // Hapus tagihan
  const deleteTagihan = async (tagihanId) => {
    const toDelete = tagihans.find((t) => t.id === tagihanId);
    if (toDelete && toDelete.dibayar > 0) {
      alert('Tidak bisa menghapus tagihan ini karena masih ada pembayaran yang tercatat.');
      return;
    }
    try {
      await billsApi.delete(tagihanId);
      setTagihans((prev) => prev.filter((t) => t.id !== tagihanId));
    } catch (e) {
      alert(`Gagal menghapus tagihan: ${e.message === 'NETWORK_ERROR' ? 'tanpa koneksi' : e.message}`);
    }
  };

  // Catat pembayaran tagihan (bisa parsial → status lunas bila sudah penuh)
  const catatPembayaran = async (tagihanId, amount) => {
    const tagihan = tagihans.find((t) => t.id === tagihanId);
    if (!tagihan) return;

    const patch = {
      ...tagihan,
      dibayar: (tagihan.dibayar || 0) + Number(amount),
      lastPaidDate: new Date().toISOString().split('T')[0],
    };
    try {
      const updated = await billsApi.update(tagihanId, patch);
      setTagihans((prev) => prev.map((t) => (t.id === tagihanId ? normalizeTagihan(updated) : t)));
    } catch (e) {
      alert(`Gagal mencatat pembayaran: ${e.message === 'NETWORK_ERROR' ? 'tanpa koneksi' : e.message}`);
    }
  };

  // Reset lastNotified saat ada pembayaran baru
  const resetLastNotified = async (tagihanId) => {
    const tagihan = tagihans.find((t) => t.id === tagihanId);
    if (!tagihan) return;
    try {
      const updated = await billsApi.update(tagihanId, { ...tagihan, lastNotified: null });
      setTagihans((prev) => prev.map((t) => (t.id === tagihanId ? normalizeTagihan(updated) : t)));
    } catch {
      /* pengingat terkirim; penanda lokal tidak wajib tersimpan */
    }
  };

  /* UseEffect: Cek pengingat tagihan setiap hari (pukul 09:00 sore)
       - Dinonaktifkan sementara karena API Fonnte (api.fonnte.net) tidak dapat
         ter-resolve di environment ini. Pengiriman pengingat akan didisepakati
         hanya melalui tombol "Kirim Tes" di halaman Pengaturan secara manual. */
  // (effect lama dihapus: setInterval + runOnce yang memanggil kirimFonnte)

  // Hitung status tagihan (persentase, sisa, warna)
  const hitungStatusTagihan = (tagihan) => {
    const persentase = tagihan.amount > 0 ? Math.round((tagihan.dibayar / tagihan.amount) * 100) : 0;
    const sisa = tagihan.amount - (tagihan.dibayar || 0);
    let warna = 'green';
    if (persentase >= 100) warna = 'red';
    else if (persentase >= 80) warna = 'orange';
    return { persentase, sisa, warna };
  };

  // Hitung total tagihan per kategori
  const hitungTotalTagihanPerKategori = () => {
    const total = {};
    
    tagihans.forEach((t) => {
      const kategori = t.kategori || 'lainnya';
      if (!total[kategori]) {
        total[kategori] = { amount: 0, dibayar: 0 };
      }
      total[kategori].amount += t.amount;
      total[kategori].dibayar += t.dibayar || 0;
    });
    
    return total;
  };

  // Hitung budget terintegrasi (budget kategori + tagihan rutin)
  const hitungBudgetTerintegrasi = () => {
    // 1. Budget dasar dari kategori yang dikonfigurasi
    const budgetDasar = {};
    budgetCategories.forEach((cat) => {
      budgetDasar[cat.name] = cat.limit || 0;
    });
    
    // 2. Total tagihan per kategori
    const tagihanTotal = hitungTotalTagihanPerKategori();
    
    // 3. Gabungkan: limit budget + spent dari tagihan
    const terintegrasi = {};
    Object.keys(budgetDasar).forEach((kategori) => {
      const tagihanKategori = tagihanTotal[kategori] || { amount: 0, dibayar: 0 };
      terintegrasi[kategori] = {
        limit: budgetDasar[kategori],
        spent: tagihanKategori.dibayar,
        remaining: budgetDasar[kategori] - tagihanKategori.dibayar,
        persentase: tagihanKategori.dibayar > 0 
          ? Math.round((tagihanKategori.dibayar / budgetDasar[kategori]) * 100) 
          : 0,
      };
    });
    
    return terintegrasi;
  };

  // Konversi tagihans ke options select kategori
  const getTagihanCategoryOptions = () => {
    if (!tagihans || tagihans.length === 0) {
      return catOptions(FINANCE_CATEGORIES);
    }
    return tagihans
      .filter((t) => t.kategori && t.kategori !== 'semua')
      .map((t) => ({ value: t.kategori, label: t.kategori }))
      .concat([{ value: 'semua', label: 'Semua' }]);
  };

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
        { key: 'amount', label: 'Nominal (Rp)', type: 'currency', required: true, min: 0, placeholder: 'Rp 0' },
        { key: 'date', label: 'Tanggal', type: 'date', required: true, defaultValue: todayKey() },
        { key: 'category', label: 'Kategori', type: 'select', required: true, defaultValue: getBudgetCategoryOptions()[0].value, options: getBudgetCategoryOptions() },
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
    income: {
      title: 'Tambah Pemasukan',
      icon: 'wallet',
      fields: [
        { key: 'description', label: 'Sumber / Keterangan', type: 'text', required: true, placeholder: 'contoh: Gaji bulan ini, Projek desain' },
        { key: 'amount', label: 'Nominal (Rp)', type: 'currency', required: true, min: 0, placeholder: 'Rp 0' },
        { key: 'date', label: 'Tanggal', type: 'date', required: true, defaultValue: todayKey() },
        { key: 'category', label: 'Kategori', type: 'select', required: true, defaultValue: catOptions(INCOME_CATEGORIES)[0].value, options: catOptions(INCOME_CATEGORIES) },
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
        { key: 'body', label: 'Isi catatan', type: 'textarea', rows: 3, placeholder: 'tulis detail catatan di sini...' },
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
    scheduledTemplate: {
      title: 'Tambah Template Pengeluaran Terjadwal',
      icon: 'repeat',
      fields: [
        { key: 'name', label: 'Nama template', type: 'text', required: true, placeholder: 'contoh: Bulanan listrik' },
        { key: 'amount', label: 'Nominal (Rp)', type: 'currency', required: true, min: 0, placeholder: 'Rp 0' },
        { key: 'category', label: 'Kategori', type: 'select', required: true, defaultValue: 'utilitas', options: [...catOptions(FINANCE_CATEGORIES), { value: 'lainnya', label: 'Lainnya' }] },
        { key: 'day', label: 'Hari jatuh tempo', type: 'number', required: true, min: 1, max: 31, defaultValue: 1, placeholder: '1-31' },
        { key: 'bucket', label: 'Keranjang', type: 'select', required: true, defaultValue: 'auto', options: [{ value: 'auto', label: 'Otomatis' }, { value: 'needs', label: 'Kebutuhan' }, { value: 'wants', label: 'Keinginan' }, { value: 'savings', label: 'Tabungan & Utang' }] },
        { key: 'active', label: 'Aktif', type: 'checkbox', help: 'Nonaktifkan template jika tidak digunakan' },
      ],
    },
    // Shopping list - item ditambah lewat form inline di ShoppingList.jsx,
    // form ini untuk buka catatan baru bila need (saat ini tidak dipakai)
    shopping: {
      title: 'Tambah Item Belanja',
      icon: 'shoppingBag',
      fields: [
        { key: 'nama', label: 'Nama item', type: 'text', required: true, placeholder: 'contoh: Beras 5 kg' },
        { key: 'qty', label: 'Jumlah', type: 'number', required: true, min: 1, defaultValue: 1, placeholder: '1' },
        { key: 'harga', label: 'Harga per unit (Rp)', type: 'currency', min: 0, defaultValue: 0, placeholder: 'Rp 0' },
      ],
    },
    service: {
      title: 'Tambah Perawatan',
      icon: 'wrench',
      fields: [
        { key: 'nama', label: 'Nama perawatan', type: 'text', required: true, placeholder: 'contoh: Ganti oli' },
        { key: 'intervalType', label: 'Jenis interval', type: 'select', options: [
          { value: 'km', label: 'KM' },
          { value: 'month', label: 'Bulan' },
        ]},
        { key: 'intervalValue', label: 'Interval', type: 'number', min: 1, defaultValue: 3000 },
      ],
    },
  };

  useEffect(() => {
    // Inisialisasi budget categories dari localStorage saat app dimulai
    initBudgetCategories();
  }, []);


  // Sub-tampilan Keuangan: 'ringkasan' (default) | 'pengeluaran' | 'anggaran' | 'pemasukan' | 'tagihan'
  const [financeMode, setFinanceMode] = useState('ringkasan');
  // Bulan yang ditinjau di tab Ringkasan (YYYY-MM). Tidak bisa maju dari bulan berjalan.
  const [summaryMonth, setSummaryMonth] = useState(() => monthKeyOf(new Date()));
  // Sub-tampilan Keuangan: daftar pengeluaran | halaman Anggaran (50/30/20)
  // (financeMode dideklarasikan di atas bersama financeFilter/incomeFilter)
  // Filter bagian keluarga (default: semua) � pola sama dengan agenda & keuangan
  const [familyFilter, setFamilyFilter] = useState('semua');
  // Filter tugas: status (semua/belum/selesai) & prioritas (tinggi/sedang/rendah)
  const [taskFilter, setTaskFilter] = useState('semua');
  // Filter catatan: semua | penting (disematkan) | kategori
  const [noteFilter, setNoteFilter] = useState('semua');
  // Pencarian catatan (judul + isi) � hanya berlaku di tab Catatan
  const [noteQuery, setNoteQuery] = useState('');
  // Tab aktif Service (inventory/history)
  const [serviceActiveTab, setServiceActiveTab] = useState('history');
  // Notifikasi ringkas + tombol "Urungkan" (undo hapus)
  const [toast, setToast] = useState(null);
  // Notifikasi belum dibaca: daftar `id` yang sudah dilihat (tersimpan)
  const [notifRead, setNotifRead] = useState(readNotifRead);
  // Tab aktif di halaman "Tugas Terjadwal" (pengeluaran/tabungan/belanja/service)
  const [terjadwalTab, setTerjadwalTab] = useState('pengeluaran');
  // Periode daftar belanja: 'mingguan' | 'bulanan'.
  const [shoppingPeriod, setShoppingPeriod] = useState('bulanan');
  // Tab awal saat halaman Akun dibuka (default 'profil'; 'keamanan' dari Pengaturan)
  const [accountInitialTab, setAccountInitialTab] = useState('profil');
  // Preset "posisi dalam silsilah" saat AccountModal dibuka dari placeholder FamilyTree
  const [accountInitialGenerasi, setAccountInitialGenerasi] = useState(null);
  // Data state � dimuat dari API + localStorage cache
  const [data, setData] = useState(null);
  // Loading state untuk data API
  const [dataLoading, setDataLoading] = useState(false);

  // dataRef menjaga snapshot terbaru untuk aksi yang berjalan belakangan
  // (mis. tombol "Urungkan" dari toast) tanpa closure basi.
  const dataRef = useRef(data);

  const saveData = (next) => {
    const normalized = {
      schedule: [],
      expenses: [],
      income: [],
      notes: [],
      tasks: [],
      chores: [],
      debts: [],
      vehicles: [],
      family: [],
      familyMedical: [],
      familyDocuments: [],
      familyContacts: [],
      serviceInventory: [],
      serviceHistory: [],
      scheduledExpenses: [],
      subs: [],
      goals: [],
      ...next,
    };
    dataRef.current = normalized;
    setData(normalized);
    persist(normalized);
  };

  // Tema: pilihan pengguna ('system' | 'light' | 'dark') + preferensi perangkat.
  // Tema yang benar-benar dipakai = hasil resolusi keduanya.
  const [theme, setTheme] = useState(readStoredTheme);
  const [systemLight, setSystemLight] = useState(systemPrefersLight);
  const resolvedTheme = theme === 'system' ? (systemLight ? 'light' : 'dark') : theme;

  // ---- Auth check on mount ----
  // Jika ada token di localStorage, verifikasi dengan /auth/me.
  // Jika valid ? mark logged in + fetch data. Jika invalid ? clear & show login.
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Dev: auto-login tanpa lewat Google, pakai akun dari .env.development
      // (VITE_DEV_USER / VITE_DEV_PASS). Kalau tidak diset, kembali ke login biasa.
      const devUser = import.meta.env.VITE_DEV_USER;
      const devPass = import.meta.env.VITE_DEV_PASS;
      if (!devUser || !devPass) {
        clearAuthToken();
        setIsLoggedIn(false);
        setAuthChecking(false);
        setAuthReady(true);
        return;
      }
      // Dev: login lewat proxy Vite (/api → API produksi) agar sama-origin,
      // tidak terganggu CORS untuk origin localhost.
      (async () => {
        try {
          const apiBase = import.meta.env.VITE_API_URL || '/api';
          const res = await fetch(`${apiBase}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: devUser, password: devPass }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
          setToken(data.data.token, true);
          const u = data.data.user;
          const fresh = {
            id: u.id,
            name: u.nama,
            username: u.username,
            role: u.role,
            family_role: u.family_role || 'anak',
            generasi: u.generasi || 'orangtua',
            birthDate: u.birth_date || null,
            nickname: u.nickname || null,
            phone: u.phone || null,
            avatar: u.avatar_url || null,
            initials: initialsOf(u.nickname || u.nama),
            group_id: u.group_id || null,
            group_role: u.group_role || 'anak',
            group_name: u.group_name || null,
          };
          setCurrentUser(fresh);
          storeUser(fresh);
          setIsLoggedIn(true);
          setAuthError('');
          setEntered(true);
        } catch {
          clearAuthToken();
          setIsLoggedIn(false);
          setAuthError('Auto-login dev gagal. Periksa VITE_DEV_USER / VITE_DEV_PASS di .env.development.');
        } finally {
          setAuthChecking(false);
          setAuthReady(true);
        }
      })();
      return;
    }
    if (!storedToken()) {
      setAuthChecking(false);
      setAuthReady(true);
      return;
    }
    setAuthChecking(true);
    auth.me()
      .then((user) => {
        // Token valid � user sudah terautentikasi.
        // Segarkan currentUser dari server: grup & peran bisa berubah
        // (mis. Kepala Keluarga menurunkan peran anggota) � jangan pakai
        // snapshot localStorage yang mungkin basi.
        const fresh = {
          id: user.id,
          name: user.nama,
          username: user.username,
          role: user.role,
          family_role: user.family_role || 'anak',
          generasi: user.generasi || 'orangtua',
          birthDate: user.birth_date || null,
          nickname: user.nickname || null,
          phone: user.phone || null,
          avatar: user.avatar_url || null,
          initials: initialsOf(user.nickname || user.nama),
          group_id: user.group_id || null,
          group_role: user.group_role || 'anak',
          group_name: user.group_name || null,
        };
        setCurrentUser((prev) => (prev && prev.id === fresh.id ? { ...prev, ...fresh } : fresh));
        storeUser(fresh);
        setIsLoggedIn(true);
        setAuthError('');
        // Auto-enter: tidak perlu login lagi kalau token masih valid
        setEntered(true);
      })
      .catch((err) => {
        // Token invalid/expired ? clear & show login
        clearUser();
        setIsLoggedIn(false);
        setAuthError(err.message === 'UNAUTHORIZED'
          ? 'Sesi berakhir. Masuk lagi.'
          : 'Tidak dapat memverifikasi sesi.');
      })
      .finally(() => {
        setAuthChecking(false);
        setAuthReady(true);
      });
  }, []);

  // Migrasi sekali: tasks lama dari localStorage → backend (kalau backend masih
  // kosong). Cegah data yang sudah dipakai hilang setelah pindah ke D1.
  useEffect(() => {
    if (!isLoggedIn || !authReady || !data) return;
    const snap = loadSnapshot();
    const localTasks = Array.isArray(snap?.tasks) ? snap.tasks : [];
    const backendEmpty = !data.tasks || data.tasks.length === 0;
    if (localTasks.length > 0 && backendEmpty) {
      (async () => {
        for (const t of localTasks) {
          try {
            await tasksApi.create({ title: t.title, dueDate: t.dueDate || null, priority: t.priority, assignedTo: t.assignedTo });
          } catch { /* lanjutkan */ }
        }
        // hapus tasks dari snapshot lokal supaya tidak migrasi ulang
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const p = JSON.parse(raw);
            delete p.tasks;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
          }
        } catch {}
        loadFromAPI();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, authReady, data]);

  // ---- Web Push: subscribe saat login (authReady) ----
  useEffect(() => {
    if (!isLoggedIn || !authReady) return;
    let cancelled = false;
    (async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        const reg = await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY || ''),
        });
        if (!cancelled) await pushApi.subscribe(sub);
      } catch {
        /* izin ditolak / tidak didukung — abaikan */
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn, authReady]);

  // ---- Fetch data from API when logged in ----
  const loadFromAPI = async () => {
    if (!isOnline) {
      // Offline ? gunakan cache
      const cached = readApiCache();
      if (cached) {
        const merged = buildMergedData(cached, currentUser);
        saveData(merged);
      } else {
        // Tidak ada cache ? tetap tampilkan app dengan data lokal saja
        const merged = buildDataBundle({}, currentUser);
        saveData(merged);
        pushToast({ message: 'Offline: hanya data lokal yang tersedia.', duration: 4000, tone: 'warning' });
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
      // API fail ? fallback ke cache, tampilkan notif
      const cached = readApiCache();
      if (cached) {
        const merged = buildMergedData(cached, currentUser);
        saveData(merged);
        setAuthError('Tidak dapat memuat data dari server. Menampilkan cache lokal.');
      } else {
        // Tidak ada cache sama sekali ? tampilkan app dengan data lokal
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
    if (isLoggedIn && authReady) {
      loadFromAPI();
      refreshGcalStatus();
    }
  }, [isLoggedIn, authReady]);

  // Migrasi sekali-jalan: template pengeluaran terjadwal lama yang tersimpan
  // di settings (blob "scheduled_expenses") dipindah ke /rec/scheduled,
  // lalu key lama dibersihkan. Menjalankan sekali per sesi.
  const scheduledMigratedRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || !authReady || scheduledMigratedRef.current) return;
    scheduledMigratedRef.current = true;
    (async () => {
      try {
        const all = await settingsApi.fetchAll();
        const row = all.find((s) => s.key === 'scheduled_expenses');
        if (!row?.value) return;
        const parsed = JSON.parse(row.value);
        if (!Array.isArray(parsed) || parsed.length === 0) return;
        const existing = await scheduledTasksApi.fetch();
        for (const tpl of parsed) {
          if (!tpl?.name) continue;
          const dup = existing.some((t) => t.type === 'pengeluaran' && t.name === tpl.name);
          if (dup) continue;
          await scheduledTasksApi.create({
            type: 'pengeluaran',
            name: tpl.name,
            amount: Number(tpl.amount) || 0,
            category: tpl.category || 'lainnya',
            day: Number(tpl.day) || 1,
            active: tpl.active !== false,
          });
        }
        // Bersihkan blob lama setelah berhasil migrasi.
        try { await settingsApi.upsert('scheduled_expenses', '[]'); } catch {}
        loadFromAPI();
      } catch (e) {
        console.warn('Migrasi pengeluaran terjadwal gagal:', e.message);
      }
    })();
  }, [isLoggedIn, authReady]);

  // Effect: auto-create scheduled expenses saat app mount
  // DIPINDAHKAN ke cron backend (createScheduledTransactions) — di sini
  // dinonaktifkan supaya tidak duplikasi. Cron membuat transaksi otomatis
  // pada tanggal jatuh tempo tanpa perlu app terbuka.
  // (Efek lama dihapus: loop tpl + txn.create di frontend)
  useEffect(() => {
    return;
    // eslint-disable-next-line no-unreachable
    if (!isLoggedIn || !data || !data.scheduledExpenses) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate(); // 1-31

    // Cek tiap scheduled expense template
    data.scheduledExpenses.forEach((tpl) => {
      if (!tpl.active) return;

      // Normalisasi day jika 31 ? dipangkas ke hari terakhir bulan itu
      const normalizedDay = tpl.day > 28 ? 
        new Date(year, month, 0).getDate() : tpl.day;

      // Cek apakah transaksi sudah dibuat bulan ini (lihat lastRunMonth)
      const alreadyCreated = data.expenses.some((e) => 
        e.bucket === 'scheduled' && 
        e.description === tpl.name && 
        ((e.date || '').startsWith(`${year}-${pad2(month)}`))
      );

      if (!alreadyCreated && normalizedDay === day) {
        // Buat transaksi otomatis
        const amount = Number(tpl.amount) || 0;
        const category = tpl.category || 'lainnya';
        const date = `${year}-${pad2(month)}-${pad2(normalizedDay)}`;

        txn.create({ amount, type: 'out', category, description: tpl.name, date, bucket: 'scheduled' })
          .then((result) => {
            // Tambahkan ke state setelah berhasil
            const resultTxn = txnTransform.toTxn(result);
            saveData({
              ...data,
              expenses: [...(data.expenses || []), resultTxn],
            });
            // Update lastRunMonth untuk template ini
            const tplIndex = data.scheduledExpenses.findIndex((t) => t.id === tpl.id);
            if (tplIndex >= 0) {
              const updatedTemplates = [...data.scheduledExpenses];
              updatedTemplates[tplIndex].lastRunMonth = monthKeyOf(new Date(date));
              saveData({
                ...data,
                scheduledExpenses: updatedTemplates,
              });
            }
          })
          .catch((err) => {
            console.error('Gagal membuat transaksi scheduled:', err.message);
          });
      }
    });
  }, [isLoggedIn, data]);

  // Effect: reload data ketika online kembali
  useEffect(() => {
    if (isOnline && isLoggedIn && authReady && data) {
      loadFromAPI();
    }
  }, [isOnline, authReady]);

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
      /* localStorage dilarang ? tema tetap jalan untuk sesi ini */
    }
  }, [theme, resolvedTheme]);

  // Terapkan preferensi tampilan (font-size density + mode kompak) saat buka app.
  useEffect(() => {
    applyUiPrefs(readUiPrefs());
  }, []);

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
  // (dari 'system' pun jadi pilihan tegas light/dark � tidak membingungkan).
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  // Toast: tambah/ubah = konfirmasi singkat; hapus = tawarkan "Urungkan".
  const pushToast = (t) => setToast({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...t });
  const dismissToast = (id) => setToast((prev) => (prev && prev.id === id ? null : prev));

  // Toggle selesai tugas — update state (optimistic) + sinkron ke backend.
  const toggleTask = (taskId) => {
    const target = dataRef.current.tasks.find((t) => t.id === taskId);
    if (!target) return;
    const nextCompleted = !target.completed;
    saveData({
      ...dataRef.current,
      tasks: dataRef.current.tasks.map((t) => (t.id === taskId ? { ...t, completed: nextCompleted } : t)),
    });
    tasksApi.update(taskId, { completed: nextCompleted }).catch(() => {});
  };

  // Reset data ke seed (tombol di LoginScreen � hanya untuk dev)
  const resetData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(API_CACHE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      /* abaikan */
    }
    clearUser();
    setIsLoggedIn(false);
  };

  /* Simpan perubahan profil akun yang sedang aktif (nama, username, avatar,
     password). Backend belum punya endpoint PUT /users ? semua perubahan
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
    // Cache lokal (optimistic) supaya modal langsung terisi
    storeUser({ id: currentUser.id, nama: patch.name, username: patch.username, role: currentUser.role, family_role: currentUser.family_role, generasi: currentUser.generasi, nickname: currentUser.nickname, birth_date: currentUser.birthDate, phone: currentUser.phone, avatar_url: patch.avatar });
    // Simpan nama + avatar ke server (PUT /auth/me) supaya tampil di semua perangkat
    auth.updateProfile({ nama: patch.name, nickname: currentUser.nickname, avatarUrl: patch.avatar || null })
      .then((updated) => {
        setCurrentUser((prev) => (prev
          ? { ...prev, name: updated.nama, avatar: updated.avatar_url || null }
          : prev));
        storeUser({ id: currentUser.id, nama: updated.nama, username: currentUser.username, role: currentUser.role, family_role: currentUser.family_role, generasi: currentUser.generasi, birth_date: currentUser.birthDate, phone: updated.phone ?? currentUser.phone, avatar_url: updated.avatar_url });
        loadFromAPI(); // segarkan tree (avatar/nama)
        pushToast({ message: 'Profil akun diperbarui', duration: 2500 });
      })
      .catch((err) => {
        pushToast({ message: 'Gagal menyimpan ke server: ' + err.message + ' (perubahan hanya di perangkat ini)', duration: 4000, tone: 'warning' });
      });
  };

  // Helper: recompute derived data (monthlyTrend, weekly, categories) setelah expenses berubah
  const recomputeDerived = (expenses) => {
    const trend = computeMonthlyTrend(expenses);
    const weekly = computeWeekly(expenses);
    const categories = computeCategories(expenses);
    return { trend, weekly, categories };
  };

  // Helper: recompute derived data pemasukan (tren + komposisi kategori)
  const recomputeIncomeDerived = (income) => ({
    incomeTrend: computeMonthlyTrend(income),
    incomeCategories: computeCategories(income, INCOME_CATEGORIES, INCOME_COLOR_MAP),
  });

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
    } else if (section === 'income') {
      next = { ...current, income: [...(current.income || []), item] };
      const d = recomputeIncomeDerived(next.income);
      next.incomeTrend = d.incomeTrend;
      next.incomeCategories = d.incomeCategories;
    } else if (section === 'tasks') {
      next = { ...current, tasks: [...(current.tasks || []), item] };
    } else if (section === 'notes') {
      next = { ...current, notes: [...(current.notes || []), item] };
    } else if (section === 'family') {
      if (item.bagian === 'anggota') {
        next = { ...current, family: [...(current.family || []), { id: item.id, name: item.title, role: 'Anggota', initials: item.initials, status: 'active', birthDate: '', blood: '', allergy: '', phone: item.meta || '' }] };
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
      if (section === 'income') return { ...item, type: 'in', description: values.description, amount: Number(values.amount) || 0, date: values.date, category: values.category };
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
    if (section === 'income') {
      const d = recomputeIncomeDerived(updated);
      next.incomeTrend = d.incomeTrend;
      next.incomeCategories = d.incomeCategories;
    }
    saveData(next);
  };

  // Helper: delete item dari state
  const removeItemFromState = (section, item) => {
    if (section === 'family') {
      const bagian = ['medis', 'dokumen', 'kontak'].find((b) => ((dataRef.current[FAMILY_SECTION_KEY[b]] || []).some((i) => i.id === item.id)));
      if (bagian) {
        const key = FAMILY_SECTION_KEY[bagian];
        const next = { ...dataRef.current, [key]: (dataRef.current[key] || []).filter((it) => it.id !== item.id) };
        saveData(next);
      }
      return;
    }
    const key = SECTION_KEY[section];
    const list = dataRef.current[key] || [];
    const next = { ...dataRef.current, [key]: list.filter((it) => it.id !== item.id) };
    if (section === 'expenses') {
      const d = recomputeDerived(next.expenses);
      next.monthlyTrend = d.trend;
      next.weekly = d.weekly;
      next.categories = d.categories;
    }
    if (section === 'income') {
      const d = recomputeIncomeDerived(next.income);
      next.incomeTrend = d.incomeTrend;
      next.incomeCategories = d.incomeCategories;
    }
    saveData(next);
  };

  // Tambah item � untuk section yang terhubung API, panggil API dulu,
  // lalu update state. Untuk section lokal (tasks, family), update state langsung.
  const addItem = async (section, values) => {
    if (!isOnline) {
      // Offline ? tambah lokal saja
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
      } else if (section === 'income') {
        const result = await txn.create({ type: 'in', category: values.category, description: values.description, amount: Number(values.amount) || 0, date: values.date });
        addItemToState(section, result);
      } else if (section === 'notes') {
        const result = await notesApi.create({ title: values.title, body: values.body || '', category: values.category, pinned: !!values.pinned }, currentUser);
        addItemToState(section, result);
      } else if (section === 'tasks') {
        const result = await tasksApi.create({ title: values.title, dueDate: values.dueDate || null, priority: values.priority, assignedTo: values.assignedTo });
        addItemToState(section, mapTask(result));
      } else if (section === 'family' && values.bagian && values.bagian !== 'anggota') {
        const result = await familyEntryApi.create({ bagian: values.bagian, title: values.title, meta: values.meta || '' });
        addItemToState(section, { ...mapFamilyEntry(result), bagian: values.bagian });
      } else {
        // Local-only: family
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
    if (section === 'income') return { id, type: 'in', description: values.description, amount: Number(values.amount) || 0, date: values.date, category: values.category };
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

  // Ubah item � untuk section yang terhubung API, panggil API.
  const updateItem = async (section, id, values) => {
    const key = SECTION_KEY[section];
    const current = dataRef.current;

    if (!isOnline) {
      // Offline ? update lokal
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
      } else if (section === 'income') {
        const result = await txn.update(id, txnTransform.toPayload({ type: 'in', category: values.category, description: values.description, amount: Number(values.amount) || 0, date: values.date }));
        const updated = txnTransform.toTxn(result);
        const list = current[key] || [];
        const next = { ...current, [key]: list.map((it) => (it.id === id ? updated : it)) };
        const d = recomputeIncomeDerived(next.income);
        next.incomeTrend = d.incomeTrend;
        next.incomeCategories = d.incomeCategories;
        saveData(next);
      } else if (section === 'notes') {
        const result = await notesApi.update(id, noteTransform.toPayload({ title: values.title, body: values.body, category: values.category, pinned: !!values.pinned }), currentUser);
        const updated = noteTransform.toNote(result, currentUser);
        const list = current[key] || [];
        saveData({ ...current, [key]: list.map((it) => (it.id === id ? updated : it)) });
      } else if (section === 'tasks') {
        const result = await tasksApi.update(id, { title: values.title, dueDate: values.dueDate || null, priority: values.priority, assignedTo: values.assignedTo });
        const updated = mapTask(result);
        const list = current[key] || [];
        saveData({ ...current, [key]: list.map((it) => (it.id === id ? updated : it)) });
      } else if (section === 'family') {
        const bagian = ['medis', 'dokumen', 'kontak'].find((b) => (current[FAMILY_SECTION_KEY[b]] || []).some((i) => i.id === id));
        if (bagian) {
          const result = await familyEntryApi.update(id, { bagian, title: values.title, meta: values.meta || '' });
          const updated = mapFamilyEntry(result);
          const key = FAMILY_SECTION_KEY[bagian];
          const list = current[key] || [];
          saveData({ ...current, [key]: list.map((it) => (it.id === id ? updated : it)) });
        } else {
          updateItemInState(section, id, values);
        }
      } else {
        // Local-only
        updateItemInState(section, id, values);
      }
      pushToast({ message: `${SECTION_LABEL[section]} diperbarui`, duration: 2500 });
    } catch (err) {
      pushToast({ message: `Gagal memperbarui ${SECTION_LABEL[section].toLowerCase()}: ${err.message}`, duration: 4000, tone: 'danger' });
    }
  };

  // Simpan gaji & rasio anggaran (keuangan ? settings API)
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

  // Simpan pos anggaran (tambah/ubah) � keuangan settings
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
        /* gagal sinkron � tetap tersimpan di localStorage */
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
    if (!canWrite) {
      pushToast({ message: 'Peran Anda hanya boleh melihat data keluarga.', duration: 3500, tone: 'danger' });
      return;
    }
    let key = SECTION_KEY[section];
    let bagian = null;
    if (section === 'family') {
      bagian = ['medis', 'dokumen', 'kontak'].find((b) => ((dataRef.current[FAMILY_SECTION_KEY[b]] || []).some((i) => i.id === item.id)));
      key = bagian ? FAMILY_SECTION_KEY[bagian] : null;
    }
    const list = (key ? dataRef.current[key] : []) || [];
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
        } else if (section === 'income') {
          await txn.delete(item.id);
        } else if (section === 'notes') {
          await notesApi.delete(item.id);
        } else if (section === 'tasks') {
          await tasksApi.remove(item.id);
        } else if (section === 'family' && bagian) {
          await familyEntryApi.remove(item.id);
        }
      } catch (err) {
        // API gagal ? restore ke state, tampilkan error
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
          else if (section === 'income') txn.create(item).catch(() => {});
          else if (section === 'notes') notesApi.create(item, currentUser).catch(() => {});
          else if (section === 'tasks') tasksApi.create({ title: item.title, dueDate: item.dueDate || null, priority: item.priority, assignedTo: item.assignedTo }).catch(() => {});
          else if (section === 'family' && bagian) familyEntryApi.create({ bagian, title: item.title, meta: item.meta || '' }).catch(() => {});
        }
      },
    });
  };

  // Bottom sheet "Tambah/Ubah" � null = tertutup, selain itu = kunci section.
  const [sheetOpen, setSheetOpen] = useState(null);
  // Mode ubah: { section, id } item yang sedang diedit + nilai awal formnya.
  const [editing, setEditing] = useState(null);
  const [sheetInitial, setSheetInitial] = useState(null);

  // `nilaiAwal` dipakai untuk form yang datang dengan konteks terisi
  // (mis. "Tambah pos" dari salah satu kartu keranjang ? keranjang sudah dipilih).
  const openAdd = (section, nilaiAwal = null) => {
    setEditing(null);
    setSheetInitial(nilaiAwal);
    setSheetOpen(section);
  };

  const startVoiceExpense = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      pushToast({ message: 'Browser tidak mendukung input suara.', tone: 'warning', duration: 4000 });
      return;
    }
    if (voiceListening) return;
    const rec = new SR();
    rec.lang = 'id-ID';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = async (e) => {
      const text = e.results?.[0]?.[0]?.transcript || '';
      if (!text.trim()) {
        pushToast({ message: 'Tidak ada suara terdeteksi.', tone: 'warning', duration: 3500 });
        return;
      }
      const parsed = parseVoiceExpense(text);
      if (parsed.amount > 0) {
        if (!canWrite) {
          pushToast({ message: 'Peran Anda hanya boleh melihat data.', tone: 'danger', duration: 3500 });
          return;
        }
        const payload = {
          category: parsed.category,
          description: parsed.description,
          amount: parsed.amount,
          date: todayKey(),
          bucket: 'auto',
        };
        if (isOnline) {
          try {
            const result = await txn.create(payload);
            addItemToState('expenses', result);
            pushToast({ message: `Tercatat: ${parsed.description} (${formatCurrency(parsed.amount)})`, duration: 3500 });
            return;
          } catch { /* fallback lokal */ }
        }
        const id = Date.now();
        addItemToState('expenses', { id, ...payload });
        pushToast({ message: `Tercatat (offline): ${parsed.description}`, duration: 3500 });
      } else {
        openAdd('expenses', { description: text, amount: '', category: parsed.category });
        pushToast({ message: 'Suara terbaca; lengkapi form lalu simpan.', duration: 3500 });
      }
    };
    rec.onerror = (ev) => {
      setVoiceListening(false);
      if (ev?.error === 'no-speech') {
        pushToast({ message: 'Tidak ada suara terdeteksi.', tone: 'warning', duration: 3500 });
      } else {
        pushToast({ message: 'Gagal mendengar suara.', tone: 'danger', duration: 3000 });
      }
      if (voiceCleanupRef.current) { voiceCleanupRef.current(); voiceCleanupRef.current = null; }
    };
    rec.onend = () => {
      setVoiceListening(false);
      if (voiceCleanupRef.current) { voiceCleanupRef.current(); voiceCleanupRef.current = null; }
    };
    voiceRecRef.current = rec;
    setVoiceListening(true);
    setVoiceLevels(Array(8).fill(0));
    try {
      rec.start();
    } catch {
      setVoiceListening(false);
    }

    // Level mic untuk animasi gelombang (best-effort).
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let raf = 0;
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const levels = Array.from({ length: 8 }, (_, i) => {
            const idx = Math.floor((i + 0.5) * (data.length / 8));
            return Math.min(1, (data[idx] || 0) / 255);
          });
          setVoiceLevels(levels);
          raf = requestAnimationFrame(tick);
        };
        tick();
        voiceCleanupRef.current = () => {
          cancelAnimationFrame(raf);
          stream.getTracks().forEach((t) => t.stop());
          try { ctx.close(); } catch {}
          setVoiceLevels(Array(8).fill(0));
        };
      }
    } catch {
      /* tidak bisa akses mic level; animasi tetap jalan via CSS */
    }
  };

  // Buka form tambah template pengeluaran terjadwal
  const openAddScheduledTemplate = () => {
    setEditing(null);
    setSheetInitial(null);
    setSheetOpen('scheduledTemplate');
  };

  // Hasil pemindaian struk disimpan lewat jalur yang sama dengan form
  // "Tambah Pengeluaran", supaya ikut hitungan anggaran, daftar & total.
  const simpanStruk = async (values) => {
    await addItem('expenses', { ...values, bucket: 'auto' });
    setScanOpen(false);
  };
  // Klik placeholder "+ Tambah" di FamilyTree ? buka halaman Akun dengan generasi preset
  const handleTreeAdd = (generasi) => {
    setAccountInitialGenerasi(generasi);
    setAccountInitialTab('profil');
    setActiveSection('akun');
  };

  // Simpan template pengeluaran terjadwal (backend /rec/scheduled)
  const saveScheduledTemplate = async (values) => {
    const { name, amount, category, day, bucket, active } = values;
    const editId = editing && editing.section === 'scheduledTemplate' ? editing.id : null;

    const payload = {
      type: 'pengeluaran',
      name,
      amount: Number(amount) || 0,
      category: category || 'lainnya',
      day: Number(day) || 1,
      active: active !== false,
    };

    try {
      if (editId) {
        await scheduledTasksApi.update(editId, payload);
      } else {
        const existing = await scheduledTasksApi.fetch();
        if (existing.some((t) => t.name === name && t.type === 'pengeluaran')) {
          pushToast({ message: `Template "${name}" sudah ada`, duration: 3000, tone: 'warning' });
          return;
        }
        await scheduledTasksApi.create(payload);
      }
      pushToast({ message: 'Template pengeluaran terjadwal disimpan', duration: 2500 });
    } catch (e) {
      // Offline / gagal sinkron → simpan lokal sementara, tanpa hilang.
      console.warn('Gagal sinkron template terjadwal:', e.message);
      pushToast({ message: 'Template disimpan Lokal (gagal sinkron)', duration: 4000, tone: 'warning' });
    }

    // Segarkan dari backend (atau tetap state lokal bila offline).
    try {
      const list = await scheduledTasksApi.fetch();
      saveData({
        ...data,
        scheduledExpenses: list
          .filter((t) => t.type === 'pengeluaran')
          .map((t) => ({ id: t.id, name: t.name, amount: t.amount, day: t.day, active: t.active })),
      });
    } catch {
      /* biarkan state lokal */
    }
  };

  const deleteScheduledTemplate = async (id) => {
    const tpl = data.scheduledExpenses.find((t) => String(t.id) === String(id));
    const nama = tpl?.name || 'template ini';
    const ok = window.confirm(`Hapus pengeluaran terjadwal "${nama}"?`);
    if (!ok) return;
    try {
      await scheduledTasksApi.delete(id);
    } catch (e) {
      console.warn('Gagal hapus template terjadwal:', e.message);
    }
    const next = data.scheduledExpenses.filter((t) => String(t.id) !== String(id));
    saveData({ ...data, scheduledExpenses: next });
    pushToast({ message: 'Template pengeluaran terjadwal dihapus', duration: 2500 });
  };

  // Konfirmasi sebelum catat: pengeluaran terjadwal yang jatuh tempo bulan ini
  // tetapi belum tercatat, baru dibuat transaksinya setelah user menekan "Catat".
  const recordScheduledExpense = async (tpl) => {
    if (!canWrite) return;
    try {
      const result = await txn.create({
        category: tpl.category || 'lainnya',
        description: tpl.name,
        amount: Number(tpl.amount) || 0,
        date: todayKey(),
        bucket: 'auto',
      });
      addItemToState('expenses', result);
      pushToast({ message: `${tpl.name} dicatat sebagai pengeluaran`, duration: 2500 });
    } catch (e) {
      pushToast({ message: 'Gagal mencatat: ' + e.message, duration: 4000, tone: 'danger' });
    }
  };

// Setelah daftar akun / simpan profil: segarkan data + perbarui currentUser
  // (hindari field tanggal lahir basi) + reset preset agar bisa trigger lagi.
  const handleProfileSaved = (updatedUser) => {
    if (updatedUser) {
      const merged = {
        ...currentUser,
        name: updatedUser.nama || currentUser.name,
        nickname: updatedUser.nickname ?? currentUser.nickname ?? null,
        birthDate: updatedUser.birth_date ?? currentUser.birthDate,
        phone: updatedUser.phone ?? currentUser.phone ?? null,
      };
      setCurrentUser(merged);
      storeUser({
        id: merged.id, nama: merged.name, username: merged.username, role: merged.role,
        family_role: merged.family_role, generasi: merged.generasi, nickname: merged.nickname,
        birth_date: merged.birthDate, phone: merged.phone, avatar_url: merged.avatar_url,
      });
    }
    setAccountInitialGenerasi(null); // reset preset ? klik "+" berikutnya tetap bekerja
    pushToast({ message: 'Perubahan tersimpan', duration: 2500 });
    loadFromAPI();
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

  // Kirim dari FormSheet: mode ubah ? perbarui item, mode tambah ? tambah baru.
  // Pos anggaran punya jalur sendiri (bukan array di `data`, tapi `budget.pos`).
  const submitSheet = (section, values) => {
    // Penjaga pusat: peran baca-saja (anak/cucu) tak bisa menulis data keluarga.
    if (!canWrite) {
      pushToast({ message: 'Peran Anda hanya boleh melihat data keluarga.', duration: 3500, tone: 'danger' });
      return;
    }
    if (section === 'budgetPos') {
      savePos(values, editing && editing.section === 'budgetPos' ? editing.id : null);
      return;
    }
    if (section === 'scheduledTemplate') {
      saveScheduledTemplate(values);
      return;
    }
    if (section === 'shopping') {
      addShoppingItem(values);
      return;
    }
    if (section === 'service') {
      addSparepart(values);
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
      ...(data.family || []).map((m) => ({ ...m, category: 'anggota' })),
      ...(data.familyMedical || []).map((h) => ({ ...h, category: 'medis' })),
      ...(data.familyContacts || []).map((c) => ({ ...c, category: 'kontak' })),
      ...(data.familyDocuments || []).map((d) => ({ ...d, category: 'dokumen' })),
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
  // Note kategori `belanja` (template + bulan) disembunyikan dari tab Catatan.
  const filteredNotes = useMemo(() => {
    if (!data) return [];
    const base =
      noteFilter === 'semua'
        ? (data.notes || []).filter((n) => n.category !== SHOPPING_CATEGORY && n.category !== SERVICE_CATEGORY)
        : noteFilter === 'penting'
          ? (data.notes || []).filter((n) => n.pinned && n.category !== SHOPPING_CATEGORY && n.category !== SERVICE_CATEGORY)
          : (data.notes || []).filter((n) => n.category === noteFilter && n.category !== SHOPPING_CATEGORY && n.category !== SERVICE_CATEGORY);
    const q = noteQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((n) => `${n.title} ${n.body || ''}`.toLowerCase().includes(q));
  }, [data, noteFilter, noteQuery]);

  /* ---- Service motor helpers ---- */
  const serviceInventory = data?.serviceInventory || [];
  const serviceHistory = data?.serviceHistory || [];

  const addSparepart = async (vals, vehicleId = null) => {
    if (!canWrite) return;
    const item = sparepartToPayload(newSparepart(vals));
    item.vehicleId = vehicleId || null;
    let saved = item;
    if (isOnline) {
      try { saved = await serviceInvApi.create(item); } catch { /* simpan lokal */ }
    }
    const currentInv = dataRef.current?.serviceInventory || [];
    saveData({ ...dataRef.current, serviceInventory: [...currentInv, saved] });
    pushToast({ message: 'Perawatan ditambahkan', duration: 2500 });
  };

  const updateSparepart = async (sparepartId, vals) => {
    if (!canWrite) return;
    const sparepart = serviceInventory.find((s) => s.id === sparepartId);
    if (!sparepart) return;
    const updated = vals ? sparepartToPayload({ ...sparepart, ...vals }) : { ...sparepart };
    if (isOnline) {
      try { await serviceInvApi.update(sparepartId, updated); } catch { /* abaikan */ }
    }
    const currentInv = dataRef.current?.serviceInventory || [];
    saveData({
      ...dataRef.current,
      serviceInventory: currentInv.map((s) => (s.id === sparepartId ? updated : s)),
    });
    pushToast({ message: 'Perawatan diperbarui', duration: 2500 });
  };

  const removeSparepart = async (sparepartId) => {
    if (!canWrite) return;
    if (isOnline) {
      try { await serviceInvApi.delete(sparepartId); } catch { /* abaikan */ }
    }
    const currentInv = dataRef.current?.serviceInventory || [];
    saveData({ ...dataRef.current, serviceInventory: currentInv.filter((s) => s.id !== sparepartId) });
    pushToast({ message: 'Perawatan dihapus', duration: 2500 });
  };

  const addVehicle = async (vals) => {
    if (!canWrite) return;
    let saved = vals;
    if (isOnline) {
      try { saved = await vehicleApi.create(vals); } catch { /* simpan lokal */ }
    }
    const current = dataRef.current?.vehicles || [];
    saveData({ ...dataRef.current, vehicles: [...current, saved] });
    pushToast({ message: 'Kendaraan ditambahkan', duration: 2500 });
  };

  const updateVehicle = async (id, vals) => {
    if (!canWrite) return;
    if (isOnline) {
      try { await vehicleApi.update(id, vals); } catch { /* abaikan */ }
    }
    const current = dataRef.current?.vehicles || [];
    saveData({
      ...dataRef.current,
      vehicles: current.map((v) => (v.id === id ? { ...v, ...vals } : v)),
    });
    pushToast({ message: 'Kendaraan diperbarui', duration: 2500 });
  };

  const removeVehicle = async (id) => {
    if (!canWrite) return;
    if (isOnline) {
      try { await vehicleApi.delete(id); } catch { /* abaikan */ }
    }
    const current = dataRef.current?.vehicles || [];
    saveData({ ...dataRef.current, vehicles: current.filter((v) => v.id !== id) });
    pushToast({ message: 'Kendaraan dihapus', duration: 2500 });
  };

  const addServiceRecord = async (vals, vehicleId = null) => {
    if (!canWrite) return;
    const currentHistory = dataRef.current?.serviceHistory || [];
    const currentInv = dataRef.current?.serviceInventory || [];
    // Update sparepart service dates
    const updatedInv = vals.items.reduce((inv, item) => {
      const sp = currentInv.find((s) => s.id === item.sparepartId);
      if (!sp) return inv;
      const newKm = Math.max(sp.lastServiceKm || 0, vals.odometer);
      return inv.map((s) =>
        s.id === item.sparepartId
          ? {
              ...s,
              lastServiceKm: newKm,
              lastServiceDate: vals.date,
              nextDue: calculateNextDue(newKm, vals.date, s.intervalType || 'km', s.intervalValue || 3000),
            }
          : s
      );
    }, currentInv);
    // Sinkronkan update sparepart ke backend.
    if (isOnline) {
      for (const s of updatedInv) {
        const old = currentInv.find((x) => x.id === s.id);
        if (old && (old.lastServiceKm !== s.lastServiceKm || old.lastServiceDate !== s.lastServiceDate)) {
          try { await serviceInvApi.update(s.id, s); } catch { /* abaikan */ }
        }
      }
    }
    const newRec = {
      id: `service-${Date.now()}`,
      date: vals.date,
      odometer: vals.odometer,
      items: vals.items,
      total: vals.total,
      technician: vals.technician,
      notes: vals.notes,
      kategori: vals.kategori || 'service',
    };
    let savedRec = newRec;
    if (isOnline) {
      try {
        const created = await serviceHistoryApi.create({
          tanggal: vals.date,
          odometer: vals.odometer,
          items: JSON.stringify(vals.items),
          total: vals.total,
          technician: vals.technician,
          notes: vals.notes,
          vehicleId: vehicleId || null,
          kategori: vals.kategori || 'service',
        });
        savedRec = mapServiceHistory(created);
      } catch { /* simpan lokal */ }
    }
    saveData({
      ...dataRef.current,
      serviceHistory: [...currentHistory, savedRec],
      serviceInventory: updatedInv,
    });
    pushToast({ message: `Service ${vals.date} dicatat`, duration: 2500 });
  };

  const updateServiceRecord = async (id, vals, vehicleId = null) => {
    if (!canWrite) return;
    const prev = (dataRef.current?.serviceHistory || []).find((h) => h.id === id);
    const payload = {
      tanggal: vals.date,
      odometer: vals.odometer,
      items: JSON.stringify(vals.items),
      total: vals.total,
      technician: vals.technician,
      notes: vals.notes,
      vehicleId: vehicleId !== null ? vehicleId : (vals.vehicleId || null),
      kategori: vals.kategori || 'service',
    };
    if (isOnline) {
      try { await serviceHistoryApi.update(id, payload); } catch { /* abaikan */ }
    }
    // Odometer kendaraan ikut naik bila berubah.
    const vid = vehicleId || vals.vehicleId;
    if (vid && Number(vals.odometer) > (prev?.odometer || 0)) {
      if (isOnline) {
        try { await vehicleApi.update(vid, { odometer: Number(vals.odometer) }); } catch { /* abaikan */ }
      }
      const currentV = dataRef.current?.vehicles || [];
      saveData({ ...dataRef.current, vehicles: currentV.map((v) => (v.id === vid ? { ...v, odometer: Number(vals.odometer) } : v)) });
    }
    const current = dataRef.current?.serviceHistory || [];
    saveData({ ...dataRef.current, serviceHistory: current.map((h) => (h.id === id ? { ...h, date: vals.date, odometer: vals.odometer, items: vals.items, total: vals.total, technician: vals.technician, notes: vals.notes, kategori: vals.kategori || h.kategori, vehicleId: vid || h.vehicleId } : h)) });
    pushToast({ message: 'Riwayat service diperbarui', duration: 2500 });
  };

  // Notifikasi turunan data (tanpa backend) � lihat components/notifications.js.
  // Dihitung ulang tiap data berubah, jadi isinya ikut berubah, tidak basi.
  const notifications = useMemo(() => data ? buildNotifications(data, formatCurrencyShort) : [], [data]);

  // Simpan status "sudah dibaca" sekaligus buang id notifikasi yang sudah tidak
  // ada � supaya daftarnya tidak menumpuk selamanya di localStorage.
  const saveNotifRead = (ids) => {
    const alive = new Set(notifications.map((n) => n.id));
    const next = ids.filter((id) => alive.has(id));
    setNotifRead(next);
    storeNotifRead(next);
  };

  const markAllNotifRead = () => saveNotifRead(notifications.map((n) => n.id));

  // Ketuk notifikasi ? tandai terbaca + lompat ke bagian terkait, dengan filter
  // ikut disetel supaya yang dimaksud langsung terlihat.
  const openNotification = (notif) => {
    saveNotifRead(notifRead.includes(notif.id) ? notifRead : [...notifRead, notif.id]);
    const t = notif.target || {};
    if (t.mode) setAgendaMode(t.mode);
    if (t.agendaFilter) setAgendaFilter(t.agendaFilter);
    if (t.taskFilter) setTaskFilter(t.taskFilter);
    if (t.financeFilter) setFinanceFilter(t.financeFilter);
    if (t.financeMode) setFinanceMode(t.financeMode);
    if (t.noteFilter) setNoteFilter(t.noteFilter);
    if (t.terjadwalTab) setTerjadwalTab(t.terjadwalTab);
    if (t.section) setActiveSection(t.section);
    if (t.openForm) openAdd(t.openForm);
  };

  // Called by LoginScreen setelah login sukses
  const handleLogin = (user) => {
    // user = { id, username, nama, role, family_role, group_id, group_role } from backend
    const frontendUser = {
      id: user.id,
      name: user.nama,
      username: user.username,
      role: user.role,
      family_role: user.family_role || 'anak',
      generasi: user.generasi || 'orangtua',
      birthDate: user.birth_date || null,
      nickname: user.nickname || null,
      avatar: user.avatar_url || null,
      initials: initialsOf(user.nickname || user.nama),
      group_id: user.group_id || null,
      group_role: user.group_role || 'anak',
      group_name: user.group_name || null,
    };
    storeUser(frontendUser);
    setCurrentUser(frontendUser);
    setIsLoggedIn(true);
    setActiveSection('dashboard');
    setEntered(true);
  };

  // Logout � clear token + kembali ke login screen
  const handleLogout = () => {
    // Hapus langganan push (sebelum token dibersihkan).
    try {
      navigator.serviceWorker?.ready?.then((reg) =>
        reg.pushManager?.getSubscription().then((sub) => {
          if (sub) { pushApi.unsubscribe(sub.endpoint).catch(() => {}); sub.unsubscribe().catch(() => {}); }
        })
      );
    } catch {
      /* abaikan */
    }
    if (isOnline) auth.logout().catch(() => {});
    clearUser();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setEntered(false);
    setActiveSection('dashboard');
  };

  // Buka halaman Akun langsung di tab Keamanan (dari Pengaturan).
  const openAccountSecurity = () => {
    setAccountInitialTab('keamanan');
    setActiveSection('akun');
  };

  // Dipanggil dropdown kategori agenda di navigasi ? buka section + set filter
  const handleAgendaSelect = (categoryId) => {
    setAgendaFilter(categoryId);
    setActiveSection('agenda');
  };

  // Dipanggil tombol "Lihat semua" pada kartu Timeline di Dashboard ?
  // buka halaman Agenda langsung di sub-tab Timeline (tampilan penuh).
  const handleOpenAgendaTimeline = () => {
    setAgendaMode('timeline');
    setActiveSection('agenda');
  };

  // Dipanggil dropdown kategori keuangan di navigasi ? buka section + set filter.
  // Kategori selalu milik daftar pengeluaran, jadi mode diarahkan ke sana
  // (default tab kini Ringkasan).
  const handleFinanceSelect = (categoryId) => {
    setFinanceFilter(categoryId);
    setFinanceMode('pengeluaran');
    setActiveSection('expenses');
  };

  // Dipanggil dropdown bagian keluarga di navigasi ? buka section + set filter
  const handleFamilySelect = (categoryId) => {
    setFamilyFilter(categoryId);
    setActiveSection('family');
  };

  // Dipanggil dropdown catatan di navigasi ? buka section + set filter
  const handleNoteSelect = (filterId) => {
    setNoteFilter(filterId);
    setActiveSection('notes');
  };

  // Generate calendar events from all data types — WAJIB di body component,
  // bukan di dalam case switch: hook conditional bikin React crash
  // ("Rendered more hooks") saat pengguna berpindah section dari Agenda.
  const calendarEvents = useMemo(
    () => toCalendarEvents({ ...data, bills: tagihans }),
    [data, tagihans]
  );

  // ---- Daftar Belanja (catatan kategori 'belanja') ----
  // Daftar belanja mingguan & bulanan dikelola sebagai catatan khusus
  // ("Daftar Belanja Pekan · YYYY-Www" / "Daftar Belanja · YYYY-MM");
  // item disimpan sebagai JSON di `body`.
  const shoppingMonthKey = () => monthKeyOf(new Date());
  // Pekan ISO berjalan (Senin-Minggu), dipakai judul catatan mingguan.
  const shoppingWeekKey = () => {
    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // Senin = 0
    date.setUTCDate(date.getUTCDate() - dayNum + 3); // Kamis pekan ini
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
    const week = 1 + Math.round((date - firstThursday) / (7 * 86400000));
    return `${date.getUTCFullYear()}-W${pad(week)}`;
  };
  const shoppingTitleFor = (period = shoppingPeriod) =>
    period === 'mingguan' ? weekTitle(shoppingWeekKey()) : monthTitle(shoppingMonthKey());

  const findShoppingNote = (period = shoppingPeriod) =>
    (dataRef.current.notes || []).find(
      (n) => n.category === SHOPPING_CATEGORY && n.title === shoppingTitleFor(period)
    ) || null;

  const findTemplateNote = () =>
    (dataRef.current.notes || []).find(
      (n) => n.category === SHOPPING_CATEGORY && n.title === SHOPPING_TEMPLATE_TITLE
    ) || null;

  // Tampilan: pakai catatan periode ini kalau ada; kalau belum, salin isi
  // template (centang direset) supaya daftar baru tidak mulai kosong.
  const displayShoppingState = (period = shoppingPeriod) => {
    const existing = findShoppingNote(period);
    if (existing) return parseShoppingNote(existing);
    const tpl = findTemplateNote();
    if (tpl) return { ...emptyShopping(), items: copyForMonth(parseShoppingNote(tpl).items) };
    return emptyShopping();
  };

  // Simpan state belanja: optimis ke lokal, lalu sinkron ke backend.
  const applyShoppingState = async (state, period = shoppingPeriod) => {
    const current = dataRef.current;
    const title = shoppingTitleFor(period);
    const body = serializeShopping(state);
    const nextNotes = current.notes || [];
    const idx = nextNotes.findIndex(
      (n) => n.category === SHOPPING_CATEGORY && n.title === title
    );
    if (idx >= 0) {
      const updated = { ...nextNotes[idx], body };
      saveData({ ...current, notes: nextNotes.map((n, i) => (i === idx ? updated : n)) });
      try {
        await notesApi.update(nextNotes[idx].id, { title, body, category: SHOPPING_CATEGORY, pinned: false }, currentUser);
      } catch { /* offline: tetap simpan lokal */ }
    } else {
      try {
        const created = await notesApi.create({ title, body, category: SHOPPING_CATEGORY, pinned: false }, currentUser);
        saveData({ ...current, notes: [...nextNotes, created] });
      } catch {
        const local = {
          id: `local-shop-${Date.now()}`,
          title,
          body,
          category: SHOPPING_CATEGORY,
          pinned: false,
          author: currentUser?.name || '',
          updatedAt: todayKey(),
        };
        saveData({ ...current, notes: [...nextNotes, local] });
      }
    }
  };

  const getOrCreateShoppingNote = (period = shoppingPeriod) => {
    const existing = findShoppingNote(period);
    return { note: existing, state: existing ? parseShoppingNote(existing) : displayShoppingState(period) };
  };

  const addShoppingItem = async (values, period = shoppingPeriod) => {
    const { state } = getOrCreateShoppingNote(period);
    await applyShoppingState({ ...state, items: [...state.items, newShoppingItem(values)] }, period);
  };

  const toggleShoppingItem = async (id, period = shoppingPeriod) => {
    const { state } = getOrCreateShoppingNote(period);
    await applyShoppingState({
      ...state,
      items: state.items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
    }, period);
  };

  const removeShoppingItem = async (id, period = shoppingPeriod) => {
    const { state } = getOrCreateShoppingNote(period);
    await applyShoppingState({ ...state, items: state.items.filter((it) => it.id !== id) }, period);
  };

  const saveShoppingAsTemplate = async () => {
    const { state } = getOrCreateShoppingNote();
    const body = JSON.stringify({ v: 1, items: toTemplateItems(state.items), selesai: false, expenseId: null });
    const current = dataRef.current;
    const nextNotes = current.notes || [];
    const idx = nextNotes.findIndex(
      (n) => n.category === SHOPPING_CATEGORY && n.title === SHOPPING_TEMPLATE_TITLE
    );
    if (idx >= 0) {
      const updated = { ...nextNotes[idx], body };
      saveData({ ...current, notes: nextNotes.map((n, i) => (i === idx ? updated : n)) });
      try {
        await notesApi.update(nextNotes[idx].id, { title: SHOPPING_TEMPLATE_TITLE, body, category: SHOPPING_CATEGORY, pinned: false }, currentUser);
      } catch { /* offline */ }
    } else {
      try {
        const created = await notesApi.create({ title: SHOPPING_TEMPLATE_TITLE, body, category: SHOPPING_CATEGORY, pinned: false }, currentUser);
        saveData({ ...current, notes: [...nextNotes, created] });
      } catch {
        saveData({
          ...current,
          notes: [
            ...nextNotes,
            { id: `local-shop-tpl-${Date.now()}`, title: SHOPPING_TEMPLATE_TITLE, body, category: SHOPPING_CATEGORY, pinned: false, author: currentUser?.name || '', updatedAt: todayKey() },
          ],
        });
      }
    }
  };

  const finishShopping = async (period = shoppingPeriod) => {
    const { state } = getOrCreateShoppingNote(period);
    if (!state.items.length) return;
    const total = sumItems(state.items, true);
    if (total <= 0) {
      pushToast({ message: 'Belum ada item tercentang dengan harga.', duration: 3500, tone: 'warning' });
      return;
    }
    try {
      const result = await txn.create({
        category: SHOPPING_CATEGORY,
        description: `${shoppingTitleFor(period)} (beres)`,
        amount: total,
        date: todayKey(),
        bucket: 'auto',
      });
      addItemToState('expenses', result);
      await applyShoppingState({ ...state, selesai: true, expenseId: result.id }, period);
    } catch {
      pushToast({ message: 'Gagal mencatat belanja sebagai pengeluaran.', duration: 4000, tone: 'danger' });
    }
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

        // calendarEvents sudah dihitung di body component (lihat useMemo di
        // atas renderSection) — hook tidak boleh di dalam case switch.

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
                      subtitle: `${(filtered || []).length} jadwal • ${(calendarEvents || []).length} aktivitas`,
                      actionLabel: 'Tambah',
                      onAction: () => openAdd('agenda'),
                    })}
            />

            {/* Sub-tampilan Agenda: Jadwal | Tugas | Kalender | Timeline */}
            <div className="mb-5 overflow-x-auto rounded-xl bg-muted/50 p-1" role="tablist" aria-label="Mode tampilan agenda">
              <SlideTabs
                tabs={[
                  { id: "jadwal", label: "Jadwal", icon: "clock" },
                  { id: "tugas", label: "Tugas", icon: "tasks" },
                  { id: "kalender", label: "Kalender", icon: "calendar" },
                  { id: "timeline", label: "Timeline", icon: "activity" },
                ]}
                active={agendaMode}
                onChange={setAgendaMode}
              />
            </div>

            {agendaMode === 'tugas' ? (
              <>
                {/* Filter tugas � status & prioritas (chip di dalam sub-tampilan Tugas) */}
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
                  <FamilyCalendar 
                    items={filtered} 
                    tasks={data.tasks} 
                    events={calendarEvents} 
                    onEventClick={(event) => {
                const { type, item } = event.data;
                if (type === 'tagihan') {
                  // Tagihan belum punya FormSheet sendiri → ringkasan singkat dulu.
                  const lunas = item.amount > 0 && (Number(item.dibayar) || 0) >= item.amount;
                  pushToast({
                    message: `${item.nama} • jatuh tempo ${item.dueDate} • ${
                      lunas ? 'sudah lunas' : `sisa ${formatCurrency(item.amount - (item.dibayar || 0))}`
                    }`,
                    duration: 4000,
                  });
                  return;
                }
                openEdit(type, item);
              }} 
                  />
                )}
              </>
            )}
          </section>
        );
      }

      case 'akun': {
        return (
          <AccountModal
            page
            open
            user={currentUser}
            users={data.users}
            initialGenerasi={accountInitialGenerasi}
            initialTab={accountInitialTab}
            onSaved={handleProfileSaved}
            onClose={() => { setAccountInitialGenerasi(null); setAccountInitialTab('profil'); }}
            onSwitchUser={handleLogout}
            onSave={saveAccount}
            onLogout={handleLogout}
            onRegister={() => setRegisterOpen(true)}
          />
        );
      }

      case 'pengaturan': {
        return (
          <SettingsComp
            gcal={gcal}
            onConnect={connectGoogleCalendar}
            onDisconnect={disconnectGoogleCalendar}
            theme={theme}
            onThemeChange={setTheme}
            onChangePassword={openAccountSecurity}
            appVersion={APP_VERSION}
            buildTime={BUILD_TIME}
          />
        );
      }

      case 'wawasan': {
        return (
          <InsightComp
            insight={insight}
            budget={data?.budget}
            goals={goals}
            formatCurrency={formatCurrency}
            formatCurrencyShort={formatCurrencyShort}
          />
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

        // ---- Pemasukan (mode ketiga) ----
        const incomeMeta = INCOME_CATEGORIES.find((c) => c.id === incomeFilter) || INCOME_CATEGORIES[0];
        const incomeList = data.income || [];
        const filteredIncome =
          incomeFilter === 'semua'
            ? incomeList
            : incomeList.filter((item) => item.category === incomeFilter);
        const incomeTotal = filteredIncome.reduce((sum, item) => sum + item.amount, 0);

        // Bulan berjalan � dipakai header & notifikasi pengingat
        const monthKey = `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}`;
        const incomeThisMonth = incomeList
          .filter((i) => (i.date || '').startsWith(monthKey))
          .reduce((sum, i) => sum + i.amount, 0);

        // ---- Tab Ringkasan: agregat bulan terpilih + status anggaran ----
        const inSummaryMonth = (i) => (i.date || '').startsWith(summaryMonth);
        const monthExpenses = data.expenses.filter(inSummaryMonth);
        const monthIncomeList = incomeList.filter(inSummaryMonth);
        const expenseMonth = monthExpenses.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const incomeMonth = monthIncomeList.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const netMonth = incomeMonth - expenseMonth;
        const anggaranStatus = budgetStatus(expenseMonth, budget.income);
        const pairedTrend = buildPairedTrend(data.expenses, incomeList, summaryMonth);
        const monthCategories = computeCategories(monthExpenses);
        const monthWeekly = computeWeekly(monthExpenses);
        const atCurrentMonth = summaryMonth >= monthKey;
        const shiftSummaryMonth = (delta) => {
          setSummaryMonth((prev) => {
            const [y, m] = prev.split('-').map(Number);
            const d = new Date(y, m - 1 + delta, 1);
            const key = monthKeyOf(d);
            return key > monthKey ? prev : key;
          });
        };
        return (
          <section className="app-fade-in">
            {financeMode === 'anggaran' ? (
              <SectionHeader
                icon="pieChart"
                title="Anggaran"
                subtitle={`Gaji ${formatCurrencyShort(budget.income)} - ${budget.month}`}
              />
            ) : financeMode === 'ringkasan' ? (
              <SectionHeader icon="barChart" title="Ringkasan" subtitle={`Periode ${monthNameLong(summaryMonth)}`} />
            ) : financeMode === 'pemasukan' ? (
              <SectionHeader
                icon="trendingUp"
                title={incomeMeta.label}
                subtitle={`Total: ${formatCurrency(incomeTotal)} - bulan ini ${formatCurrency(incomeThisMonth)}`}
                actionLabel={canWrite ? 'Tambah' : undefined}
                actionTone="accent"
                actionIconOnly
                onAction={() => openAdd('income')}
              />
            ) : (
              <>
                <SectionHeader
                  icon="wallet"
                  title={activeMeta.label}
                  subtitle={`Total: ${formatCurrency(filteredTotal)} · anggaran ${formatCurrencyShort(budget.income)}`}
                  actionLabel={canWrite ? 'Tambah' : undefined}
                  actionTone="accent"
                  actionIconOnly
                  onAction={() => openAdd('expenses')}
                  className="mb-0"
                />
              </>
            )}

            {/* Sub-tampilan Keuangan: Ringkasan | Pengeluaran | Pemasukan | Anggaran */}
            <div className="mb-5">
              <SlideTabs
                tabs={[
                  { id: "ringkasan", label: "Ringkasan", icon: "barChart" },
                  { id: "pengeluaran", label: "Pengeluaran", icon: "wallet" },
                  { id: "pemasukan", label: "Pemasukan", icon: "trendingUp" },
                  { id: "anggaran", label: "Anggaran", icon: "pieChart" },
                ]}
                active={financeMode}
                onChange={setFinanceMode}
              />
            </div>


            {/* Chip filter kategori pemasukan (pola sama dengan chip tugas) */}
            {financeMode === 'pemasukan' && (
              <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter kategori pemasukan">
                {INCOME_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setIncomeFilter(cat.id)}
                    aria-pressed={incomeFilter === cat.id}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                      incomeFilter === cat.id
                        ? 'border-brand/25 bg-brandtint text-brandfg'
                        : 'border-line text-mutedfg hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <Icon name={cat.icon} size={14} />
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {financeMode === 'anggaran' ? (
              <Budgeting
                data={data}
                formatCurrency={formatCurrency}
                formatCurrencyShort={formatCurrencyShort}
                onSaveBudget={handleSaveBudget}
                onAddPos={(bucket) => openAdd('budgetPos', { bucket })}
                onEditPos={(bucket, pos) => openEdit('budgetPos', { ...pos, bucket })}
                onDeletePos={(bucket, pos) => deletePos(bucket, pos)}
                readOnly={!canWrite}
              />
            ) : financeMode === 'ringkasan' ? (
              <>
                {/* Navigator bulan: mundur bebas, maju berhenti di bulan berjalan */}
                <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => shiftSummaryMonth(-1)}
                    aria-label="Bulan sebelumnya"
                    className="grid h-11 w-11 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-muted hover:text-ink"
                  >
                    <Icon name="chevronLeft" size={18} />
                  </button>
                  <p className="text-sm font-semibold text-ink">{monthNameLong(summaryMonth)}</p>
                  <button
                    type="button"
                    onClick={() => shiftSummaryMonth(1)}
                    disabled={atCurrentMonth}
                    aria-label="Bulan berikutnya"
                    className={`grid h-11 w-11 place-items-center rounded-lg transition-colors ${
                      atCurrentMonth ? 'cursor-not-allowed text-mutedfg/40' : 'text-mutedfg hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <Icon name="chevronRight" size={18} />
                  </button>
                </div>

                {/* Banner status anggaran � ikon + teks + warna (bukan warna saja) */}
                {anggaranStatus.level === 'belum' ? (
                  <p className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-muted px-3 py-2.5 text-sm text-mutedfg">
                    <Icon name="target" size={16} className="shrink-0" />
                    Isi angka pemasukan rencana di tab Anggaran supaya perbandingan di sini aktif.
                  </p>
                ) : anggaranStatus.level === 'lewat' ? (
                  <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-tonerose/40 bg-tonerose/10 px-3 py-2.5 text-sm text-tonerosefg">
                    <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Pengeluaran {formatCurrency(expenseMonth)} melewati anggaran {formatCurrency(budget.income)} ({anggaranStatus.pct}%).
                    </span>
                  </div>
                ) : anggaranStatus.level === 'hati-hati' ? (
                  <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-toneamber/40 bg-toneamber/10 px-3 py-2.5 text-sm text-toneamberfg">
                    <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Pengeluaran sudah memakai {anggaranStatus.pct}% anggaran bulan ini. Hati-hati.
                    </span>
                  </div>
                ) : (
                  <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2.5 text-sm text-success">
                    <Icon name="circleCheck" size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Pengeluaran {anggaranStatus.pct}% dari anggaran. Masih aman.
                    </span>
                  </div>
                )}

                {/* 5 kartu KPI bulan terpilih */}
                <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                  <StatCard
                    icon="trendingUp"
                    tone="emerald"
                    value={formatCurrencyShort(incomeMonth)}
                    valueTitle={formatCurrency(incomeMonth)}
                    label="Pemasukan"
                    hint="Gaji, side job & lainnya"
                  />
                  <StatCard
                    icon="wallet"
                    tone="cyan"
                    value={formatCurrencyShort(expenseMonth)}
                    valueTitle={formatCurrency(expenseMonth)}
                    label="Pengeluaran"
                    hint="Semua kategori"
                  />
                  <StatCard
                    icon={netMonth >= 0 ? 'arrowUpRight' : 'arrowDownRight'}
                    tone={netMonth >= 0 ? 'emerald' : 'rose'}
                    value={`${netMonth >= 0 ? '+' : '-'}${formatCurrencyShort(Math.abs(netMonth))}`}
                    valueTitle={`${netMonth >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netMonth))}`}
                    label="Selisih"
                    hint="Pemasukan - Pengeluaran"
                  />
                  <StatCard
                    icon="target"
                    tone={anggaranStatus.level === 'lewat' ? 'rose' : anggaranStatus.level === 'hati-hati' ? 'amber' : anggaranStatus.level === 'aman' ? 'emerald' : 'cyan'}
                    value={anggaranStatus.level === 'belum' ? '-' : `${anggaranStatus.pct}%`}
                    label="Anggaran terpakai"
                    hint={budget.income > 0 ? `dari ${formatCurrencyShort(budget.income)}` : 'Anggaran belum diisi'}
                  />
                  <StatCard
                    icon={anggaranStatus.sisa >= 0 ? 'circleCheck' : 'alertTriangle'}
                    tone={anggaranStatus.sisa >= 0 ? 'emerald' : 'rose'}
                    value={anggaranStatus.level === 'belum' ? '-' : formatCurrencyShort(Math.abs(anggaranStatus.sisa))}
                    valueTitle={anggaranStatus.level === 'belum' ? undefined : formatCurrency(Math.abs(anggaranStatus.sisa))}
                    label={anggaranStatus.sisa >= 0 ? 'Sisa anggaran' : 'Melewati anggaran'}
                    hint="Dari angka rencana"
                  />
                </div>

                {/* Chart: tren 6 bulan pemasukan vs pengeluaran (batang berpasangan) */}
                <Card className="mb-4 p-4 sm:p-5 md:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon name="barChart" size={18} className="shrink-0 text-brandfg" />
                      <h2 className="truncate font-bold text-ink">Tren 6 Bulan</h2>
                    </div>
                    <span className="shrink-0 text-xs text-mutedfg">Pemasukan vs pengeluaran</span>
                  </div>
                  <GroupedBarChart data={pairedTrend} formatValue={formatCurrencyShort} />
                </Card>

                {/* Chart: komposisi kategori + distribusi mingguan (bulan terpilih) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card className="p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon name="pieChart" size={18} className="shrink-0 text-brandfg" />
                        <h2 className="truncate font-bold text-ink">Komposisi Pengeluaran</h2>
                      </div>
                      <span className="shrink-0 text-xs text-mutedfg">{monthNameLong(summaryMonth)}</span>
                    </div>
                    {monthCategories.length === 0 ? (
                      <p className="py-6 text-center text-sm text-mutedfg">Belum ada pengeluaran di bulan ini.</p>
                    ) : (
                      <DonutChart data={monthCategories} formatValue={formatCurrencyShort} centerLabel="Total" />
                    )}
                  </Card>
                  <Card className="p-4 sm:p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon name="clock" size={18} className="shrink-0 text-brandfg" />
                        <h2 className="truncate font-bold text-ink">Distribusi Mingguan</h2>
                      </div>
                      <span className="shrink-0 text-xs text-mutedfg">per hari</span>
                    </div>
                    <BarChart data={monthWeekly} formatValue={formatCurrencyShort} color="rgb(var(--chart4))" />
                  </Card>
                </div>
              </>
            ) : financeMode === 'pemasukan' ? (
              filteredIncome.length === 0 ? (
                <EmptyState
                  icon="trendingUp"
                  title="Belum ada pemasukan"
                  message="Catat gaji, bonus, side job, atau pemasukan lain lewat tombol Tambah."
                />
              ) : (
                <div className="stagger grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredIncome.map((item) => (
                    <IncomeCard
                      key={item.id}
                      item={item}
                      formatCurrency={formatCurrency}
                      onEdit={(it) => openEdit('income', it)}
                      onDelete={(it) => deleteItem('income', it)}
                      readOnly={!canWrite}
                    />
                  ))}
                </div>
              )
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
                    readOnly={!canWrite}
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
              actionLabel={canWrite ? 'Tambah' : undefined}
              onAction={() => openAdd('family')}
            />

            <div className="space-y-8">
              {showAnggota && (
                <FamilyTree
                  members={data.family}
                  isMaster={currentUser?.username === 'baytmustaqbal@gmail.com'}
                  onAdd={handleTreeAdd}
                  onSelect={() => {}}
                />
              )}
              {showMedis && <FamilyList title="Info Medis" icon="activity" items={data.familyMedical} onAdd={() => openAdd('family', { bagian: 'medis' })} />}
              {showKontak && <FamilyList title="Kontak & Darurat" icon="phone" items={data.familyContacts} onAdd={() => openAdd('family', { bagian: 'kontak' })} />}
              {showDokumen && <FamilyList title="Dokumen Penting" icon="file" items={data.familyDocuments} onAdd={() => openAdd('family', { bagian: 'dokumen' })} />}
            </div>

            {/* Tugas rumah tangga bersama */}
            <div className="mt-8 border-t border-line pt-6">
              <ChoresComp users={data.family} />
            </div>
          </section>
        );
      }

      case 'notes': {
        const activeMeta = NOTES_FILTERS.find((c) => c.id === noteFilter) || NOTES_FILTERS[0];
        const searching = noteQuery.trim().length > 0;
        const totalNonShopping = (data.notes || []).filter((n) => n.category !== SHOPPING_CATEGORY).length;
        return (
          <section className="app-fade-in">
            <SectionHeader
              icon={activeMeta.icon}
              title={activeMeta.label}
              subtitle={`${filteredNotes.length} dari ${totalNonShopping} catatan`}
              actionLabel={canWrite ? 'Tambah' : undefined}
              onAction={() => openAdd('notes')}
            />

            {/* Pencarian catatan (judul + isi) � kotak cari 48px, ikon di kiri */}
            <div className="relative mb-4">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mutedfg" aria-hidden="true">
                <Icon name="search" size={17} />
              </span>
              <input
                type="search"
                value={noteQuery}
                onChange={(e) => setNoteQuery(e.target.value)}
                placeholder="Cari judul atau isi catatan..."
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

      case 'terjadwal': {
        const terjadwalTabs = [
          { id: 'pengeluaran', label: 'Pengeluaran', icon: 'receipt' },
          { id: 'service', label: 'Services', icon: 'wrench' },
          { id: 'tabungan', label: 'Whishlist', icon: 'piggyBank' },
          { id: 'belanja', label: 'Belanja', icon: 'shoppingBag' },
          { id: 'langganan', label: 'Langganan', icon: 'repeat' },
          { id: 'utang', label: 'Utang', icon: 'handCoins' },
        ];
        return (
          <section className="app-fade-in">
            <SectionHeader
              icon="clock"
              title="Tugas Terjadwal"
              subtitle="Semua aktivitas terjadwal keluarga"
            />
            <div className="mb-4 overflow-x-auto rounded-xl bg-muted/50 p-1" role="tablist" aria-label="Jenis tugas terjadwal">
              <SlideTabs
                tabs={terjadwalTabs.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
                active={terjadwalTab}
                onChange={setTerjadwalTab}
              />
            </div>

            {terjadwalTab === 'pengeluaran' && (
              <div className="space-y-3">
                {(() => {
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = now.getMonth() + 1;
                  const monthPrefix = `${y}-${String(m).padStart(2, '0')}`;
                  const todayStr = `${monthPrefix}-${String(now.getDate()).padStart(2, '0')}`;
                  const lastDay = new Date(y, m, 0).getDate();
                  const recordedNames = new Set(
                    (data.expenses || [])
                      .filter((e) => (e.date || '').startsWith(monthPrefix))
                      .map((e) => e.description)
                  );
                  const pending = (data.scheduledExpenses || []).filter((t) => {
                    if (t.active === false) return false;
                    const d = Math.min(Number(t.day) || 1, lastDay);
                    const due = `${monthPrefix}-${String(d).padStart(2, '0')}`;
                    return due <= todayStr && !recordedNames.has(t.name);
                  });
                  if (pending.length === 0) return null;
                  return (
                    <Card className="border-amber/40 bg-amber/5 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Icon name="bell" size={16} className="shrink-0 text-toneamberfg" />
                        <h3 className="text-sm font-bold text-ink">Menunggu Konfirmasi ({pending.length})</h3>
                      </div>
                      <p className="mb-3 text-xs text-mutedfg">
                        Jadwal ini jatuh tempo bulan ini tetapi belum dicatat. Konfirmasi kalau sudah benar-benar dibayar /
                        dilakukan.
                      </p>
                      <ul className="space-y-2">
                        {pending.map((t) => (
                          <li key={t.id} className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink">{t.name}</p>
                              <p className="text-[11px] text-mutedfg">{formatCurrency(t.amount)}</p>
                            </div>
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => recordScheduledExpense(t)}
                                className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-white transition-colors hover:bg-brand/90"
                              >
                                <Icon name="check" size={14} />
                                Catat
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  );
                })()}
                {(!data.scheduledExpenses || data.scheduledExpenses.length === 0) ? (
                  <p className="text-sm text-mutedfg">Belum ada pengeluaran terjadwal.</p>
                ) : (
                  <ul className="divide-y divide-line rounded-xl border border-line bg-canvas">
                    {data.scheduledExpenses.map((tpl) => (
                      <li key={tpl.id} className="flex items-center gap-3 px-3.5 py-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brandtint text-brandfg" aria-hidden="true">
                          <Icon name="receipt" size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{tpl.title || tpl.name}</p>
                          <p className="text-[11px] text-mutedfg">
                            {tpl.amount != null ? formatCurrency(tpl.amount) : ''}
                            {tpl.frequency ? ` • ${tpl.frequency}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {tpl.active === false ? <Badge tone="gray">Nonaktif</Badge> : <Badge tone="green">Aktif</Badge>}
                          {canWrite && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit('scheduledTemplate', tpl)}
                                aria-label={`Edit ${tpl.name}`}
                                className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-muted hover:text-ink"
                              >
                                <Icon name="edit" size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteScheduledTemplate(tpl.id)}
                                aria-label={`Hapus ${tpl.name}`}
                                className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-tonerose/10 hover:text-tonerosefg"
                              >
                                <Icon name="trash" size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {canWrite && (
                  <button type="button" onClick={() => openAdd('scheduledTemplate')} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-canvas px-3 text-sm font-semibold text-mutedfg transition-colors hover:bg-muted hover:text-ink">
                    <Icon name="plus" size={15} /> Tambah Pengeluaran Terjadwal
                  </button>
                )}
              </div>
            )}

            {terjadwalTab === 'tabungan' && (
              <TargetTabunganComp
                goals={goals}
                canWrite={canWrite}
                onAdd={addGoal}
                onUpdate={updateGoal}
                onDelete={deleteGoal}
                onTransaction={async (id, payload) => goalsApi.addTransaction(id, payload)}
                formatCurrency={formatCurrency}
              />
            )}

            {terjadwalTab === 'belanja' && (
              (() => {
                const period = shoppingPeriod;
                const title = shoppingTitleFor(period);
                const state = displayShoppingState(period);
                const periods = [
                  { id: 'mingguan', label: 'Mingguan', icon: 'calendar' },
                  { id: 'bulanan', label: 'Bulanan', icon: 'receipt' },
                ];
                return (
                  <div className="space-y-3">
                    <div className="flex gap-1.5 rounded-xl bg-muted/50 p-1" role="tablist" aria-label="Periode daftar belanja">
                      {periods.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          role="tab"
                          aria-selected={period === p.id}
                          onClick={() => setShoppingPeriod(p.id)}
                          className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors ${
                            period === p.id ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:bg-muted hover:text-ink'
                          }`}
                        >
                          <Icon name={p.icon} size={15} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-mutedfg">{title}</p>
                    <ShoppingList
                      state={state}
                      formatCurrency={formatCurrency}
                      canWrite={canWrite}
                      onAddItem={(v) => addShoppingItem(v, period)}
                      onToggle={(id) => toggleShoppingItem(id, period)}
                      onRemove={(id) => removeShoppingItem(id, period)}
                      onSaveTemplate={saveShoppingAsTemplate}
                      onFinish={() => finishShopping(period)}
                    />
                  </div>
                );
              })()
            )}

            {terjadwalTab === 'service' && (
              <Service
                inventory={serviceInventory}
                history={serviceHistory}
                vehicles={data.vehicles}
                formatCurrency={formatCurrency}
                canWrite={canWrite}
                onAddSparepart={addSparepart}
                onUpdateSparepart={updateSparepart}
                onRemoveSparepart={removeSparepart}
                onAddService={addServiceRecord}
                onUpdateService={updateServiceRecord}
                onAddVehicle={addVehicle}
                onUpdateVehicle={updateVehicle}
                onRemoveVehicle={removeVehicle}
                activeTab={serviceActiveTab}
                onTabChange={setServiceActiveTab}
              />
            )}

            {terjadwalTab === 'langganan' && (
              <SubscriptionsComp
                subs={subs}
                canWrite={canWrite}
                formatCurrency={formatCurrency}
                onSave={async (item) => {
                  const saved = item.id
                    ? await subApi.update(item.id, item)
                    : await subApi.create(item);
                  setSubs((prev) => {
                    if (item.id) return prev.map((s) => (s.id === item.id ? saved : s));
                    return [saved, ...prev];
                  });
                }}
                onDelete={async (id) => {
                  await subApi.delete(id);
                  setSubs((prev) => prev.filter((s) => s.id !== id));
                }}
              />
            )}

            {terjadwalTab === 'utang' && (
              <DebtComp users={data.family} canWrite={canWrite} formatCurrency={formatCurrency} />
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
            insight={insight}
          />
        );
    }
  };

  // While checking auth or loading data, show splash
  if (authChecking || !isLoggedIn || !entered) {
    return (
      <>
        {/* Splash tetap muncul � berada sebelum early-return */}
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        {authChecking ? null : (
          <LoginScreen
            onLogin={handleLogin}
            onReset={resetData}
            pushToast={pushToast}
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
              <div className="ld-trio text-brand mx-auto" aria-hidden="true"><i></i><i></i><i></i></div>
              <p className="mt-3 text-sm text-mutedfg">Memuat data...</p>
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
        onOpenAccount={() => { setAccountInitialTab('profil'); setAccountInitialGenerasi(null); setActiveSection('akun'); }}
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
        onOpenSidebar={() => setSidebarOpen(true)}
        voiceSupported={voiceSupported}
        voiceListening={voiceListening}
        voiceLevels={voiceLevels}
        onVoiceStart={startVoiceExpense}
        onVoiceStop={() => { if (voiceRecRef.current) { try { voiceRecRef.current.stop(); } catch {} } if (voiceCleanupRef.current) { voiceCleanupRef.current(); voiceCleanupRef.current = null; } setVoiceListening(false); }}
        onQuickAction={(action) => {
          if (action === 'expenses') openAdd('expenses');
          else if (action === 'notes') openAdd('notes');
          else if (action === 'scan') { if (canWrite) setScanOpen(true); else openAdd('expenses'); }
          else if (action === 'service') {
            setActiveSection('terjadwal');
            setTerjadwalTab('service');
            setServiceActiveTab('history');
            window.dispatchEvent(new Event('bm:open-service-form'));
          }
        }}
      />

      {/* Sidebar desktop (trigger: klik header) */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
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
        service={serviceInventory}
      />

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:pl-72 lg:pb-12"
      >
        {!isOnline && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-tonerosefg"
          >
            <Icon name="wifiOff" size={16} />
            <span>Mode offline: perubahan akan disinkronkan saat online.</span>
          </div>
        )}
        {!canWrite && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-toneamber/40 bg-toneamber/10 px-4 py-3 text-sm text-toneamberfg"
          >
            <Icon name="eye" size={16} />
            <span>Mode baca-saja: hanya Kepala Keluarga, Suami &amp; Istri yang bisa menambah atau mengubah data keluarga.</span>
          </div>
        )}
        <Suspense fallback={<div className="py-10 text-center text-sm text-mutedfg">Memuat…</div>}>
          {renderSection()}
        </Suspense>
        <footer className="mt-6 pb-2 text-center text-[11px] text-mutedfg">
          Bayt Mustaqbal v{APP_VERSION} · build {BUILD_TIME || 'dev'}
        </footer>
      </main>

      {/* Pemindai struk: foto dibaca OCR, hasilnya jadi pengeluaran biasa */}
      {scanOpen && (
        <ReceiptScanner
          categories={getBudgetCategoryOptions().filter((c) => c.value !== 'semua')}
          defaultDate={todayKey()}
          onClose={() => setScanOpen(false)}
          onSave={simpanStruk}
        />
      )}

      {/* Bottom sheet "Tambah/Ubah" � form per section (mode edit = nilai terisi) */}
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

      {/* RegisterScreen � hanya bisa diakses dari halaman Akun (master only) */}
      {registerOpen && (
        <RegisterScreen
          onLogin={handleLogin}
          onBack={() => setRegisterOpen(false)}
        />
      )}

      {/* Toast: konfirmasi ringkas + "Urungkan" untuk hapus */}
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Splash screen � tampil setiap buka app, lepas setelah fade-out */}
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
    </div>
  );
}

