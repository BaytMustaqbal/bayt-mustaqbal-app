-- Bayt Mustaqbal — migration 0025: pembatas percobaan login (anti brute-force).
CREATE TABLE IF NOT EXISTS auth_attempts (
  id TEXT PRIMARY KEY,
  rl_key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_key ON auth_attempts(rl_key);
