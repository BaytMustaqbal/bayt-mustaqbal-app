-- Seed kategori pengeluaran yang dipakai frontend (FINANCE_CATEGORIES)
-- tapi belum ada di tabel categories. Tanpa ini, transaksi dengan kategori
-- cicilan/hobi/kuliner gagal FK (HTTP 500) saat disimpan.
-- Pola sama dengan 0006_seed_categories.sql: id = PRIMARY KEY global,
-- user_id = akun master (baytmustaqbal@gmail.com), INSERT OR IGNORE.

INSERT OR IGNORE INTO categories (id, user_id, name, type, icon, color, rev, created_at, updated_at) VALUES
  ('cicilan', (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Cicilan & Kredit', 'expense', 'repeat', '#22D3EE', 1, datetime('now'), datetime('now')),
  ('hobi',    (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Hobi',            'expense', 'sparkles', '#A78BFA', 1, datetime('now'), datetime('now')),
  ('kuliner', (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Kuliner',         'expense', 'utensils', '#FB7185', 1, datetime('now'), datetime('now'));
