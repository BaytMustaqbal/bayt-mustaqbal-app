-- Migration 0002: Add `rev` column to all tables (excluding audit_log which is append-only).
-- For fresh installs: 0001 already includes rev, skip this migration.
-- For existing installs (0001 was run before rev was added): run this to add rev.
-- NOTE: SQLite does NOT support ADD COLUMN IF NOT EXISTS — this migration
--       must only be run on databases where rev column does not exist.

ALTER TABLE users ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE categories ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE accounts ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE transactions ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE recurring ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bills ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE attendance ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE attendance_quota ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE calendar_events ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE service_asset ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE service_log ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notes ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notification_log ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;