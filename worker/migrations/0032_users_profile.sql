-- Bayt Mustaqbal — migration 0032: profil anggota keluarga lebih rinci.
ALTER TABLE users ADD COLUMN blood TEXT;
ALTER TABLE users ADD COLUMN allergy TEXT;
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN instagram TEXT;
ALTER TABLE users ADD COLUMN facebook TEXT;
ALTER TABLE users ADD COLUMN tiktok TEXT;
ALTER TABLE users ADD COLUMN twitter TEXT;
ALTER TABLE users ADD COLUMN youtube TEXT;
ALTER TABLE users ADD COLUMN bank_name TEXT;
ALTER TABLE users ADD COLUMN bank_account TEXT;
