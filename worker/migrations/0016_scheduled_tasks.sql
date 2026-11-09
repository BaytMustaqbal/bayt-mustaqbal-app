-- Tugas Terjadwal: sinkronisasi 4 tab (pengeluaran/tabungan/belanja/service)
-- ke backend, agar cron bisa mengirim notif WA H-3 (3 hari sebelum jatuh tempo).
--
-- type: 'pengeluaran' | 'tabungan' | 'belanja' | 'service'
--   - pengeluaran: day (1-31) per bulan; next_due dihitung tiap bulan.
--   - tabungan:    next_due = target_date (satu kali).
--   - belanja/service: next_due = tanggal jatuh tempo berikutnya (diisi user).
-- active = 1 aktif, 0 nonaktif. void = soft delete.

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL,
  day INTEGER,
  next_due TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_group ON scheduled_tasks(group_id, void);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_due ON scheduled_tasks(next_due, active, void);
