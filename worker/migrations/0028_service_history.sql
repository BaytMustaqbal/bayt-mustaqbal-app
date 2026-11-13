-- Bayt Mustaqbal — migration 0028: riwayat service kendaraan (sinkron grup).
CREATE TABLE IF NOT EXISTS service_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT,
  tanggal TEXT NOT NULL,
  odometer REAL NOT NULL DEFAULT 0,
  items TEXT,
  total REAL NOT NULL DEFAULT 0,
  technician TEXT,
  notes TEXT,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_svc_history_group ON service_history(group_id, void);
