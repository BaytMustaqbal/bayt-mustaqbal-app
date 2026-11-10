-- Langganan & utilitas: listrik, air, internet, streaming, asuransi, dll.
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'lainnya',
  amount REAL NOT NULL DEFAULT 0,
  billing_day INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_group ON subscriptions(group_id, void);
