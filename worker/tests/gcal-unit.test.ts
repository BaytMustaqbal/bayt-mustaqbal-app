/**
 * Unit Test Google Calendar sync (logika murni, TANPA server & TANPA panggil Google).
 *
 * Run:
 *   npx tsx tests/gcal-unit.test.ts
 *   # or
 *   npm run test:unit
 */

import jwt from 'jsonwebtoken';
import {
  buildEventPayload,
  nextDay,
  buildConsentUrl,
  signGcalState,
  verifyGcalState,
  resolveRedirectUri,
  APP_ORIGINS,
} from '../src/utils/gcal';

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, actual: unknown) {
  if (condition) {
    passCount++;
    console.log(`  \u2713 ${name}`);
  } else {
    failCount++;
    failures.push(`${name} — got ${typeof actual === 'string' ? actual : JSON.stringify(actual)}`);
    console.log(`  \u2717 ${name} — got ${typeof actual === 'string' ? actual : JSON.stringify(actual)}`);
  }
}

const SECRET = 'unit-test-secret';

// === nextDay ===
console.log('=== nextDay ===');
assert('nextDay 2026-10-27 → 2026-10-28', nextDay('2026-10-27') === '2026-10-28', nextDay('2026-10-27'));
assert('nextDay 2026-10-31 → 2026-11-01', nextDay('2026-10-31') === '2026-11-01', nextDay('2026-10-31'));
assert('nextDay 2026-12-31 → 2027-01-01', nextDay('2026-12-31') === '2027-01-01', nextDay('2026-12-31'));

// === buildEventPayload: agenda (cal) ===
console.log('\n=== buildEventPayload / cal ===');

const calWithTime = buildEventPayload('cal', {
  id: 'c1',
  title: 'Rapat RW',
  date: '2026-11-05',
  time: '19:30',
  category: 'agenda',
  description: 'Balai warga',
});
assert('cal + jam → start pakai dateTime', !!calWithTime.start?.dateTime, JSON.stringify(calWithTime.start));
assert('cal + jam → start 19:30 WIB', calWithTime.start?.dateTime === '2026-11-05T19:30:00', calWithTime.start?.dateTime);
assert('cal + jam → timeZone Asia/Jakarta', calWithTime.start?.timeZone === 'Asia/Jakarta', calWithTime.start?.timeZone);
assert('cal + jam → end +1 jam', calWithTime.end?.dateTime === '2026-11-05T20:30:00', calWithTime.end?.dateTime);
assert('cal + jam → summary = title', calWithTime.summary === 'Rapat RW', calWithTime.summary);
assert('cal + jam → description berisi deskripsi', (calWithTime.description || '').includes('Balai warga'), calWithTime.description);

const calAllDay = buildEventPayload('cal', {
  id: 'c2',
  title: 'Ulang tahun Ayah',
  date: '2026-11-05',
  time: null,
  category: 'agenda',
  description: null,
});
assert('cal tanpa jam → all-day start pakai date', calAllDay.start?.date === '2026-11-05', JSON.stringify(calAllDay.start));
assert('cal tanpa jam → end = hari berikutnya', calAllDay.end?.date === '2026-11-06', JSON.stringify(calAllDay.end));
assert('cal tanpa jam → tanpa dateTime', !calAllDay.start?.dateTime, JSON.stringify(calAllDay.start));

// === buildEventPayload: tagihan (bill) ===
console.log('\n=== buildEventPayload / bill ===');

const billUnpaid = buildEventPayload('bill', {
  id: 'b1',
  name: 'Internet Indihome',
  amount: 350000,
  due_date: '2026-11-10',
  kategori: 'utilitas',
  status: 'unpaid',
  paid_at: null,
});
assert('bill → all-day pada due_date', billUnpaid.start?.date === '2026-11-10', JSON.stringify(billUnpaid.start));
assert('bill → summary = nama', billUnpaid.summary === 'Internet Indihome', billUnpaid.summary);
assert('bill → description berisi nominal', (billUnpaid.description || '').includes('350.000'), billUnpaid.description);
assert('bill → description berisi kategori', (billUnpaid.description || '').includes('utilitas'), billUnpaid.description);
assert('bill unpaid → tanpa tanda lunas', !(billUnpaid.summary || '').includes('LUNAS'), billUnpaid.summary);

