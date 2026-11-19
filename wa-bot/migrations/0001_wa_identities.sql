-- Mapping identitas grup WhatsApp (LID) ke user aplikasi.
-- Fonnte mengirim `member` sebagai LID di grup, bukan nomor HP.
-- Disimpan di D1 log bot (WA_LOGS), bukan di database aplikasi.
CREATE TABLE IF NOT EXISTS wa_identities (
  lid        TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  name       TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
