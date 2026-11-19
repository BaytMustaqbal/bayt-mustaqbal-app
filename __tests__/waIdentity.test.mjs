import { test } from 'node:test';
import { strictEqual } from 'node:assert';

import { findUserById, findUserByLid, saveIdentity } from '../wa-bot/src/db.js';

/** Stub D1: merekam SQL & argumen bind, lalu balas hasil yang ditentukan. */
function stubDb(result, { throws = false } = {}) {
  const calls = [];
  return {
    calls,
    db: {
      prepare(sql) {
        const call = { sql, args: [] };
        calls.push(call);
        return {
          bind(...args) {
            call.args = args;
            return {
              first: async () => {
                if (throws) throw new Error('boom');
                return result;
              },
              run: async () => {
                if (throws) throw new Error('boom');
                return { success: true };
              },
            };
          },
        };
      },
    },
  };
}

test('findUserByLid: tanpa binding atau lid kosong -> null', async () => {
  strictEqual(await findUserByLid({}, '123'), null);
  strictEqual(await findUserByLid(null, '123'), null);
  const { db } = stubDb({ lid: '123' });
  strictEqual(await findUserByLid({ WA_LOGS: db }, ''), null);
  strictEqual(await findUserByLid({ WA_LOGS: db }, null), null);
});

test('findUserByLid: query wa_identities dengan lid yang di-bind', async () => {
  const { db, calls } = stubDb({ lid: '5236336885925', user_id: 'u-hilda', name: 'Hilda' });
  const row = await findUserByLid({ WA_LOGS: db }, 5236336885925);
  strictEqual(row.user_id, 'u-hilda');
  strictEqual(calls.length, 1);
  strictEqual(/FROM wa_identities WHERE lid = \?/.test(calls[0].sql), true);
  strictEqual(calls[0].args[0], '5236336885925');
});

test('findUserByLid: error D1 ditelan -> null', async () => {
  const { db } = stubDb(null, { throws: true });
  strictEqual(await findUserByLid({ WA_LOGS: db }, '123'), null);
});

test('saveIdentity: tanpa binding, lid, atau user -> false', async () => {
  const { db, calls } = stubDb(null);
  strictEqual(await saveIdentity({}, '123', 'u1', 'Hilda'), false);
  strictEqual(await saveIdentity({ WA_LOGS: db }, '', 'u1', 'Hilda'), false);
  strictEqual(await saveIdentity({ WA_LOGS: db }, '123', '', 'Hilda'), false);
  strictEqual(calls.length, 0);
});

test('saveIdentity: upsert wa_identities dengan lid & user_id', async () => {
  const { db, calls } = stubDb(null);
  strictEqual(await saveIdentity({ WA_LOGS: db }, '5236336885925', 'u-hilda', 'Hilda'), true);
  strictEqual(calls.length, 1);
  strictEqual(/INSERT INTO wa_identities/.test(calls[0].sql), true);
  strictEqual(/ON CONFLICT\(lid\) DO UPDATE/.test(calls[0].sql), true);
  strictEqual(calls[0].args[0], '5236336885925');
  strictEqual(calls[0].args[1], 'u-hilda');
  strictEqual(calls[0].args[2], 'Hilda');
});

test('saveIdentity: nama kosong disimpan null', async () => {
  const { db, calls } = stubDb(null);
  await saveIdentity({ WA_LOGS: db }, '123', 'u1');
  strictEqual(calls[0].args[2], null);
});

test('saveIdentity: error D1 ditelan -> false', async () => {
  const { db } = stubDb(null, { throws: true });
  strictEqual(await saveIdentity({ WA_LOGS: db }, '123', 'u1', 'Hilda'), false);
});

test('findUserById: hanya user aktif (void IS NULL)', async () => {
  const { db, calls } = stubDb({ id: 'u-hilda', group_role: 'istri' });
  const row = await findUserById({ APP_DB: db }, 'u-hilda');
  strictEqual(row.group_role, 'istri');
  strictEqual(/FROM users WHERE id = \? AND void IS NULL/.test(calls[0].sql), true);
  strictEqual(calls[0].args[0], 'u-hilda');
});

test('findUserById: tanpa binding atau id kosong -> null', async () => {
  strictEqual(await findUserById({}, 'u1'), null);
  const { db } = stubDb({ id: 'u1' });
  strictEqual(await findUserById({ APP_DB: db }, ''), null);
});
