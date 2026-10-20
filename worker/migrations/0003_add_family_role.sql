-- Tambah kolom family_role ke tabel users
-- Nilai: 'suami' | 'istri' | 'anak' | 'lainnya'
-- Default 'anak' — akun baru yang tidak menyebut family_role dianggap anak.
-- Master account (baytmustaqbal@gmail.com) tidak tampil di daftar anggota.
ALTER TABLE users ADD COLUMN family_role TEXT NOT NULL DEFAULT 'anak';
