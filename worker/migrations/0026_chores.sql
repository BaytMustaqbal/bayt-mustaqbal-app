-- Bayt Mustaqbal — migration 0026: tugas rumah tangga bersama (chores).
CREATE TABLE IF NOT EXISTS chores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  group_id TEXT,
  title TEXT NOT NULL,
  assignee_id TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TEXT,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_chores_group_status ON chores(group_id, status);
