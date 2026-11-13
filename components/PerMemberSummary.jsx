import React from 'react';
import { Card, Badge } from './ui';
import { Icon } from './Icon';

/**
 * Ringkasan per anggota keluarga: utang bersih, tugas rumah tangga belum
 * selesai, dan agenda mendatang. Sumber data = `data` utama (sudah di-fetch
 * API) sehingga ikut sinkron antar perangkat.
 */
export function PerMemberSummary({ family = [], chores = [], tasks = [], schedule = [], debts = [], formatCurrency }) {
  const members = family.filter((m) => m.id);
  if (members.length === 0) return null;

  const userName = (id) => members.find((m) => m.id === id)?.name || '';

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="users" size={18} className="shrink-0 text-brandfg" />
        <h2 className="truncate font-bold text-ink">Ringkasan per Anggota</h2>
      </div>

      <ul className="divide-y divide-line">
        {members.map((m) => {
          const name = m.name || m.nama || '';
          // Utang bersih: yang diterima (lender) minus yang harus dibayar (borrower)
          const lent = debts
            .filter((d) => d.status === 'open' && d.lenderId === m.id)
            .reduce((s, d) => s + d.amount, 0);
          const owes = debts
            .filter((d) => d.status === 'open' && d.borrowerId === m.id)
            .reduce((s, d) => s + d.amount, 0);
          const net = lent - owes;
          const choresOpen = chores.filter((c) => c.status === 'open' && c.assigneeId === m.id).length;
          const tasksOpen = tasks.filter((t) => !t.completed && t.assignedTo === name).length;
          const upcoming = schedule.filter((s) => s.member === name && s.date).length;

          return (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brandtint text-xs font-bold text-brandfg">
                {(name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {net !== 0 && (
                    <Badge tone={net > 0 ? 'green' : 'amber'}>
                      {net > 0 ? 'Piutang ' : 'Utang '}
                      {formatCurrency(Math.abs(net))}
                    </Badge>
                  )}
                  {choresOpen > 0 && <Badge tone="violet">{choresOpen} chores</Badge>}
                  {tasksOpen > 0 && <Badge tone="blue">{tasksOpen} tugas</Badge>}
                  {upcoming > 0 && <Badge tone="cyan">{upcoming} agenda</Badge>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
