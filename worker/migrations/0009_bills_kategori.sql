-- Bayt Mustaqbal — migration 0009: kolom pendukung migrasi tagihan frontend.
--
-- Tagihan frontend (Utang-Piutang) punya field yang belum ada di tabel bills:
--   - kategori       → kategori tagihan (utama untuk tampilan & push Google)
--   - paid_amount    → nominal terbayar (bisa parsial, bukan cuma lunas/belum)
--   - last_notified  → penanda pengingat WA terakhir supaya tidak dobel
-- Field lain sudah cocok (dibayar ≥ amount → status, lastPaidDate → paid_at).

ALTER TABLE bills ADD COLUMN kategori TEXT;
ALTER TABLE bills ADD COLUMN paid_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bills ADD COLUMN last_notified TEXT;
