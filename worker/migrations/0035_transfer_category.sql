-- Bayt Mustaqbal — migration 0035: kategori sistem "Transfer".
-- Dipakai transaksi berpasangan saat transfer antar dompet.
INSERT OR IGNORE INTO categories (id, user_id, name, type, icon, color, rev, created_at, updated_at)
VALUES ('transfer', (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Transfer', 'expense', 'repeat', '#94A3B8', 1, datetime('now'), datetime('now'));
