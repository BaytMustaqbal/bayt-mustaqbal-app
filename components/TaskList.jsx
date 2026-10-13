import React from 'react';
import { Icon } from './Icon';
import { Card, Badge, ItemActions, CARD_INTERACTIVE } from './ui';

const PRIORITY_TONE = { high: 'red', medium: 'amber', low: 'green' };
const PRIORITY_LABEL = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };

// Controlled: perubahan toggle diteruskan ke induk (App) agar tersimpan ke
// localStorage — tidak hilang saat reload.
export function TaskList({ tasks = [], onToggle, onEdit, onDelete }) {
  return (
    <ul className="stagger space-y-3">
      {tasks.map((task) => (
        <li key={task.id}>
          <Card className={`p-3.5 ${CARD_INTERACTIVE} hover:border-brand sm:p-4 ${task.completed ? 'opacity-70' : ''}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3.5">
                {/* Kotak 28px, tapi area sentuh 44px (standar jari) */}
                <button
                  type="button"
                  onClick={() => onToggle?.(task.id)}
                  aria-pressed={task.completed}
                  aria-label={`Tandai "${task.title}" ${task.completed ? 'belum selesai' : 'selesai'}`}
                  className="-m-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                >
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-lg border-2 transition-colors ${
                      task.completed
                        ? 'border-cta bg-cta text-white'
                        : 'border-line text-transparent'
                    }`}
                  >
                    <Icon name="check" size={15} strokeWidth={3} />
                  </span>
                </button>
                <p className={`truncate font-medium text-ink ${task.completed ? 'text-mutedfg line-through' : ''}`}>
                  {task.title}
                </p>
              </div>
              <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
              <p className="truncate text-xs text-mutedfg">
                {task.assignedTo} &middot; jatuh tempo {task.dueDate}
              </p>
              <ItemActions label={task.title} onEdit={() => onEdit?.(task)} onDelete={() => onDelete?.(task)} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}