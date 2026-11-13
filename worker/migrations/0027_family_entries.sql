-- Bayt Mustaqbal — migration 0027: entri keluarga (medis/dokumen/kontak) sinkron grup.
CREATE TABLE IF NOT EXISTS family_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  group_id TEXT,
  bagian TEXT NOT NULL,
  title TEXT NOT NULL,
  meta TEXT,
  badge TEXT,
  tone TEXT,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_family_entries_group ON family_entries(group_id, bagian);
