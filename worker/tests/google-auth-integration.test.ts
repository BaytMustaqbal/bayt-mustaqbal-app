/**
 * Integration Test — Login Google (opsi tambahan).
 *
 * Prerequisite: start dev server dulu (port 8788)
 *   npx wrangler dev --local --port 8788
 *
 * Run:
 *   npx tsx tests/google-auth-integration.test.ts
 */

const BASE = 'http://127.0.0.1:8788';
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

// === LOGIN REDIRECT ===
console.log('\n=== GET /api/auth/google/login ===');
let res = await fetch(`${BASE}/api/auth/google/login?origin=http://localhost:3000`, { redirect: 'manual' });
let loc = res.headers.get('location') || '';
assert('login → 302', res.status === 302, res.status);
assert('login → arah ke accounts.google.com', loc.startsWith('https://accounts.google.com/o/oauth2/v2/auth'), loc.slice(0, 60));
assert('login → scope openid email profile', loc.includes('scope=openid+email+profile'), loc);
assert(
  'login → redirect_uri localhost:3000/api/auth/google/callback',
  loc.includes(encodeURIComponent('http://localhost:3000/api/auth/google/callback')),
  loc
);
assert('login → prompt=select_account', loc.includes('prompt=select_account'), loc);
assert('login → ada state', loc.includes('state='), loc);

// === CALLBACK (publik) ===
console.log('\n=== GET /api/auth/google/callback ===');
res = await fetch(`${BASE}/api/auth/google/callback`, { redirect: 'manual' });
loc = res.headers.get('location') || '';
assert('callback tanpa state → 302 error google', res.status === 302 && loc.includes('google=error'), `${res.status} ${loc}`);

res = await fetch(`${BASE}/api/auth/google/callback?state=abc.def.ghi`, { redirect: 'manual' });
loc = res.headers.get('location') || '';
assert('callback state sampah → state_invalid', loc.includes('reason=state_invalid'), loc);

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
