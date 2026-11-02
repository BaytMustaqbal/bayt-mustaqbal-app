-- Bayt Mustaqbal — migration 0011: login via Google.
--
-- Kolom google_sub menyimpan identitas Google (sub) yang terikat ke akun.
-- Dipakai verifikasi login Google: user yang sudah terdaftar (username=email)
-- boleh masuk lewat Google bila emailnya cocok. Sekali terikat, sub Google
-- tidak boleh berpindah ke akun lain (cegah spoof email).

ALTER TABLE users ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
