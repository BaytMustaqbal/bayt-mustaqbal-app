-- Bayt Mustaqbal — migration 0030: data kendaraan + kaitkan service ke kendaraan.
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT,
  nama TEXT NOT NULL,
  jenis TEXT,
  merek TEXT,
  plat TEXT,
  odometer REAL NOT NULL DEFAULT 0,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_vehicles_group ON vehicles(group_id, void);

ALTER TABLE service_inventory ADD COLUMN vehicle_id TEXT;
ALTER TABLE service_history ADD COLUMN vehicle_id TEXT;

-- Kendaraan bawaan per grup supaya data lama tidak hilang.
INSERT OR IGNORE INTO vehicles (id, user_id, group_id, nama, jenis, odometer, rev, created_at, updated_at)
SELECT 'vehicle-default-' || group_id, MIN(user_id), group_id, 'Kendaraan 1', 'Lainnya', 0, 1, datetime('now'), datetime('now')
FROM service_inventory
WHERE group_id IS NOT NULL AND void IS NULL
GROUP BY group_id;

UPDATE service_inventory SET vehicle_id = 'vehicle-default-' || group_id
WHERE vehicle_id IS NULL AND group_id IS NOT NULL;

UPDATE service_history SET vehicle_id = 'vehicle-default-' || group_id
WHERE vehicle_id IS NULL AND group_id IS NOT NULL;

-- Baris tanpa group_id -> kendaraan bawaan global.
INSERT OR IGNORE INTO vehicles (id, user_id, group_id, nama, jenis, odometer, rev, created_at, updated_at)
SELECT 'vehicle-default-global', MIN(user_id), NULL, 'Kendaraan 1', 'Lainnya', 0, 1, datetime('now'), datetime('now')
FROM service_inventory WHERE group_id IS NULL AND void IS NULL;

UPDATE service_inventory SET vehicle_id = 'vehicle-default-global' WHERE vehicle_id IS NULL;

INSERT OR IGNORE INTO vehicles (id, user_id, group_id, nama, jenis, odometer, rev, created_at, updated_at)
SELECT 'vehicle-default-history', MIN(user_id), NULL, 'Kendaraan 1', 'Lainnya', 0, 1, datetime('now'), datetime('now')
FROM service_history WHERE group_id IS NULL AND void IS NULL;

UPDATE service_history SET vehicle_id = 'vehicle-default-history' WHERE vehicle_id IS NULL;
