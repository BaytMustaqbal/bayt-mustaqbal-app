import React from 'react';
import { Icon } from './Icon';
import { Card, Badge, ItemActions, CARD_INTERACTIVE } from './ui';
import { AGENDA_CATEGORIES, getCategoryMeta } from './categories';

export function ScheduleItem({ item, onEdit, onDelete }) {
  const meta = getCategoryMeta(AGENDA_CATEGORIES, item.category);
  return (
    <Card className={`flex h-full flex-col p-4 ${CARD_INTERACTIVE} hover:border-brand sm:p-5`}>
      <div className="flex items-start gap-3 pb-4">
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

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge tone="brand">{item.member}</Badge>
          <span className="text-xs text-mutedfg">{item.date}</span>
        </div>
        <ItemActions label={item.title} onEdit={() => onEdit?.(item)} onDelete={() => onDelete?.(item)} />
      </div>
    </Card>
  );
}
