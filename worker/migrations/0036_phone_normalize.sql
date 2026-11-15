-- Bayt Mustaqbal — migration 0036: seragamkan nomor telepon ke format 62...
--
-- Latar belakang: nomor lama disimpan sebagai 08... (lokal). Mulai sekarang
-- disimpan sebagai 62... tanpa "+" agar cocok dengan format WA (Fonnte &
-- webhook Meta). Migrasi ini membersihkan pemisah (- spasi +) lalu mengganti
-- awalan 0 dengan 62. Idempoten: nomor yang sudah berawalan 62 tidak disentuh.
UPDATE users
SET phone = '62' || substr(replace(replace(replace(phone, '-', ''), ' ', ''), '+', ''), 2)
WHERE replace(replace(replace(phone, '-', ''), ' ', ''), '+', '') LIKE '0%';