const billPaid = buildEventPayload('bill', {
  id: 'b2',
  name: 'Listrik PLN',
  amount: 200000,
  due_date: '2026-11-03',
  kategori: 'utilitas',
  status: 'paid',
  paid_at: '2026-11-01',
});
assert('bill paid → summary ditandai LUNAS', (billPaid.summary || '').includes('LUNAS'), billPaid.summary);

// === buildConsentUrl ===
console.log('\n=== buildConsentUrl ===');

const consent = buildConsentUrl(
  { GOOGLE_CLIENT_ID: 'cid-123', GOOGLE_CLIENT_SECRET: 'sec' } as any,
  'https://app.baytmustaqbal.my.id',
  'signed-state-token'
);
assert('consent → arah ke accounts.google.com', consent.startsWith('https://accounts.google.com/o/oauth2/v2/auth'), consent.slice(0, 60));
assert('consent → berisi client_id', consent.includes('client_id=cid-123'), consent);
assert('consent → redirect_uri ter-encode', consent.includes(encodeURIComponent('https://api.baytmustaqbal.my.id/api/gcal/callback')), consent);
assert('consent → scope calendar.events', consent.includes(encodeURIComponent('https://www.googleapis.com/auth/calendar.events')), consent);
assert('consent → access_type=offline', consent.includes('access_type=offline'), consent);
assert('consent → prompt=consent (refresh token pasti dikasih)', consent.includes('prompt=consent'), consent);
assert('consent → state ikut', consent.includes('state=signed-state-token'), consent);

const consentDev = buildConsentUrl(
  { GOOGLE_CLIENT_ID: 'cid-123', GOOGLE_CLIENT_SECRET: 'sec' } as any,
  'http://localhost:3000',
  'st'
);
assert(
  'consent dev → redirect_uri localhost:3000 (Vite dev, proxy /api)',
  consentDev.includes(encodeURIComponent('http://localhost:3000/api/gcal/callback')),
  consentDev
);

assert(
  'buildConsentUrl tanpa client_id → lempar',
  (() => { try { buildConsentUrl({} as any, 'https://app.baytmustaqbal.my.id', 'st'); return false; } catch { return true; } })(),
  'no throw'
);

// === signGcalState / verifyGcalState ===
console.log('\n=== gcalState ===');

const state = signGcalState(SECRET, { userId: 'u1', origin: 'https://app.baytmustaqbal.my.id' });
const decoded = verifyGcalState(SECRET, state);
assert('state valid → userId cocok', decoded?.userId === 'u1', JSON.stringify(decoded));
assert('state valid → origin cocok', decoded?.origin === 'https://app.baytmustaqbal.my.id', JSON.stringify(decoded));
assert('state kind = gcal', decoded?.kind === 'gcal', JSON.stringify(decoded));
assert('state tampered → null', verifyGcalState(SECRET, state + 'x') === null, 'tampered');
assert('state secret salah → null', verifyGcalState('other-secret', state) === null, 'wrong secret');
assert('state sampah → null', verifyGcalState(SECRET, 'bukan-jwt') === null, 'garbage');

const expired = jwt.sign({ kind: 'gcal', userId: 'u1', origin: 'https://app.baytmustaqbal.my.id' }, SECRET, { expiresIn: '-1s' });
assert('state kedaluwarsa → null', verifyGcalState(SECRET, expired) === null, 'expired');
assert('state kind salah → null', verifyGcalState(SECRET, jwt.sign({ kind: 'lain', userId: 'u1', origin: 'x' }, SECRET)) === null, 'wrong kind');

// === resolveRedirectUri / origin allowlist ===
console.log('\n=== origin allowlist ===');

assert('origin app production diizinkan', APP_ORIGINS.includes('https://app.baytmustaqbal.my.id'), 'app prod');
assert('origin localhost dev diizinkan', APP_ORIGINS.includes('http://localhost:5173'), 'localhost');
assert('origin asing TIDAK diizinkan', !APP_ORIGINS.includes('https://evil.example.com'), 'evil');
assert(
  'resolveRedirectUri localhost → pakai origin sendiri',
  resolveRedirectUri('http://localhost:5173') === 'http://localhost:5173/api/gcal/callback',
  resolveRedirectUri('http://localhost:5173')
);
assert(
  'resolveRedirectUri production → pakai domain API',
  resolveRedirectUri('https://app.baytmustaqbal.my.id') === 'https://api.baytmustaqbal.my.id/api/gcal/callback',
  resolveRedirectUri('https://app.baytmustaqbal.my.id')
);

// === SUMMARY ===
console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount} / ${passCount + failCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) {
  console.log('Failures:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}
