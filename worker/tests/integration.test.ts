/**
 * Integration Test for Bayt Mustaqbal Backend API
 *
 * Prerequisite: Start dev server first
 *   npm run dev  (starts on port 8788)
 *
 * Run:
 *   npx tsx tests/integration.test.ts
 *   # or
 *   npm run test:integration
 *
 * Tests all endpoints: auth, CRUD modules, read-only modules, cron trigger.
 */

const BASE = 'http://127.0.0.1:8788';
let token: string | null = null;
let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, actual: any) {
  if (condition) {
    passCount++;
    console.log(`  \u2713 ${name}`);
  } else {
    failCount++;
    failures.push(`${name} — got ${typeof actual === 'string' ? actual : JSON.stringify(actual)}`);
    console.log(`  \u2717 ${name} — got ${typeof actual === 'string' ? actual : JSON.stringify(actual)}`);
  }
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'kakang', password: 'test123' }),
  });
  const json = await res.json() as any;
  return json.data?.token;
}

const H = () => ({ Authorization: `Bearer ${token}` });
const J = { 'Content-Type': 'application/json' };

async function testCRUD(mod: string, create: any, update: any) {
  console.log(`\n--- ${mod} ---`);
  let id: string | null = null;

  // POST create
  let res = await fetch(`${BASE}/api/${mod}`, { method: 'POST', headers: { ...H(), ...J }, body: JSON.stringify(create) });
  let json = await res.json() as any;
  id = json.data?.id;
  assert(`POST /api/${mod} → 200`, res.status === 200 && json.ok, res.status);
  assert(`POST /api/${mod} — has id`, !!id, 'no id');
  assert(`POST /api/${mod} — rev=1`, json.data?.rev === 1, json.data?.rev);

  // GET list
  res = await fetch(`${BASE}/api/${mod}`, { headers: H() });
  json = await res.json() as any;
  assert(`GET /api/${mod} → 200`, res.status === 200 && json.ok, res.status);
  assert(`GET /api/${mod} — array`, Array.isArray(json.data), typeof json.data);

  // GET detail
  res = await fetch(`${BASE}/api/${mod}/${id}`, { headers: H() });
  json = await res.json() as any;
  assert(`GET /api/${mod}/:id → 200`, res.status === 200 && json.ok, res.status);

  // PUT update
  res = await fetch(`${BASE}/api/${mod}/${id}`, { method: 'PUT', headers: { ...H(), ...J }, body: JSON.stringify(update) });
  json = await res.json() as any;
  assert(`PUT /api/${mod}/:id → 200`, res.status === 200 && json.ok, res.status);
  assert(`PUT /api/${mod}/:id — rev>1`, json.data?.rev >= 2, json.data?.rev);

  // DELETE soft-delete
  res = await fetch(`${BASE}/api/${mod}/${id}`, { method: 'DELETE', headers: H() });
  assert(`DELETE /api/${mod}/:id → 200`, res.status === 200, res.status);

  // GET deleted → 404
  res = await fetch(`${BASE}/api/${mod}/${id}`, { headers: H() });
  assert(`GET deleted → 404`, res.status === 404, res.status);

  // GET nonexistent → 404
  res = await fetch(`${BASE}/api/${mod}/nonexistent`, { headers: H() });
  assert(`GET nonexistent → 404`, res.status === 404, res.status);

  // POST empty body → 400
  res = await fetch(`${BASE}/api/${mod}`, { method: 'POST', headers: { ...H(), ...J }, body: JSON.stringify({}) });
  assert(`POST empty → 400`, res.status === 400, res.status);
}

// === AUTH ===
console.log('=== AUTH ===');

// Register
let res = await fetch(`${BASE}/api/auth/register`, {
  method: 'POST',
  headers: J,
  body: JSON.stringify({ username: 'istri_test', password: 'test123', nama: 'Istri Test' }),
});
let json = await res.json() as any;
assert('POST /api/auth/register → 200', res.status === 200 && json.ok, res.status);

// Duplicate register
res = await fetch(`${BASE}/api/auth/register`, {
  method: 'POST',
  headers: J,
  body: JSON.stringify({ username: 'istri_test', password: 'test123', nama: 'Istri Test' }),
});
assert('POST register duplicate → 409', res.status === 409, res.status);

