/**
 * Integration Test — Google Calendar sync endpoints + field kategori di bills.
 *
 * Prerequisite: start dev server dulu (port 8788)
 *   npx wrangler dev --local --port 8788
 *
 * Run:
 *   npx tsx tests/gcal-integration.test.ts
 *
 * Catatan: test ini TIDAK memanggil Google sungguhan (tidak ada koneksi di dev),
 * jadi alur OAuth yang butuh browser + kredensial diuji lewat redirect-nya saja.
 */

import jwt from 'jsonwebtoken';

const BASE = 'http://127.0.0.1:8788';
let token: string | null = null;
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

const J = { 'Content-Type': 'application/json' };
const H = () => ({ Authorization: `Bearer ${token}`, ...J });

async function login(): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: J,
    body: JSON.stringify({ username: 'kakang', password: 'test123' }),
  });
  const json = (await res.json()) as any;
  return json.data?.token ?? null;
}

/** Ambil payload JWT dari query param `state` sebuah URL consent Google. */
function decodeState(url: string): any | null {
  try {
    const state = new URL(url).searchParams.get('state');
    if (!state) return null;
    return JSON.parse(Buffer.from(state.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

token = await login();
assert('login kakang → token', !!token, 'no token');
if (!token) {
  console.log('Login gagal — pastikan user seed kakang/test123 ada di D1 lokal.');
  process.exit(1);
}

// === STATUS ===
console.log('\n=== GET /api/gcal/status ===');
let res = await fetch(`${BASE}/api/gcal/status`);
assert('status tanpa token → 401', res.status === 401, res.status);

res = await fetch(`${BASE}/api/gcal/status`, { headers: { Authorization: `Bearer ${token}` } });
let json = (await res.json()) as any;
assert('status → 200', res.status === 200 && json.ok, res.status);
assert('status belum connect → connected=false', json.data?.connected === false, JSON.stringify(json.data));
assert('status punya field email', 'email' in (json.data || {}), JSON.stringify(json.data));

// === LOGIN ===
console.log('\n=== GET /api/gcal/login ===');
res = await fetch(`${BASE}/api/gcal/status`, { headers: { Authorization: `Bearer invalid` } });
assert('token invalid → 401', res.status === 401, res.status);

res = await fetch(`${BASE}/api/gcal/login?origin=http://localhost:3000`, {
  headers: { Authorization: `Bearer ${token}` },
});
json = (await res.json()) as any;
const configured = res.status === 200 && !!json.data?.url;
assert(
  'login → 200+url (sudah set secret) ATAU 503 GCAL_NOT_CONFIGURED (belum)',
  configured || (res.status === 503 && json.error?.code === 'GCAL_NOT_CONFIGURED'),
  `${res.status} ${JSON.stringify(json.error || json.data || {}).slice(0, 120)}`
);

if (configured) {
  const url = json.data.url as string;
  const parsed = new URL(url);
  assert('login → arah ke accounts.google.com', parsed.hostname === 'accounts.google.com', url.slice(0, 60));
  assert(
    'login → redirect_uri localhost (dev)',
    parsed.searchParams.get('redirect_uri') === 'http://localhost:3000/api/gcal/callback',
    parsed.searchParams.get('redirect_uri')
  );
  const state = decodeState(url);
  assert('login → state origin = origin yang diminta', state?.origin === 'http://localhost:3000', JSON.stringify(state));
  assert('login → state kind = gcal', state?.kind === 'gcal', JSON.stringify(state));

  // Origin asing harus jatuh ke default (allowlist)
  res = await fetch(`${BASE}/api/gcal/login?origin=https://evil.example.com`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  json = (await res.json()) as any;
  const evilState = json.data?.url ? decodeState(json.data.url) : null;
  assert(
    'login origin asing → state pakai origin default (bukan evil)',
    evilState?.origin === 'https://app.baytmustaqbal.my.id',
    JSON.stringify(evilState)
  );
}

// === CALLBACK (publik, diverifikasi lewat state) ===
console.log('\n=== GET /api/gcal/callback ===');
res = await fetch(`${BASE}/api/gcal/callback`, { redirect: 'manual' });
assert('callback tanpa state → 302', res.status === 302, res.status);
assert(
  'callback tanpa state → redirect bawa gcal=error',
  (res.headers.get('location') || '').includes('gcal=error'),
  res.headers.get('location')
);

res = await fetch(`${BASE}/api/gcal/callback?state=abc.def.ghi`, { redirect: 'manual' });
assert('callback state sampah → 302 error', res.status === 302, res.status);
assert(
  'callback state sampah → reason=state_invalid',
  (res.headers.get('location') || '').includes('reason=state_invalid'),
  res.headers.get('location')
);

// Google membatalkan consent: bawa state VALID + error=access_denied.
const devState = jwt.sign(
  { kind: 'gcal', userId: 'u-test', origin: 'https://app.baytmustaqbal.my.id' },
  'dev-jwt-secret-key-do-not-use-in-production',
  { expiresIn: '5m' }
);
res = await fetch(
  `${BASE}/api/gcal/callback?state=${encodeURIComponent(devState)}&error=access_denied`,
  { redirect: 'manual' }
);
const loc = res.headers.get('location') || '';
assert('callback Google error → reason = error Google', loc.includes('reason=access_denied'), loc);
assert('callback Google error → balik ke origin app (bukan origin asing)', loc.startsWith('https://app.baytmustaqbal.my.id/'), loc);

// === DISCONNECT ===
console.log('\n=== POST /api/gcal/disconnect ===');
res = await fetch(`${BASE}/api/gcal/disconnect`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
json = (await res.json()) as any;
assert('disconnect tanpa koneksi → 200 connected=false', res.status === 200 && json.data?.connected === false, res.status);

res = await fetch(`${BASE}/api/gcal/disconnect`, { method: 'POST' });
assert('disconnect tanpa token → 401', res.status === 401, res.status);

// === BILLS + kategori (migrasi tagihan) ===
console.log('\n=== POST/PUT /api/bill dengan kategori ===');
res = await fetch(`${BASE}/api/bill`, {
  method: 'POST',
  headers: H(),
  body: JSON.stringify({
    name: 'Internet Indihome',
    amount: 350000,
    due_date: '2026-11-10',
    kategori: 'utilitas',
    status: 'paid',
    paid_at: '2026-11-01',
    paid_amount: 350000,
    last_notified: '2026-11-03',
  }),
});
json = (await res.json()) as any;
const billId = json.data?.id;
assert('POST /api/bill → 200 + id', res.status === 200 && !!billId, res.status);
assert('POST /api/bill — kategori tersimpan', json.data?.kategori === 'utilitas', json.data?.kategori);
assert('POST /api/bill — status paid diterima', json.data?.status === 'paid', json.data?.status);
assert('POST /api/bill — paid_at diterima', json.data?.paid_at === '2026-11-01', json.data?.paid_at);
assert('POST /api/bill — paid_amount diterima', json.data?.paid_amount === 350000, json.data?.paid_amount);
assert('POST /api/bill — last_notified diterima', json.data?.last_notified === '2026-11-03', json.data?.last_notified);

res = await fetch(`${BASE}/api/bill/${billId}`, {
  method: 'PUT',
  headers: H(),
  body: JSON.stringify({ name: 'Internet Indihome', amount: 360000, due_date: '2026-12-10', kategori: 'utilitas', status: 'unpaid' }),
});
json = (await res.json()) as any;
assert('PUT /api/bill → 200', res.status === 200 && json.ok, res.status);
assert('PUT /api/bill — rev naik', json.data?.rev >= 2, json.data?.rev);
assert('PUT /api/bill — amount baru', json.data?.amount === 360000, json.data?.amount);

res = await fetch(`${BASE}/api/bill`, { headers: { Authorization: `Bearer ${token}` } });
json = (await res.json()) as any;
const listed = (json.data || []).find((b: any) => b.id === billId);
assert('GET /api/bill — list bawa kategori', listed?.kategori === 'utilitas', JSON.stringify(listed).slice(0, 120));

res = await fetch(`${BASE}/api/bill/${billId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
assert('DELETE /api/bill → 200', res.status === 200, res.status);

// === CAL tetap jalan dengan hook sync (tanpa koneksi → tanpa efek samping) ===
console.log('\n=== POST/PUT/DELETE /api/cal (hook sinkron) ===');
res = await fetch(`${BASE}/api/cal`, {
  method: 'POST',
  headers: H(),
  body: JSON.stringify({ title: 'Agenda Tes GCal', date: '2026-11-05', time: '19:30', category: 'agenda' }),
});
json = (await res.json()) as any;
const calId = json.data?.id;
assert('POST /api/cal → 200 + id', res.status === 200 && !!calId, res.status);

res = await fetch(`${BASE}/api/cal/${calId}`, {
  method: 'PUT',
  headers: H(),
  body: JSON.stringify({ title: 'Agenda Tes GCal (ubah)', date: '2026-11-06', time: '20:00' }),
});
json = (await res.json()) as any;
assert('PUT /api/cal → 200 rev naik', res.status === 200 && json.data?.rev >= 2, res.status);

res = await fetch(`${BASE}/api/cal/${calId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
assert('DELETE /api/cal → 200', res.status === 200, res.status);

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
