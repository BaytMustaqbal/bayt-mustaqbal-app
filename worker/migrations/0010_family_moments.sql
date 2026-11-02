-- Bayt Mustaqbal — migration 0010: Momen Keluarga (jurnal kenangan).
--
-- Aktifitas keluarga (jalan-jalan, makan-makan, dll) yang FOKUS pada
-- dokumentasi kenangan, berbeda dengan agenda (rencana ke depan).
--
-- Skema mengikuti pola data bersama grup (group_id) + soft delete (void)
-- seperti notes/calendar_events. Satu momen = satu foto utama (R2 bucket),
-- lokasi berupa teks nama tempat, kategori dari daftar tetap.

CREATE TABLE IF NOT EXISTS family_moments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  group_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  location TEXT,
  category TEXT NOT NULL DEFAULT 'lainnya',
  photo_url TEXT,
  rev INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  void TEXT
);

CREATE INDEX IF NOT EXISTS idx_moments_group_date ON family_moments(group_id, date);
CREATE INDEX IF NOT EXISTS idx_moments_user ON family_moments(user_id);