// Login
res = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: J,
  body: JSON.stringify({ username: 'istri_test', password: 'test123' }),
});
json = await res.json() as any;
token = json.data?.token;
assert('POST /api/auth/login → 200', res.status === 200 && !!token, res.status);

// Me (valid)
res = await fetch(`${BASE}/api/auth/me`, { headers: H() });
json = await res.json() as any;
assert('GET /api/auth/me → 200', res.status === 200 && json.ok, res.status);
assert('Me — username', json.data?.username === 'istri_test', json.data?.username);

// Me (no token)
res = await fetch(`${BASE}/api/auth/me`);
assert('GET /api/auth/me no token → 401', res.status === 401, res.status);

// Me (invalid token)
res = await fetch(`${BASE}/api/auth/me`, { headers: { Authorization: 'Bearer invalid' } });
assert('GET /api/auth/me invalid token → 401', res.status === 401, res.status);

// Logout
res = await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: H() });
assert('POST /api/auth/logout → 200', res.status === 200, res.status);

// Re-login for CRUD tests
token = await login();
assert('Re-login for CRUD', !!token, 'no token');

// === CRUD MODULES ===
console.log('\n=== CRUD MODULES ===');

// Task 4 modules
await testCRUD('txn',
  { amount: 50000, type: 'out', date: '2026-10-19' },
  { amount: 75000, type: 'out', date: '2026-10-19' });

await testCRUD('bill',
  { name: 'TestBill', amount: 250000, due_date: '2026-10-25' },
  { name: 'UpdatedBill', amount: 300000, due_date: '2026-10-26', status: 'paid', paid_at: '2026-10-20T00:00:00Z' });

await testCRUD('categories',
  { name: 'TestCat', type: 'keuangan' },
  { name: 'UpdatedCat', type: 'keuangan' });

// Settings — special: has CONFLICT test
console.log('\n--- settings ---');
res = await fetch(`${BASE}/api/settings`, { method: 'POST', headers: { ...H(), ...J }, body: JSON.stringify({ key: 'test_key', value: '{"v":1}' }) });
json = await res.json() as any;
const setKey = json.data?.id;
assert('POST /api/settings → 200', res.status === 200 && json.ok, res.status);

res = await fetch(`${BASE}/api/settings`, { method: 'POST', headers: { ...H(), ...J }, body: JSON.stringify({ key: 'test_key', value: '{"v":2}' }) });
assert('POST /api/settings duplicate → 409', res.status === 409, res.status);

// Settings CRUD
res = await fetch(`${BASE}/api/settings`, { headers: H() });
json = await res.json() as any;
assert('GET /api/settings → 200', res.status === 200, res.status);

res = await fetch(`${BASE}/api/settings/${setKey}`, { method: 'PUT', headers: { ...H(), ...J }, body: JSON.stringify({ key: 'test_key_upd', value: '{"v":3}' }) });
json = await res.json() as any;
assert('PUT /api/settings/:id → 200', res.status === 200 && json.ok, res.status);
assert('PUT settings — rev>1', json.data?.rev >= 2, json.data?.rev);

res = await fetch(`${BASE}/api/settings/${setKey}`, { method: 'DELETE', headers: H() });
assert('DELETE /api/settings/:id → 200', res.status === 200, res.status);

// Task 5 modules
await testCRUD('rec',
  { name: 'TestRec', amount: 100000, frequency: 'monthly', start_date: '2026-10-19' },
  { name: 'UpdatedRec', amount: 200000, frequency: 'monthly', start_date: '2026-10-19' });

await testCRUD('att',
  { date: '2026-10-19', status: 'present', note: 'Test' },
  { date: '2026-10-19', status: 'late', note: 'Updated' });

await testCRUD('cal',
  { title: 'Event', date: '2026-10-19', time: '10:00', category: 'work' },
  { title: 'Updated', date: '2026-10-19', time: '11:00', category: 'work' });

await testCRUD('note',
  { title: 'Note', content: 'Hello', category: 'personal', important: 1 },
  { title: 'Updated', content: 'World', category: 'personal', important: 0 });

