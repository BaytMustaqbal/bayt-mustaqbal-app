import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './components/Icon';
import { Navigation } from './components/Navigation';
import { ScheduleItem } from './components/ScheduleItem';
import { FamilyMemberCard } from './components/FamilyMemberCard';
import { TaskList } from './components/TaskList';
import { Dashboard } from './components/Dashboard';
import { WelcomeGate } from './components/WelcomeGate';
import { Card, SectionHeader, EmptyState, ExpenseCard, FamilyList } from './components/ui';
import { FamilyCalendar } from './components/Calendar';
import { AGENDA_CATEGORIES, FINANCE_CATEGORIES, FAMILY_CATEGORIES, countByCategory } from './components/categories';
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
    { label: 'Belanja Bulanan', value: 1250000, color: '#22D3EE' },
    { label: 'Pendidikan', value: 750000, color: '#3B82F6' },
    { label: 'Listrik & Air', value: 480000, color: '#8B5CF6' },
    { label: 'Transportasi', value: 300000, color: '#F59E0B' },
  ],
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

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeUserId, setActiveUserId] = useState(readStoredUser);
  // Gerbang welcome muncul SETIAP app dibuka (keputusan Kakang).
  // Saat backend siap, state ini tinggal ditukar jadi status login.
  const [entered, setEntered] = useState(false);
  // Filter kategori agenda (default: semua) — sinkron antara dropdown nav & chip di section
  const [agendaFilter, setAgendaFilter] = useState('semua');
  // Mode tampilan section Agenda: daftar grid atau kalender keluarga
  const [agendaMode, setAgendaMode] = useState('daftar');
  // Filter kategori pengeluaran (default: semua) — pola sama dengan agenda
  const [financeFilter, setFinanceFilter] = useState('semua');
  // Filter bagian keluarga (default: semua) — pola sama dengan agenda & keuangan
  const [familyFilter, setFamilyFilter] = useState('semua');

  // Data dummy murni — belum terhubung ke backend/API apa pun.
  // Ganti dengan state + fetch saat Worker + D1 sudah siap.
  const data = mockData;
  const currentUser = data.users.find((u) => u.id === activeUserId) || data.users[0];

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

  const totals = useMemo(() => {
    const totalExpense = data.expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const tasksDone = data.tasks.filter((t) => t.completed).length;
    return { totalExpense, tasksDone };
  }, [data]);

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
              icon="calendar"
              title={activeMeta.label}
              subtitle={`${filtered.length} dari ${data.schedule.length} jadwal`}
              actionLabel="Tambah"
            />

            {/* Pilih tampilan: daftar grid atau kalender gabungan member */}
            <div className="mb-5 inline-flex rounded-xl border border-line bg-surface p-1" role="group" aria-label="Mode tampilan agenda">
              <button
                type="button"
                onClick={() => setAgendaMode('daftar')}
                aria-pressed={agendaMode === 'daftar'}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  agendaMode === 'daftar' ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:text-ink'
                }`}
              >
                <Icon name="tasks" size={16} />
                Daftar
              </button>
              <button
                type="button"
                onClick={() => setAgendaMode('kalender')}
                aria-pressed={agendaMode === 'kalender'}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                  agendaMode === 'kalender' ? 'bg-brandtint text-brandfg' : 'text-mutedfg hover:text-ink'
                }`}
              >
                <Icon name="calendar" size={16} />
                Kalender
              </button>
            </div>

            {/* Filter kategori — sinkron dengan dropdown di navigasi */}
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter kategori agenda">
              {AGENDA_CATEGORIES.map((cat) => {
                const active = agendaFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setAgendaFilter(cat.id)}
                    aria-pressed={active}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                      active
                        ? 'border-brand/50 bg-brandtint text-brandfg'
                        : 'border-line bg-surface text-mutedfg hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <Icon name={cat.icon} size={16} />
                    {cat.label}
                    <span className="font-mono text-xs opacity-80">{countByCategory(data.schedule, cat.id)}</span>
                  </button>
                );
              })}
            </div>

            {agendaMode === 'daftar' ? (
              filtered.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="Tidak ada agenda di kategori ini"
                  message="Pilih kategori lain, atau tambahkan agenda baru."
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((item) => (
                    <ScheduleItem key={item.id} item={item} />
                  ))}
                </div>
              )
            ) : (
              <FamilyCalendar items={filtered} tasks={data.tasks} />
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
            />

            {/* Filter kategori — sinkron dengan dropdown di navigasi */}
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter kategori pengeluaran">
              {FINANCE_CATEGORIES.map((cat) => {
                const active = financeFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFinanceFilter(cat.id)}
                    aria-pressed={active}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                      active
                        ? 'border-brand/50 bg-brandtint text-brandfg'
                        : 'border-line bg-surface text-mutedfg hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <Icon name={cat.icon} size={16} />
                    {cat.label}
                    <span className="font-mono text-xs opacity-80">{countByCategory(data.expenses, cat.id)}</span>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon="wallet"
                title="Tidak ada pengeluaran di kategori ini"
                message="Pilih kategori lain, atau catat pengeluaran baru."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => (
                  <ExpenseCard key={item.id} item={item} formatCurrency={formatCurrency} />
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
            />

            {/* Filter bagian — sinkron dengan dropdown di navigasi */}
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter bagian keluarga">
              {FAMILY_CATEGORIES.map((cat) => {
                const active = familyFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFamilyFilter(cat.id)}
                    aria-pressed={active}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                      active
                        ? 'border-brand/50 bg-brandtint text-brandfg'
                        : 'border-line bg-surface text-mutedfg hover:bg-muted hover:text-ink'
                    }`}
                  >
                    <Icon name={cat.icon} size={16} />
                    {cat.label}
                    <span className="font-mono text-xs opacity-80">{countByCategory(familyAll, cat.id)}</span>
                  </button>
                );
              })}
            </div>

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
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
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

      case 'tasks':
        return (
          <section className="app-fade-in">
            <SectionHeader
              icon="tasks"
              title="Tugas Keluarga"
              subtitle={`${totals.tasksDone} dari ${data.tasks.length} selesai`}
              actionLabel="Tambah"
            />
            {data.tasks.length === 0 ? (
              <EmptyState icon="tasks" title="Belum ada tugas" message="Buat daftar tugas agar pekerjaan rumah terbagi rata." />
            ) : (
              <TaskList tasks={data.tasks} />
            )}
          </section>
        );

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
    return <WelcomeGate users={data.users} defaultUserId={activeUserId} onEnter={handleEnter} />;
  }

  return (
    <div className="app-bg flex min-h-screen flex-col text-ink">
      <Navigation
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        user={currentUser}
        onSwitchUser={() => setEntered(false)}
        schedule={data.schedule}
        expenses={data.expenses}
        family={familyAll}
        agendaFilter={agendaFilter}
        onAgendaSelect={handleAgendaSelect}
        financeFilter={financeFilter}
        onFinanceSelect={handleFinanceSelect}
        familyFilter={familyFilter}
        onFamilySelect={handleFamilySelect}
      />

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:pb-12"
      >
        {!isOnline && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-rose-200"
          >
            <Icon name="wifiOff" size={16} />
            <span>Mode offline — perubahan akan disinkronkan saat online.</span>
          </div>
        )}
        {renderSection()}
      </main>
    </div>
  );
}
