-- Silsilah keluarga: posisi dalam pohon (orangtua/anak/cucu) + tanggal lahir.
-- generasi menentukan LEVEL di diagram silsilah (family_tree).
-- birth_date ISO YYYY-MM-DD, nullable (opsional); tampilan frontend format Indonesia.
-- Default generasi = 'orangtua' supaya akun lama tetap masuk level 1.
ALTER TABLE users ADD COLUMN generasi TEXT NOT NULL DEFAULT 'orangtua';
ALTER TABLE users ADD COLUMN birth_date TEXT;
