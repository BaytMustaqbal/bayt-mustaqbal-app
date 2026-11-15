-- Bayt Mustaqbal — migration 0034: dompet/rekening anggota.
-- Tabel accounts lama (0001) kosong; kolom di-rename & dilengkapi.
-- transactions.account_id sudah ada sejak 0001; tambah index saja.
ALTER TABLE accounts RENAME COLUMN name TO nama;
ALTER TABLE accounts RENAME COLUMN balance TO saldo;
ALTER TABLE accounts DROP COLUMN type;
ALTER TABLE accounts ADD COLUMN bank TEXT;
ALTER TABLE accounts ADD COLUMN no_rek TEXT;
ALTER TABLE accounts ADD COLUMN group_id TEXT;

CREATE INDEX IF NOT EXISTS idx_accounts_group ON accounts(group_id, void);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id, void);
CREATE INDEX IF NOT EXISTS idx_txn_account ON transactions(account_id);
