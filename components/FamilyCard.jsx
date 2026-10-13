import React from 'react';
import { Card, Badge, CARD_INTERACTIVE } from './ui';

export function FamilyCard({ member, onClick }) {
  const isActive = member.status === 'active';

  return (
    <Card
      as="button"
      className={`flex w-full items-center gap-4 p-4 text-left ${CARD_INTERACTIVE} hover:border-brand sm:p-5`}
      onClick={() => onClick && onClick(member)}
    >
      <span
        className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brandtint text-base font-bold text-brandfg"
        aria-hidden="true"
      >
        {member.initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{member.name}</span>
        <span className="block truncate text-sm text-mutedfg">{member.role}</span>
        <span className="mt-2 block">
          <Badge tone={isActive ? 'green' : 'gray'}>{isActive ? 'Aktif' : 'Tidak aktif'}</Badge>
        </span>
      </span>
    </Card>
  );
}
