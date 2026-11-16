-- Bayt Mustaqbal - migration 0038: transaksi berulang berbasis pemakaian.
--
-- Beda dengan scheduled_tasks (tanggal pasti sejak awal), transaksi berulang
-- punya tanggal yang lahir dari kejadian: token listrik habis, gas LPG habis.
-- Template menyimpan keyword untuk mencocokkan transaksi, interval hasil
-- hitung dari 3 pembelian terakhir, dan next_due sebagai perkiraan habis.

CREATE TABLE IF NOT EXISTS recurring_txns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT,
  nama TEXT NOT NULL,
  keyword TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  category_id TEXT,
  account_id TEXT,
  interval_days INTEGER,
  last_date TEXT,
  next_due TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_recurring_group ON recurring_txns(group_id, void);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_txns(user_id, void);
CREATE INDEX IF NOT EXISTS idx_recurring_due ON recurring_txns(next_due, active);
