import React from 'react';
import { Icon } from './Icon';
import { Card, Badge } from './ui';
import { getCategoryMeta } from './agendaCategories';

export function ScheduleItem({ item }) {
  const meta = getCategoryMeta(item.category);
  return (
    <Card className="p-4 transition-colors hover:border-brand sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brandtint text-brandfg" aria-hidden="true">
            <Icon name={meta?.icon || 'calendar'} size={19} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-ink">{item.title}</h2>
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-mutedfg">
              <Icon name="clock" size={13} />
              {item.time}
            </p>
          </div>
        </div>
        {/* Kotak visual 36px, tapi area sentuh 44px (standar jari) */}
        <button
          type="button"
          aria-label={`Opsi untuk ${item.title}`}
          className="group -m-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg text-mutedfg transition-colors group-hover:bg-muted group-hover:text-ink">
            <Icon name="moreVertical" size={18} />
          </span>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <Badge tone="brand">{item.member}</Badge>
        <span className="text-xs text-mutedfg">{item.date}</span>
      </div>
    </Card>
  );
}
