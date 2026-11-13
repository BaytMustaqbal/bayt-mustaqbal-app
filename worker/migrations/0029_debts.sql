-- Bayt Mustaqbal — migration 0029: utang-piutang antar anggota keluarga.
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT,
  title TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  lender_id TEXT,
  borrower_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  settled_at TEXT,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_debts_group ON debts(group_id, status);
