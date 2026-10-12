import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './components/Icon';
import { Navigation } from './components/Navigation';
import { ScheduleItem } from './components/ScheduleItem';
import { FamilyMemberCard } from './components/FamilyMemberCard';
import { TaskList } from './components/TaskList';
import { Dashboard } from './components/Dashboard';
import { WelcomeGate } from './components/WelcomeGate';
import { Card, SectionHeader, EmptyState, ExpenseCard } from './components/ui';
import './App.css';

// Data contoh (sementara, sampai backend Worker + D1 siap)
const mockData = {
  users: [
    { id: 'kakang', name: 'Kakang', role: 'Admin', initials: 'KA' },
    { id: 'istri', name: 'Istri', role: 'Anggota', initials: 'IS' },
  ],
  family: [
    { id: 1, name: 'Kakang', role: 'Admin', initials: 'KA', status: 'active' },
    { id: 2, name: 'Istri', role: 'Anggota', initials: 'IS', status: 'active' },
    { id: 3, name: 'Anak 1', role: 'Anggota', initials: 'A1', status: 'active' },
    { id: 4, name: 'Anak 2', role: 'Anggota', initials: 'A2', status: 'active' },
  ],
  schedule: [
    { id: 1, title: 'Makan Malam Keluarga', time: '19:00', date: '2026-10-15', member: 'Kakang' },
    { id: 2, title: 'Rapat Wali Murid', time: '14:00', date: '2026-10-16', member: 'Istri' },
    { id: 3, title: 'Service Motor', time: '09:00', date: '2026-10-17', member: 'Kakang' },
    { id: 4, title: 'Les Musik Anak', time: '16:00', date: '2026-10-18', member: 'Anak 1' },
  ],
  expenses: [
    { id: 1, category: 'Belanja Bulanan', amount: 1250000, description: 'Belanja kebutuhan dapur', date: '2026-10-14' },
    { id: 2, category: 'Listrik & Air', amount: 480000, description: 'Tagihan bulanan', date: '2026-10-13' },
    { id: 3, category: 'Pendidikan', amount: 750000, description: 'SPP sekolah', date: '2026-10-12' },
    { id: 4, category: 'Transportasi', amount: 300000, description: 'Bensin & tol', date: '2026-10-11' },
  ],
  tasks: [
    { id: 1, title: 'Bersihkan dapur', completed: false, assignedTo: 'Anak 1', dueDate: '2026-10-15', priority: 'high' },
    { id: 2, title: 'Cuci mobil', completed: true, assignedTo: 'Anak 2', dueDate: '2026-10-14', priority: 'medium' },
    { id: 3, title: 'Belanja mingguan', completed: false, assignedTo: 'Istri', dueDate: '2026-10-16', priority: 'high' },
    { id: 4, title: 'Baca buku anak', completed: true, assignedTo: 'Kakang', dueDate: '2026-10-14', priority: 'low' },
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

  const handleEnter = (userId) => {
    storeUser(userId);
    setActiveUserId(userId);
    setActiveSection('dashboard');
    setEntered(true);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'agenda':
        return (
          <section className="app-fade-in">
            <SectionHeader
              icon="calendar"
              title="Agenda Keluarga"
              subtitle="Jadwal kegiatan bersama"
              actionLabel="Tambah"
            />
            {data.schedule.length === 0 ? (
              <EmptyState icon="calendar" title="Belum ada agenda" message="Tambahkan agenda pertama untuk mengatur kegiatan keluarga." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.schedule.map((item) => (
                  <ScheduleItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        );

      case 'expenses':
        return (
          <section className="app-fade-in">
            <SectionHeader
              icon="wallet"
              title="Pengeluaran"
              subtitle={`Total: ${formatCurrency(totals.totalExpense)} · anggaran ${formatCurrencyShort(data.budget.total)}`}
              actionLabel="Tambah"
              actionTone="accent"
            />
            {data.expenses.length === 0 ? (
              <EmptyState icon="wallet" title="Belum ada pengeluaran" message="Catat pengeluaran agar keuangan keluarga lebih terkontrol." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.expenses.map((item) => (
                  <ExpenseCard key={item.id} item={item} formatCurrency={formatCurrency} />
                ))}
              </div>
            )}
          </section>
        );

      case 'family':
        return (
          <section className="app-fade-in">
            <SectionHeader
              icon="users"
              title="Anggota Keluarga"
              subtitle={`${data.family.length} anggota terdaftar`}
              actionLabel="Tambah"
            />
            {data.family.length === 0 ? (
              <EmptyState icon="users" title="Belum ada anggota" message="Tambahkan anggota keluarga untuk mulai berkolaborasi." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {data.family.map((member) => (
                  <FamilyMemberCard key={member.id} member={member} />
                ))}
              </div>
            )}
          </section>
        );

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
