import { test } from 'node:test';
import { strictEqual, deepEqual } from 'node:assert';

import { normalizeAiPrefs, resolveAiPrefsFor, AI_PREFS_DEFAULTS } from '../utils/aiPrefs.js';

test('normalizeAiPrefs: null/invalid -> defaults (members {})', () => {
  const d = normalizeAiPrefs(null);
  deepEqual(d, { ...AI_PREFS_DEFAULTS, members: {} });
  deepEqual(normalizeAiPrefs('not-json'), { ...AI_PREFS_DEFAULTS, members: {} });
  deepEqual(normalizeAiPrefs(42), { ...AI_PREFS_DEFAULTS, members: {} });
});

test('normalizeAiPrefs: scalar fields clamped/normalized', () => {
  const r = normalizeAiPrefs({ summaryItems: 99, maxSentences: 0, persona: '   ', style: 'NGAWUR', chatEnabled: false, receiptScanEnabled: false });
  strictEqual(r.summaryItems, 10);
  strictEqual(r.maxSentences, 1);
  strictEqual(r.persona, 'Neuro');
  strictEqual(r.style, 'santai');
  strictEqual(r.chatEnabled, false);
  strictEqual(r.receiptScanEnabled, false);
});

test('normalizeAiPrefs: persona trimmed to 40 chars', () => {
  const long = 'A'.repeat(60);
  const r = normalizeAiPrefs({ persona: '  ' + long + '  ' });
  strictEqual(r.persona.length, 40);
  strictEqual(r.persona, 'A'.repeat(40));
});

test('normalizeAiPrefs: valid style passthrough', () => {
  for (const s of ['santai', 'hangat', 'formal', 'profesional']) {
    strictEqual(normalizeAiPrefs({ style: s.toUpperCase() }).style, s);
  }
});

test('normalizeAiPrefs: members map keeps only complete overrides', () => {
  const r = normalizeAiPrefs({
    persona: 'Neuro', style: 'santai', maxSentences: 3,
    members: {
      u1: { persona: 'Istri', style: 'hangat', maxSentences: 5 },
      u2: { persona: 'Broken' },          // incomplete → dibuang
      u3: { style: 'formal', maxSentences: 2, persona: 'Anak' }, // lengkap
      '': { persona: 'X', style: 'formal', maxSentences: 2 },     // id kosong → dibuang
    },
  });
  deepEqual(Object.keys(r.members).sort(), ['u1', 'u3']);
  strictEqual(r.members.u1.persona, 'Istri');
  strictEqual(r.members.u3.maxSentences, 2);
});

test('resolveAiPrefsFor: tanpa override → base utuh', () => {
  const base = normalizeAiPrefs({ summaryItems: 4, persona: 'Neuro', style: 'formal', maxSentences: 3 });
  const out = resolveAiPrefsFor(base, 'nobody');
  deepEqual(out, base);
});

test('resolveAiPrefsFor: override menimpa persona/gaya/kalimat, global lainnya tetap', () => {
  const base = normalizeAiPrefs({ chatEnabled: false, summaryItems: 4, persona: 'Neuro', style: 'formal', maxSentences: 3, members: { u1: { persona: 'Istri', style: 'hangat', maxSentences: 5 } } });
  const out = resolveAiPrefsFor(base, 'u1');
  strictEqual(out.chatEnabled, false);
  strictEqual(out.summaryItems, 4);
  strictEqual(out.persona, 'Istri');
  strictEqual(out.style, 'hangat');
  strictEqual(out.maxSentences, 5);
});

test('resolveAiPrefsFor: userId null/empty → base', () => {
  const base = normalizeAiPrefs({ persona: 'Neuro', style: 'santai', maxSentences: 3 });
  deepEqual(resolveAiPrefsFor(base, null), base);
  deepEqual(resolveAiPrefsFor(base, ''), base);
});

test('resolveAiPrefsFor: menerima raw string', () => {
  const raw = JSON.stringify({ persona: 'Neuro', style: 'formal', maxSentences: 4, members: { x: { persona: 'Anak', style: 'hangat', maxSentences: 2 } } });
  const out = resolveAiPrefsFor(raw, 'x');
  strictEqual(out.persona, 'Anak');
  strictEqual(out.style, 'hangat');
  strictEqual(out.maxSentences, 2);
});
