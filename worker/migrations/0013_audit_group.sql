-- Bayt Mustaqbal — migration 0013: audit log ber-scope grup keluarga.
-- Memungkinkan seluruh anggota keluarga melihat audit aktivitas bersama.

ALTER TABLE audit_log ADD COLUMN group_id TEXT;
CREATE INDEX IF NOT EXISTS idx_audit_group ON audit_log(group_id, created_at);
