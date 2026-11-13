-- Bayt Mustaqbal — migration 0024: tugas keluarga (sinkron grup).
-- Menggantikan penyimpanan localStorage agar konsisten antar-perangkat.
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  group_id TEXT,
  title TEXT NOT NULL,
  due_date TEXT,
  priority TEXT,
  assigned_to TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_group ON tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
