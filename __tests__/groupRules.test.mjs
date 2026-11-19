import { test } from 'node:test';
import { strictEqual, ok } from 'node:assert';

import { groupQueryFrom, canGroupReply, WRITE_ROLES } from '../wa-bot/src/groupRules.js';

test('groupQueryFrom: prefix neuro + pemisah', () => {
  strictEqual(groupQueryFrom('neuro saldo bulan ini'), 'saldo bulan ini');
  strictEqual(groupQueryFrom('neuro, saldo'), 'saldo');
  strictEqual(groupQueryFrom('neuro: saldo'), 'saldo');
  strictEqual(groupQueryFrom('neuro. saldo'), 'saldo');
  strictEqual(groupQueryFrom('neuro! saldo'), 'saldo');
  strictEqual(groupQueryFrom('neuro - saldo'), 'saldo');
  strictEqual(groupQueryFrom('  neuro   saldo  '), 'saldo');
});

test('groupQueryFrom: case-insensitive', () => {
  strictEqual(groupQueryFrom('NEURO saldo'), 'saldo');
  strictEqual(groupQueryFrom('Neuro Saldo'), 'Saldo');
});

test('groupQueryFrom: neuro tanpa isi tetap dianggap panggilan', () => {
  strictEqual(groupQueryFrom('neuro'), '');
  strictEqual(groupQueryFrom('Neuro, '), '');
});

test('groupQueryFrom: pesan tanpa prefix neuro diabaikan', () => {
  strictEqual(groupQueryFrom('/saldo'), null);
  strictEqual(groupQueryFrom('saldo bulan ini'), null);
  strictEqual(groupQueryFrom('halo neuro'), null);
  strictEqual(groupQueryFrom('neurologi apa kabar'), null);
  strictEqual(groupQueryFrom('neurosaldo'), null);
  strictEqual(groupQueryFrom(''), null);
  strictEqual(groupQueryFrom(null), null);
  strictEqual(groupQueryFrom(undefined), null);
});

test('canGroupReply: hanya kepala_keluarga, suami, istri', () => {
  ok(WRITE_ROLES.has('kepala_keluarga'));
  strictEqual(canGroupReply({ id: 'u1', group_role: 'kepala_keluarga' }), true);
  strictEqual(canGroupReply({ id: 'u1', group_role: 'suami' }), true);
  strictEqual(canGroupReply({ id: 'u1', group_role: 'istri' }), true);
  strictEqual(canGroupReply({ id: 'u1', group_role: ' ISTRI ' }), true);
});

test('canGroupReply: peran lain dan user kosong ditolak', () => {
  strictEqual(canGroupReply({ id: 'u1', group_role: 'anak' }), false);
  strictEqual(canGroupReply({ id: 'u1', group_role: 'anggota' }), false);
  strictEqual(canGroupReply({ id: 'u1', group_role: '' }), false);
  strictEqual(canGroupReply({ id: 'u1' }), false);
  strictEqual(canGroupReply({ group_role: 'istri' }), false);
  strictEqual(canGroupReply(null), false);
  strictEqual(canGroupReply(undefined), false);
});
