/**
 * Integration Test — Momen Keluarga (family_moments).
 *
 * Prerequisite: start dev server dulu (port 8788)
 *   npx wrangler dev --local --port 8788
 *
 * Run:
 *   npx tsx tests/moment-integration.test.ts
 */

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

async function login(): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: J,
    body: JSON.stringify({ username: 'kakang', password: 'test123' }),
  });
  const json = (await res.json()) as any;
  return json.data?.token ?? null;
}

token = await login();
assert('login kakang → token', !!token, 'no token');
if (!token) {
  console.log('Login gagal — pastikan user seed kakang/test123 ada di D1 lokal.');
  process.exit(1);
}

const H = () => ({ Authorization: `Bearer ${token}`, ...J });
const HA = () => ({ Authorization: `Bearer ${token}` });

// === LIST KOSONG ===
console.log('\n=== GET /api/moment ===');
let res = await fetch(`${BASE}/api/moment`);
assert('list tanpa token → 401', res.status === 401, res.status);
res = await fetch(`${BASE}/api/moment`, { headers: HA() });
let json = (await res.json()) as any;
assert('list → 200 + array', res.status === 200 && Array.isArray(json.data), res.status);

// === CREATE ===
console.log('\n=== POST /api/moment ===');
res = await fetch(`${BASE}/api/moment`, {
  method: 'POST',
  headers: H(),
  body: JSON.stringify({ title: 'Liburan ke Yogyakarta', date: '2026-11-15', category: 'wisata', location: 'Yogyakarta' }),
});
json = (await res.json()) as any;
const id = json.data?.id;
assert('create → 200 + id', res.status === 200 && !!id, res.status);
assert('create — title tersimpan', json.data?.title === 'Liburan ke Yogyakarta', json.data?.title);
assert('create — category valid', json.data?.category === 'wisata', json.data?.category);
assert('create — lokasi tersimpan', json.data?.location === 'Yogyakarta', json.data?.location);

// === VALIDASI ===
console.log('\n=== Validasi create ===');
res = await fetch(`${BASE}/api/moment`, { method: 'POST', headers: H(), body: JSON.stringify({ title: 'Tanpa tanggal' }) });
assert('create tanpa date → 400', res.status === 400, res.status);

// === UPDATE ===
console.log('\n=== PUT /api/moment/:id ===');
res = await fetch(`${BASE}/api/moment/${id}`, {
  method: 'PUT',
  headers: H(),
  body: JSON.stringify({ title: 'Liburan ke Yogyakarta (Prambanan)', date: '2026-11-16', category: 'wisata', location: 'Candi Prambanan' }),
});
json = (await res.json()) as any;
assert('update → 200 + rev naik', res.status === 200 && json.data?.rev >= 2, json.data?.rev);
assert('update — date baru', json.data?.date === '2026-11-16', json.data?.date);

// === DETAIL ===
console.log('\n=== GET /api/moment/:id ===');
res = await fetch(`${BASE}/api/moment/${id}`, { headers: HA() });
json = (await res.json()) as any;
assert('detail → 200', res.status === 200 && json.data?.id === id, res.status);

// === CATEGORY INVALID JATUH KE LAINNYA ===
console.log('\n=== Category fallback ===');
res = await fetch(`${BASE}/api/moment`, {
  method: 'POST',
  headers: H(),
  body: JSON.stringify({ title: 'Momen Acak', date: '2026-11-20', category: 'ntah' }),
});
json = (await res.json()) as any;
assert('category tidak dikenal → lainnya', json.data?.category === 'lainnya', json.data?.category);

// === DELETE ===
console.log('\n=== DELETE /api/moment/:id ===');
res = await fetch(`${BASE}/api/moment/${id}`, { method: 'DELETE', headers: HA() });
json = (await res.json()) as any;
assert('delete → 200', res.status === 200 && json.data?.void, res.status);
res = await fetch(`${BASE}/api/moment/${id}`, { headers: HA() });
assert('delete → detail 404', res.status === 404, res.status);

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
