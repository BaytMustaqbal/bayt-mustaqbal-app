import React from 'react';
import { Card, Badge, CARD_INTERACTIVE } from './ui';

export function FamilyMemberCard({ member }) {
  const isActive = member.status === 'active';

  return (
    <Card className={`p-4 text-center ${CARD_INTERACTIVE} hover:border-brand sm:p-5`}>
      <span
        className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-brand/25 bg-brandtint text-base font-bold text-brandfg sm:h-16 sm:w-16 sm:text-lg"
        aria-hidden="true"
      >
        {member.initials}
      </span>
      <h2 className="mt-2.5 truncate font-semibold text-ink sm:mt-3">{member.name}</h2>
      <p className="truncate text-sm text-mutedfg">{member.role}</p>
      <div className="mt-3 flex justify-center">
        <Badge tone={isActive ? 'green' : 'gray'}>
          {isActive ? 'Aktif' : 'Tidak aktif'}
        </Badge>
      </div>
    </Card>
  );
}
