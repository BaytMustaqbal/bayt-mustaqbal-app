import React from 'react';
import { Icon } from './Icon';
import { Card, Badge, ItemActions, CARD_INTERACTIVE } from './ui';
import { NOTE_CATEGORIES, getCategoryMeta } from './categories';

/* ============================================================================
   Catatan Keluarga — daftar kartu catatan.

   Tiap kartu: ikon kategori, judul, isi (maks 3 baris), dan baris meta
   (kategori + penulis + tanggal). Catatan "penting" (pinned) diberi badge.
   ============================================================================ */

export function NoteList({ notes = [], onEdit, onDelete, onRetry, onDiscard, readOnly = false }) {
  return (
    <ul className="stagger grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => {
        const meta = getCategoryMeta(NOTE_CATEGORIES, note.category);
        return (
          <li key={note.id}>
            <Card className={`flex h-full flex-col gap-2.5 p-4 ${CARD_INTERACTIVE} hover:border-brand/50 sm:p-5`}>
              <div className="flex items-start gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brandtint text-brandfg"
                  aria-hidden="true"
                >
                  <Icon name={meta?.icon || 'note'} size={19} />
                </span>
                <h3 className="min-w-0 flex-1 pt-1 font-semibold leading-snug text-ink">{note.title}</h3>
                {note.pinned && (
                  <span
                    className="shrink-0 rounded-full bg-toneamber/15 p-1.5 text-toneamberfg"
                    title="Penting"
                    aria-label="Ditandai penting"
                  >
                    <Icon name="pin" size={14} />
                  </span>
                )}
              </div>

              {note.pending && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-2.5 py-1.5">
                  <Badge tone={note.failed ? 'red' : 'amber'}>{note.failed ? 'Gagal sinkron' : 'Menunggu sinkron'}</Badge>
                  {!readOnly && (
                    <span className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onRetry?.(note)}
                        aria-label="Coba sinkron lagi"
                        className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-line hover:text-ink"
                      >
                        <Icon name="refresh" size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDiscard?.(note)}
                        aria-label="Hapus catatan offline"
                        className="grid h-8 w-8 place-items-center rounded-lg text-mutedfg transition-colors hover:bg-tonerose/15 hover:text-tonerosefg"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {note.body && <p className="clamp-3 text-sm leading-relaxed text-mutedfg">{note.body}</p>}

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge tone={note.pinned ? 'amber' : 'brand'}>{meta?.label || 'Catatan'}</Badge>
                  <span className="inline-flex items-center gap-1.5 text-xs text-mutedfg">
                    {note.author && <span className="truncate">{note.author}</span>}
                    {note.author && note.updatedAt && <span aria-hidden="true">·</span>}
                    {note.updatedAt && <span className="font-mono">{note.updatedAt}</span>}
                  </span>
                </div>
                <ItemActions label={note.title} onEdit={() => onEdit?.(note)} onDelete={() => onDelete?.(note)} readOnly={readOnly || note.pending} hideDelete />
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