// svc — includes log sub-routes
await testCRUD('svc',
  { name: 'Asset', type: 'motor', purchase_date: '2026-01-01' },
  { name: 'UpdatedAsset', type: 'motor', purchase_date: '2026-01-01' });

// svc log sub-route
console.log('\n--- svc log ---');
const svcCreateRes = await fetch(`${BASE}/api/svc`, { method: 'POST', headers: { ...H(), ...J }, body: JSON.stringify({ name: 'LogAsset', type: 'motor' }) });
const svcCreateJson = await svcCreateRes.json() as any;
const assetId = svcCreateJson.data?.id;

if (assetId) {
  const logRes = await fetch(`${BASE}/api/svc/${assetId}/log`, { method: 'POST', headers: { ...H(), ...J }, body: JSON.stringify({ date: '2026-10-19', description: 'Service', cost: 50000 }) });
  assert('POST /api/svc/:id/log → 200', logRes.status === 200, logRes.status);

  const logListRes = await fetch(`${BASE}/api/svc/${assetId}/log`, { headers: H() });
  const logListJson = await logListRes.json() as any;
  assert('GET /api/svc/:id/log → 200', logListRes.status === 200 && logListJson.ok, logListRes.status);
  assert('GET /api/svc/:id/log — array', Array.isArray(logListJson.data), typeof logListJson.data);
}

// === READ-ONLY MODULES ===
console.log('\n=== READ-ONLY MODULES ===');

res = await fetch(`${BASE}/api/review`, { headers: H() });
json = await res.json() as any;
assert('GET /api/review → 200', res.status === 200 && json.ok, res.status);
assert('review — has summary', !!json.data?.summary, 'no summary');
assert('review — has total_income', typeof json.data?.summary?.total_income === 'number', typeof json.data?.summary);

res = await fetch(`${BASE}/api/review?start=2026-10-01&end=2026-10-31`, { headers: H() });
assert('GET /api/review?start=&end= → 200', res.status === 200, res.status);

res = await fetch(`${BASE}/api/dash`, { headers: H() });
json = await res.json() as any;
assert('GET /api/dash → 200', res.status === 200 && json.ok, res.status);
assert('dash — total_balance', typeof json.data?.total_balance === 'number', typeof json.data?.total_balance);
assert('dash — recent_transactions', Array.isArray(json.data?.recent_transactions), typeof json.data?.recent_transactions);
assert('dash — upcoming_bills', Array.isArray(json.data?.upcoming_bills), typeof json.data?.upcoming_bills);
assert('dash — upcoming_events', Array.isArray(json.data?.upcoming_events), typeof json.data?.upcoming_events);

res = await fetch(`${BASE}/api/dash/accounts`, { headers: H() });
assert('GET /api/dash/accounts → 200', res.status === 200, res.status);

res = await fetch(`${BASE}/api/dash/invalid`, { headers: H() });
assert('GET /api/dash/invalid → 400', res.status === 400, res.status);

res = await fetch(`${BASE}/api/audit`, { headers: H() });
json = await res.json() as any;
assert('GET /api/audit → 200', res.status === 200, res.status);
assert('audit — array', Array.isArray(json.data), typeof json.data);

// === CRON ===
console.log('\n=== CRON ===');
res = await fetch(`${BASE}/cdn-cgi/local/explorer/api/local/scheduled?worker=api-bayt-mustaqbal`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cron: '0 * * * *' }),
});
json = await res.json() as any;
assert('POST /scheduled → 200', res.status === 200, res.status);
assert('Cron outcome=ok', json.result?.outcome === 'ok', json.result?.outcome);

// === UNAUTHENTICATED ===
console.log('\n=== UNAUTHENTICATED ===');
res = await fetch(`${BASE}/api/txn`);
assert('GET /api/txn no token → 401', res.status === 401, res.status);

res = await fetch(`${BASE}/api/txn`, { headers: { Authorization: 'Bearer invalid' } });
assert('GET /api/txn invalid token → 401', res.status === 401, res.status);

// === SUMMARY ===
console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount} / ${passCount + failCount}`);
console.log(`Failed: ${failCount}`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f}`));
} else {
  console.log('ALL TESTS PASSED');
}
