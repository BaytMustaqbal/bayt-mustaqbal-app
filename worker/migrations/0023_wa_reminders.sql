-- Bayt Mustaqbal — migration 0023: pengingat WA (sekali pakai).
-- Dipakai bot WA: "Neuro ingatkan aku besok jam 9 ...".
CREATE TABLE IF NOT EXISTS wa_reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  group_id TEXT,
  message TEXT NOT NULL,
  remind_at TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wa_reminders_due ON wa_reminders(remind_at, done);
