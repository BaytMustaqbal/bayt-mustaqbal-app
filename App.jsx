import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './components/Icon';
import { Navigation } from './components/Navigation';
import { ScheduleItem } from './components/ScheduleItem';
import { FamilyMemberCard } from './components/FamilyMemberCard';
import { TaskList } from './components/TaskList';
import { Card, SectionHeader, StatCard, EmptyState, ExpenseCard } from './components/ui';
import './App.css';

// Data contoh (sementara, sampai backend Worker + D1 siap)
const mockData = {
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
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

// Versi ringkas untuk KPI di layar kecil: 2.780.000 → "Rp 2,8 jt"
const formatCurrencyShort = (value) => {
  const n = Number(value) || 0;
  const short = (v, unit) => `Rp ${v.toFixed(1).replace('.', ',').replace(',0', '')} ${unit}`;
  if (n >= 1_000_000_000) return short(n / 1_000_000_000, 'M');
  if (n >= 1_000_000) return short(n / 1_000_000, 'jt');
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)} rb`;
  return formatCurrency(n);
};

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Data dummy murni — belum terhubung ke backend/API apa pun.
  // Ganti dengan state + fetch saat Worker + D1 sudah siap.
  const data = mockData;

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
              subtitle={`Total bulan ini: ${formatCurrency(totals.totalExpense)}`}
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
          <section className="app-fade-in space-y-6 sm:space-y-8">
            {/* Hero */}
            <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 md:p-8">
              <p className="inline-flex items-center gap-2 rounded-full bg-brandtint px-3 py-1 text-xs font-semibold text-branddark">
                <Icon name="home" size={14} />
                Rumah Masa Depan
              </p>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:mt-4 sm:text-3xl md:text-4xl">
                Dashboard Keluarga
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-mutedfg sm:text-base">
                Pantau agenda, pengeluaran, anggota, dan tugas keluarga dalam satu tempat.
              </p>
            </div>

            {/* Statistik */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard icon="calendar" tone="teal" value={data.schedule.length} label="Agenda" hint="Jadwal aktif" />
              <StatCard
                icon="wallet"
                tone="emerald"
                value={formatCurrencyShort(totals.totalExpense)}
                valueTitle={formatCurrency(totals.totalExpense)}
                label="Pengeluaran"
                hint="Bulan ini"
              />
              <StatCard icon="users" tone="sky" value={data.family.length} label="Anggota" hint="Terdaftar" />
              <StatCard icon="tasks" tone="amber" value={`${totals.tasksDone}/${data.tasks.length}`} label="Tugas" hint="Selesai" />
            </div>

            {/* Panel ringkasan */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="mb-3 flex items-center gap-2 sm:mb-4">
                  <Icon name="calendar" size={18} className="text-branddark" />
                  <h2 className="font-bold text-ink">Agenda Terdekat</h2>
                </div>
                {data.schedule.length === 0 ? (
                  <p className="py-6 text-center text-sm text-mutedfg">Belum ada agenda.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.schedule.slice(0, 4).map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                            <p className="truncate text-xs text-mutedfg">{item.time} · {item.member}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-mutedfg">{item.date}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-4 sm:p-5 md:p-6">
                <div className="mb-3 flex items-center gap-2 sm:mb-4">
                  <Icon name="wallet" size={18} className="text-branddark" />
                  <h2 className="font-bold text-ink">Pengeluaran Terbaru</h2>
                </div>
                {data.expenses.length === 0 ? (
                  <p className="py-6 text-center text-sm text-mutedfg">Belum ada pengeluaran.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.expenses.slice(0, 4).map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{item.category}</p>
                          <p className="truncate text-xs text-mutedfg">{item.description}</p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-branddark">
                          {formatCurrency(item.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </section>
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <Navigation activeSection={activeSection} onSectionChange={setActiveSection} />

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:pb-12"
      >
        {!isOnline && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
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
