-- Bayt Mustaqbal — migration 0014: target tabungan (goals) sinkron grup.
-- Menggantikan penyimpanan localStorage agar konsisten antar-perangkat, seperti
-- fitur data bersama lain.

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  group_id TEXT,
  nama TEXT NOT NULL,
  target_amount INTEGER NOT NULL DEFAULT 0,
  current_amount INTEGER NOT NULL DEFAULT 0,
  target_date TEXT,
  achieved INTEGER NOT NULL DEFAULT 0,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_goals_group ON goals(group_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
