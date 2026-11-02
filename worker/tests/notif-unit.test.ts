/**
 * Unit Test — preferensi notifikasi (logika murni).
 * Run:
 *   npx tsx tests/notif-unit.test.ts
 */

import { DEFAULT_NOTIF_PREFS, isInQuietWindow } from '../src/utils/notif';

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

console.log('=== isInQuietWindow ===');
const normal = { ...DEFAULT_NOTIF_PREFS, quietStart: 22, quietEnd: 6 }; // 22.00–06.00
assert('22.00 termasuk senyap', isInQuietWindow(normal, 22) === true, isInQuietWindow(normal, 22));
assert('23.00 termasuk senyap', isInQuietWindow(normal, 23) === true, isInQuietWindow(normal, 23));
assert('05.00 termasuk senyap', isInQuietWindow(normal, 5) === true, isInQuietWindow(normal, 5));
assert('06.00 bukan senyap (batas akhir eksklusif)', isInQuietWindow(normal, 6) === false, isInQuietWindow(normal, 6));
assert('12.00 bukan senyap', isInQuietWindow(normal, 12) === false, isInQuietWindow(normal, 12));

const siang = { ...DEFAULT_NOTIF_PREFS, quietStart: 13, quietEnd: 15 };
assert('13.00–15.00: 14 termasuk', isInQuietWindow(siang, 14) === true, isInQuietWindow(siang, 14));
assert('13.00–15.00: 12 bukan', isInQuietWindow(siang, 12) === false, isInQuietWindow(siang, 12));

const off = { ...DEFAULT_NOTIF_PREFS, quietStart: null, quietEnd: null };
assert('nonaktif → selalu false', isInQuietWindow(off, 2) === false, isInQuietWindow(off, 2));

const zeroLen = { ...DEFAULT_NOTIF_PREFS, quietStart: 5, quietEnd: 5 };
assert('start == end → nonaktif', isInQuietWindow(zeroLen, 5) === false, isInQuietWindow(zeroLen, 5));

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
