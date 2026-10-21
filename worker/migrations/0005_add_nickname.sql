-- Nama panggilan (nickname) — tampil di silsilah & profil.
-- "Eki" / "Hilda" bukan turunan nama lengkap, jadi disimpan terpisah.
ALTER TABLE users ADD COLUMN nickname TEXT;
