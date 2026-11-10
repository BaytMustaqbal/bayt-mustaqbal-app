-- Perluas target tabungan: kategori + nominal tabungan bulanan.
ALTER TABLE goals ADD COLUMN category TEXT;
ALTER TABLE goals ADD COLUMN monthly REAL;

-- Riwayat penambahan/penarikan per target.
CREATE TABLE IF NOT EXISTS goal_transactions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'in',
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_goal_txn_goal ON goal_transactions(goal_id);
