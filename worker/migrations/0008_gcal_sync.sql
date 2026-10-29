-- Bayt Mustaqbal — migration 0008: sinkronisasi Google Calendar (satu arah, app → Google).
--
-- 1) gcal_connections : token OAuth per user. Skema per-user sejak awal supaya
--    fase berikutnya tinggal nambah baris (istri connect akunnya sendiri).
-- 2) gcal_links       : mapping entity app ↔ google_event_id supaya update/delete
--    mengenai event Google yang SAMA (bukan bikin duplikat).
-- 3) gcal_outbox      : antrean push dengan retry. CRUD utama tidak pernah
--    gagal karena Google down; cron hourly memproses sisa antrian.

-- 1) Koneksi OAuth
CREATE TABLE IF NOT EXISTS gcal_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  google_sub TEXT,
  google_email TEXT,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id)
);

-- 2) Mapping entity ↔ event Google
CREATE TABLE IF NOT EXISTS gcal_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,      -- 'cal' (agenda) | 'bill' (tagihan)
  entity_id TEXT NOT NULL,
  google_event_id TEXT NOT NULL,
  last_synced_at TEXT NOT NULL,
  UNIQUE(entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_gcal_links_user ON gcal_links(user_id);

-- 3) Antrean sinkron
CREATE TABLE IF NOT EXISTS gcal_outbox (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,      -- 'cal' | 'bill'
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,           -- 'upsert' | 'delete'
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_gcal_outbox_pending ON gcal_outbox(attempts, created_at);
