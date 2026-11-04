-- Bayt Mustaqbal — migration 0015: simpan daftar scope Google yang disetujui.
-- Memungkinkan status integrasi (Calendar/Photos) akurat, tidak sekadar
-- "terhubung". Kolom diisi saat OAuth callback dari scope yang dikembalikan
-- Google.

ALTER TABLE gcal_connections ADD COLUMN google_scopes TEXT;
