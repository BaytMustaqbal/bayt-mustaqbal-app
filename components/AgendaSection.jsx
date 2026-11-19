import { Icon } from './Icon';
import { SectionHeader, EmptyState } from './ui';
import { SlideTabs } from './SlideTabs';
import { ScheduleItem } from './ScheduleItem';
import { TaskList } from './TaskList';
import { FamilyCalendar } from './Calendar';
import { Timeline } from './Timeline';
import { AGENDA_CATEGORIES, TASK_FILTERS, countByTaskFilter } from './categories';

const AGENDA_TABS = [
  { id: 'jadwal', label: 'Jadwal', icon: 'clock' },
  { id: 'tugas', label: 'Tugas', icon: 'tasks' },
  { id: 'kalender', label: 'Kalender', icon: 'calendar' },
  { id: 'timeline', label: 'Timeline', icon: 'activity' },
];

/** Section Agenda: jadwal, tugas, kalender, dan timeline. */
export function AgendaSection({
  data,
  canWrite,
  formatCurrency,
  agendaFilter,
  agendaMode,
  setAgendaMode,
  memberFilter,
  setMemberFilter,
  taskFilter,
  setTaskFilter,
  filteredTasks,
  tagihanEvents,
  scheduledEvents,
  memberColorOf,
  KELUARGA,
  toggleTask,
  openAdd,
  openEdit,
  deleteItem,
  canManageOwnAgenda,
  recordScheduledExpense,
  setActiveSection,
  pushToast,
}) {
  const activeMeta = AGENDA_CATEGORIES.find((c) => c.id === agendaFilter) || AGENDA_CATEGORIES[0];
  const filtered =
    agendaFilter === 'semua'
      ? data.schedule
      : data.schedule.filter((item) => item.category === agendaFilter);

  // Filter anggota khusus tampilan Kalender: 'semua' | 'keluarga' | user_id
  const agendaForCalendar =
    memberFilter === 'semua'
      ? filtered
      : filtered.filter((item) => (item.memberId || KELUARGA) === memberFilter);
  const memberChips = [
    { value: 'semua', label: 'Semua', color: null },
    { value: KELUARGA, label: 'Keluarga', color: 'bg-member5' },
    ...(data?.users || []).map((u) => ({
      value: String(u.id),
      label: u.nickname || u.name || u.nama || 'Anggota',
      color: memberColorOf(u.id),
    })),
  ];
  const agendaMemberLegend = memberChips
    .filter((chip) => chip.value !== 'semua')
    .map((chip) => ({ label: chip.label, color: chip.color }));

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
                actionLabel: canWrite ? 'Tambah' : undefined,
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
                subtitle: `${(filtered || []).length} agenda · ${tagihanEvents.length} tagihan`,
                actionLabel: 'Tambah',
                onAction: () => openAdd('agenda'),
              })}
      />

      {/* Sub-tampilan Agenda: Jadwal | Tugas | Kalender | Timeline */}
      <div className="mb-5 overflow-x-auto rounded-xl bg-muted/50 p-1" role="tablist" aria-label="Mode tampilan agenda">
        <SlideTabs
          tabs={AGENDA_TABS}
          active={agendaMode}
          onChange={setAgendaMode}
        />
      </div>

      {agendaMode === 'kalender' && (
        <div className="mb-4 flex items-center gap-2" aria-label="Filter anggota agenda">
          <span className="shrink-0 text-xs font-semibold text-mutedfg">Anggota:</span>
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1" role="group">
            {memberChips.map((chip) => {
              const active = memberFilter === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setMemberFilter(chip.value)}
                  aria-pressed={active}
                  className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors ${
                    active
                      ? 'border-brand/25 bg-brandtint text-brandfg'
                      : 'border-line text-mutedfg hover:bg-muted hover:text-ink'
                  }`}
                >
                  {chip.color
                    ? <span className={`h-2.5 w-2.5 rounded-full ${chip.color}`} aria-hidden="true" />
                    : <Icon name="users" size={14} />}
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {agendaMode === 'tugas' ? (
        <>
          {/* Filter tugas: status & prioritas (chip di dalam sub-tampilan Tugas) */}
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
              readOnly={!canWrite}
            />
          )}
        </>
      ) : agendaMode === 'timeline' ? (
        <Timeline data={data} onEdit={openEdit} formatCurrency={formatCurrency} readOnly={!canWrite} />
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
                    readOnly={!canManageOwnAgenda(item)}
                  />
                ))}
              </div>
            )
          ) : (
            <FamilyCalendar
              items={agendaForCalendar}
              tasks={data.tasks}
              events={[...tagihanEvents, ...scheduledEvents]}
              memberLegend={agendaMemberLegend}
              onCatatScheduled={recordScheduledExpense}
              onNavigate={setActiveSection}
              formatCurrency={formatCurrency}
              readOnly={!canWrite}
              onEventClick={(event) => {
                const { type, item } = event.data;
                if (type === 'tagihan') {
                  // Tagihan belum punya FormSheet sendiri: ringkasan singkat dulu.
                  const lunas = item.amount > 0 && (Number(item.dibayar) || 0) >= item.amount;
                  pushToast({
                    message: `${item.nama} · jatuh tempo ${item.dueDate} · ${
                      lunas ? 'sudah lunas' : `sisa ${formatCurrency(item.amount - (item.dibayar || 0))}`
                    }`,
                    duration: 4000,
                  });
                  return;
                }
                if (type === 'scheduled') {
                  pushToast({ message: `Pengeluaran terjadwal: ${item.name || item.nama || 'Jadwal'} · ${formatCurrency(item.amount || 0)} · jatuh tempo ${item.day || ''}`.trim(), duration: 4000 });
                  return;
                }
                if (type === 'recurring') {
                  pushToast({ message: `Transaksi berulang: ${item.nama || item.name || 'Jadwal'} · ${formatCurrency(item.amount || 0)} · perkiraan habis ${item.next_due || ''}`.trim(), duration: 4000 });
                  return;
                }
                if (type === 'langganan') {
                  pushToast({ message: `Langganan: ${item.name || 'Langganan'} · ${formatCurrency(item.amount || 0)} · tagih tanggal ${item.billing_day || ''}`.trim(), duration: 4000 });
                  return;
                }
                if (type === 'service-due') {
                  pushToast({ message: `Service motor: ${item.nama || 'Motor'} · jatuh tempo ${item.nextDue || ''}`.trim(), duration: 4000 });
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
