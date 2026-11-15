CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount INTEGER NOT NULL,
  note TEXT,
  category TEXT,
  occurred_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  void INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expenses_monthly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ym TEXT NOT NULL UNIQUE,
  total INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(occurred_date);