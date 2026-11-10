-- Inventory sparepart service motor (sebelumnya localStorage).
CREATE TABLE IF NOT EXISTS service_inventory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT,
  nama TEXT NOT NULL,
  jenis TEXT,
  interval_type TEXT NOT NULL DEFAULT 'km',
  interval_value REAL NOT NULL DEFAULT 3000,
  last_service_km REAL NOT NULL DEFAULT 0,
  last_service_date TEXT,
  next_due TEXT,
  notes TEXT,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_svc_inv_group ON service_inventory(group_id, void);
