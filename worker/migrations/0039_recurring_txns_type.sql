-- Bayt Mustaqbal - migration 0039: tipe pada transaksi berulang.
--
-- Transaksi berulang tidak selalu menghasilkan pengeluaran. Service kendaraan
-- menghasilkan riwayat service (dan opsional biaya). Tambah `type` plus field
-- khusus service; kategori & dompet sudah ada di migrasi 0038.

ALTER TABLE recurring_txns ADD COLUMN type TEXT NOT NULL DEFAULT 'pengeluaran';
ALTER TABLE recurring_txns ADD COLUMN vehicle_id TEXT;
ALTER TABLE recurring_txns ADD COLUMN service_category TEXT;

CREATE INDEX IF NOT EXISTS idx_recurring_type ON recurring_txns(type, active);
