-- Rincian belanja per transaksi (hasil struk, form manual, atau WA).
-- Disimpan sebagai JSON text: [{ "name": "Indomie", "price": 3500 }].
-- Null / kosong berarti transaksi tidak punya rincian.
ALTER TABLE transactions ADD COLUMN items TEXT;
