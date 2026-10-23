-- Bayt Mustaqbal — migration 0007: grup keluarga + peran anggota.
--
-- Model baru: data aplikasi (transaksi, agenda, catatan, settings) menjadi
-- milik GRUP KELUARGA, bukan per-akun. Isolasi antar-keluarga lewat
-- `family_groups.id`; hak tulis lewat `users.group_role`
-- (kepala_keluarga | suami | istri = boleh tulis; anak | cucu = baca saja).
--
-- CATATAN: SQLite tak punya "ALTER TABLE ... ADD COLUMN IF NOT EXISTS", jadi
-- migrasi ini satu kali jalan (dijalankan manual seperti 0006).

-- 1) Tabel grup keluarga
CREATE TABLE IF NOT EXISTS family_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2) Kolom baru di users
ALTER TABLE users ADD COLUMN group_id TEXT REFERENCES family_groups(id);
ALTER TABLE users ADD COLUMN group_role TEXT NOT NULL DEFAULT 'anak';

-- 3) Kolom grup di tabel data aplikasi (backfill di langkah 5)
ALTER TABLE transactions ADD COLUMN group_id TEXT;
ALTER TABLE calendar_events ADD COLUMN group_id TEXT;
ALTER TABLE notes ADD COLUMN group_id TEXT;
ALTER TABLE settings ADD COLUMN group_id TEXT;

-- 4) Index untuk query per-grup
CREATE INDEX IF NOT EXISTS idx_users_group ON users(group_id);
CREATE INDEX IF NOT EXISTS idx_txn_group ON transactions(group_id);
CREATE INDEX IF NOT EXISTS idx_cal_group ON calendar_events(group_id);
CREATE INDEX IF NOT EXISTS idx_notes_group ON notes(group_id);
CREATE INDEX IF NOT EXISTS idx_settings_group ON settings(group_id);

-- 5) Data migrasi: satu grup untuk keluarga Kakang (pemilik = master),
--    semua akun yang ada masuk grup itu; peran diturunkan dari family_role
--    lama (master -> kepala_keluarga).
INSERT INTO family_groups (id, name, owner_user_id, created_at, updated_at)
SELECT 'grup-keluarga-rezki', 'Keluarga Rezki', id, datetime('now'), datetime('now')
FROM users
WHERE username = 'baytmustaqbal@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM family_groups WHERE id = 'grup-keluarga-rezki');

UPDATE users
SET group_id = 'grup-keluarga-rezki',
    group_role = CASE
      WHEN username = 'baytmustaqbal@gmail.com' THEN 'kepala_keluarga'
      WHEN family_role = 'suami' THEN 'suami'
      WHEN family_role = 'istri' THEN 'istri'
      ELSE 'anak'
    END
WHERE group_id IS NULL;

-- 6) Backfill data lama milik setiap akun -> milik grup (data digabung).
--    user_id asli dipertahankan sebagai "penulis" baris.
UPDATE transactions SET group_id = 'grup-keluarga-rezki' WHERE group_id IS NULL;
UPDATE calendar_events SET group_id = 'grup-keluarga-rezki' WHERE group_id IS NULL;
UPDATE notes SET group_id = 'grup-keluarga-rezki' WHERE group_id IS NULL;
UPDATE settings SET group_id = 'grup-keluarga-rezki' WHERE group_id IS NULL;
