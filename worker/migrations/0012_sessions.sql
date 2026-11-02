-- Bayt Mustaqbal — migration 0012: sesi login aktif.
--
-- Memungkinkan "kelola sesi aktif": setiap login (password / Google)
-- menerbitkan JWT ber-jti, dicatat di sini. Middleware menolak token yang
-- jti-nya sudah di-void (logout / revoke) atau kedaluwarsa.

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  jti TEXT NOT NULL UNIQUE,
  device TEXT,
  created_at TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_jti ON sessions(jti);
