import { SHOPPING_CATEGORY } from './shoppingList';
import { SERVICE_CATEGORY } from './service';

/* Format warna tiap kategori event di kalender */
export const EVENT_COLORS = {
  agenda: 'bg-blue-500',
  expense: 'bg-green-500',
  income: 'bg-emerald-500',
  shopping: 'bg-amber-500',
  service: 'bg-red-500',
  tabungan: 'bg-violet-500',
  tagihan: 'bg-orange-500',
};

/* ---- Konversi semua data ke calendar events ----
   Input: semua data (schedule, expenses, income, notes, serviceInventory, serviceHistory)
   Output: array events untuk ditampilkan di kalender */
export const toCalendarEvents = (data) => {
  const events = [];

  // Agenda events (schedule)
  if (data?.schedule) {
    data.schedule.forEach((s) => {
      if (s.date) {
        events.push({
          id: `agenda-${s.id}`,
          title: s.title || 'Agenda',
          date: s.date,
          time: s.time || '08:00',
          category: 'agenda',
          color: EVENT_COLORS.agenda,
          data: { type: 'agenda', item: s },
        });
      }
    });
  }

  // Expense events (hanya yang punya date)
  if (data?.expenses) {
    data.expenses.forEach((e) => {
      if (e.date) {
        events.push({
          id: `expense-${e.id}`,
          title: e.description || 'Pengeluaran',
          date: e.date,
          time: e.time || '08:00',
          category: 'expense',
          amount: e.amount,
          color: EVENT_COLORS.expense,
          data: { type: 'expense', item: e },
        });
      }
    });
  }

  // Income events
  if (data?.income) {
    data.income.forEach((i) => {
      if (i.date) {
        events.push({
          id: `income-${i.id}`,
          title: i.description || 'Pemasukan',
          date: i.date,
          time: i.time || '08:00',
          category: 'income',
          amount: i.amount,
          color: EVENT_COLORS.income,
          data: { type: 'income', item: i },
        });
      }
    });
  }

  // Service history events
  if (data?.serviceHistory) {
    data.serviceHistory.forEach((s) => {
      if (s.date) {
        events.push({
          id: `service-${s.id}`,
          title: `Service: ${s.technician || 'Tanpa nama'}`,
          date: s.date,
          time: '08:00',
          category: 'service',
          amount: s.total,
          items: s.items?.length || 0,
          color: EVENT_COLORS.service,
          data: { type: 'service', item: s },
        });
      }
    });
  }

  // Shopping items - create monthly events
  // Note: shopping items are stored in notes, handled separately in App.jsx

  // Tasks with due dates
  if (data?.tasks) {
    data.tasks.forEach((t) => {
      if (t.dueDate) {
        events.push({
          id: `task-${t.id}`,
          title: t.title || 'Tugas',
          date: t.dueDate,
          time: '08:00',
          category: 'task',
          completed: t.completed,
          priority: t.priority,
          color: t.completed ? 'bg-gray-400' : (EVENT_COLORS.agenda),
          data: { type: 'task', item: t },
        });
      }
    });
  }

  // Tagihan / utang-piutang (jatuh tempo) — dari state tagihans (API /api/bill)
  if (data?.bills) {
    data.bills.forEach((b) => {
      if (b.dueDate) {
        const lunas = b.amount > 0 && (Number(b.dibayar) || 0) >= b.amount;
        events.push({
          id: `tagihan-${b.id}`,
          title: b.nama || 'Tagihan',
          date: b.dueDate,
          time: null,
          category: 'tagihan',
          lunas,
          amount: b.amount,
          color: lunas ? 'bg-orange-300' : EVENT_COLORS.tagihan,
          data: { type: 'tagihan', item: b },
        });
      }
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
};

/* Filter events by month (YYYY-MM) */
export const eventsByMonth = (events, yearMonth) => {
  if (!yearMonth) return events;
  return events.filter((e) => e.date?.startsWith(yearMonth));
};

/* Get unique categories from events */
export const eventCategories = (events) => {
  const cats = new Set(events.map((e) => e.category));
  return Array.from(cats);
};