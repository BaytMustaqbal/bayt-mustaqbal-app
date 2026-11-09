-- Tambah kategori untuk pengeluaran terjadwal (default 'lainnya'), supaya
-- transaksi yang dibuat otomatis oleh cron memakai kategori yang benar.

ALTER TABLE scheduled_tasks ADD COLUMN category TEXT;
