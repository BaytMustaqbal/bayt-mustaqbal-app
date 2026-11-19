import { useState } from 'react';

import { notesApi, txn } from '../services/client';
import {
  monthTitle, weekTitle, parseShoppingNote, serializeShopping,
  emptyShopping, newShoppingItem, copyForMonth, toTemplateItems,
  SHOPPING_CATEGORY, SHOPPING_TEMPLATE_TITLE, sumItems,
} from '../components/shoppingList';
import { monthKeyOf } from '../utils/finance';
import { todayKey } from '../utils/date';

/** Pekan ISO berjalan (Senin-Minggu). */
const shoppingWeekKey = () => {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Senin = 0
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // Kamis pekan ini
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date - firstThursday) / (7 * 86400000));
  return `${date.getUTCFullYear()}-W${pad(week)}`;
};

/** Daftar belanja mingguan & bulanan, disimpan sebagai catatan kategori belanja.
    Item disimpan sebagai JSON di `body`. */
export function useShoppingList({ dataRef, saveData, currentUser, pushToast, addItemToState }) {
  const [shoppingPeriod, setShoppingPeriod] = useState('bulanan');

  const shoppingMonthKey = () => monthKeyOf(new Date());

  const shoppingTitleFor = (period = shoppingPeriod) =>
    period === 'mingguan' ? weekTitle(shoppingWeekKey()) : monthTitle(shoppingMonthKey());

  const findShoppingNote = (period = shoppingPeriod) =>
    (dataRef.current.notes || []).find(
      (n) => n.category === SHOPPING_CATEGORY && n.title === shoppingTitleFor(period)
    ) || null;

  const findTemplateNote = () =>
    (dataRef.current.notes || []).find(
      (n) => n.category === SHOPPING_CATEGORY && n.title === SHOPPING_TEMPLATE_TITLE
    ) || null;

  // Tampilan: pakai catatan periode ini kalau ada; kalau belum, salin isi
  // template (centang direset) supaya daftar baru tidak mulai kosong.
  const displayShoppingState = (period = shoppingPeriod) => {
    const existing = findShoppingNote(period);
    if (existing) return parseShoppingNote(existing);
    const tpl = findTemplateNote();
    if (tpl) return { ...emptyShopping(), items: copyForMonth(parseShoppingNote(tpl).items) };
    return emptyShopping();
  };

  // Simpan state belanja: optimis ke lokal, lalu sinkron ke backend.
  const applyShoppingState = async (state, period = shoppingPeriod) => {
    const current = dataRef.current;
    const title = shoppingTitleFor(period);
    const body = serializeShopping(state);
    const nextNotes = current.notes || [];
    const idx = nextNotes.findIndex(
      (n) => n.category === SHOPPING_CATEGORY && n.title === title
    );
    if (idx >= 0) {
      const updated = { ...nextNotes[idx], body };
      saveData({ ...current, notes: nextNotes.map((n, i) => (i === idx ? updated : n)) });
      try {
        await notesApi.update(nextNotes[idx].id, { title, body, category: SHOPPING_CATEGORY, pinned: false }, currentUser);
      } catch { /* offline: tetap simpan lokal */ }
    } else {
      try {
        const created = await notesApi.create({ title, body, category: SHOPPING_CATEGORY, pinned: false }, currentUser);
        saveData({ ...current, notes: [...nextNotes, created] });
      } catch {
        const local = {
          id: `local-shop-${Date.now()}`,
          title,
          body,
          category: SHOPPING_CATEGORY,
          pinned: false,
          author: currentUser?.name || '',
          updatedAt: todayKey(),
        };
        saveData({ ...current, notes: [...nextNotes, local] });
      }
    }
  };

  const getOrCreateShoppingNote = (period = shoppingPeriod) => {
    const existing = findShoppingNote(period);
    return { note: existing, state: existing ? parseShoppingNote(existing) : displayShoppingState(period) };
  };

  const addShoppingItem = async (values, period = shoppingPeriod) => {
    const { state } = getOrCreateShoppingNote(period);
    await applyShoppingState({ ...state, items: [...state.items, newShoppingItem(values)] }, period);
  };

  const toggleShoppingItem = async (id, period = shoppingPeriod) => {
    const { state } = getOrCreateShoppingNote(period);
    await applyShoppingState({
      ...state,
      items: state.items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
    }, period);
  };

  const removeShoppingItem = async (id, period = shoppingPeriod) => {
    const { state } = getOrCreateShoppingNote(period);
    await applyShoppingState({ ...state, items: state.items.filter((it) => it.id !== id) }, period);
  };

  const saveShoppingAsTemplate = async () => {
    const { state } = getOrCreateShoppingNote();
    const body = JSON.stringify({ v: 1, items: toTemplateItems(state.items), selesai: false, expenseId: null });
    const current = dataRef.current;
    const nextNotes = current.notes || [];
    const idx = nextNotes.findIndex(
      (n) => n.category === SHOPPING_CATEGORY && n.title === SHOPPING_TEMPLATE_TITLE
    );
    if (idx >= 0) {
      const updated = { ...nextNotes[idx], body };
      saveData({ ...current, notes: nextNotes.map((n, i) => (i === idx ? updated : n)) });
      try {
        await notesApi.update(nextNotes[idx].id, { title: SHOPPING_TEMPLATE_TITLE, body, category: SHOPPING_CATEGORY, pinned: false }, currentUser);
      } catch { /* offline */ }
    } else {
      try {
        const created = await notesApi.create({ title: SHOPPING_TEMPLATE_TITLE, body, category: SHOPPING_CATEGORY, pinned: false }, currentUser);
        saveData({ ...current, notes: [...nextNotes, created] });
      } catch {
        saveData({
          ...current,
          notes: [
            ...nextNotes,
            { id: `local-shop-tpl-${Date.now()}`, title: SHOPPING_TEMPLATE_TITLE, body, category: SHOPPING_CATEGORY, pinned: false, author: currentUser?.name || '', updatedAt: todayKey() },
          ],
        });
      }
    }
  };

  const finishShopping = async (period = shoppingPeriod) => {
    const { state } = getOrCreateShoppingNote(period);
    if (!state.items.length) return;
    const total = sumItems(state.items, true);
    if (total <= 0) {
      pushToast({ message: 'Belum ada item tercentang dengan harga.', duration: 3500, tone: 'warning' });
      return;
    }
    try {
      const result = await txn.create({
        category: SHOPPING_CATEGORY,
        description: `${shoppingTitleFor(period)} (beres)`,
        amount: total,
        date: todayKey(),
        bucket: 'auto',
      });
      addItemToState('expenses', result);
      await applyShoppingState({ ...state, selesai: true, expenseId: result.id }, period);
    } catch {
      pushToast({ message: 'Gagal mencatat belanja sebagai pengeluaran.', duration: 4000, tone: 'danger' });
    }
  };

  return {
    shoppingPeriod, setShoppingPeriod,
    shoppingTitleFor, displayShoppingState,
    addShoppingItem, toggleShoppingItem, removeShoppingItem,
    saveShoppingAsTemplate, finishShopping,
  };
}
