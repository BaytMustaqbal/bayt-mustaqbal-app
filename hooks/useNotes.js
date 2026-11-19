import { useMemo, useState } from 'react';

import { SHOPPING_CATEGORY } from '../components/shoppingList';
import { SERVICE_CATEGORY } from '../components/service';

/** State filter + pencarian catatan, dipakai section Catatan.
    Catatan template belanja dan service disembunyikan dari tab Catatan. */
export function useNotes(notes) {
  const [noteFilter, setNoteFilter] = useState('semua');
  const [noteQuery, setNoteQuery] = useState('');

  const list = useMemo(() => (Array.isArray(notes) ? notes : []), [notes]);

  const totalNonShopping = useMemo(
    () => list.filter((n) => n.category !== SHOPPING_CATEGORY).length,
    [list],
  );

  const filteredNotes = useMemo(() => {
    const base =
      noteFilter === 'semua'
        ? list.filter((n) => n.category !== SHOPPING_CATEGORY && n.category !== SERVICE_CATEGORY)
        : noteFilter === 'penting'
          ? list.filter((n) => n.pinned && n.category !== SHOPPING_CATEGORY && n.category !== SERVICE_CATEGORY)
          : list.filter((n) => n.category === noteFilter && n.category !== SHOPPING_CATEGORY && n.category !== SERVICE_CATEGORY);
    const q = noteQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((n) => `${n.title} ${n.body || ''}`.toLowerCase().includes(q));
  }, [list, noteFilter, noteQuery]);

  return { noteFilter, setNoteFilter, noteQuery, setNoteQuery, filteredNotes, totalNonShopping };
}
