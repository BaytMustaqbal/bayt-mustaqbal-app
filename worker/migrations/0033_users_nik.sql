-- Bayt Mustaqbal — migration 0033: NIK anggota keluarga.
ALTER TABLE users ADD COLUMN nik TEXT;
