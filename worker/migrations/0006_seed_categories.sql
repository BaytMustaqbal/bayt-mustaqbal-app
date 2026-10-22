-- Bayt Mustaqbal — migration 0006: seed kategori transaksi bawaan.
--
-- Latar belakang: `transactions.category_id` punya FOREIGN KEY ke
-- `categories(id)` dan D1 menegakkan FK. Tabel categories kosong sejak data
-- dibersihkan, sehingga POST /txn (pengeluaran MAUPUN pemasukan) dengan
-- category_id apa pun gagal 500 "Internal Server Error" — walau tanpa
-- category_id berhasil. Fix benar-benar: isi tabelnya dengan kategori yang
-- dipakai frontend (bukan melonggarkan FK).
--
-- Idempoten: INSERT OR IGNORE (id = PRIMARY KEY), aman dijalankan ulang.
-- Kategori milik akun master; id-nya string global sama dengan yang dipakai
-- frontend (components/categories.js), dipakai bersama semua anggota.

-- ---------- Kategori pengeluaran (type 'expense') ----------
INSERT OR IGNORE INTO categories (id, user_id, name, type, icon, color, rev, created_at, updated_at) VALUES
  ('belanja',      (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Belanja Bulanan',    'expense', 'shoppingBag',  '#22D3EE', 1, datetime('now'), datetime('now')),
  ('utilitas',     (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Utilitas',           'expense', 'zap',          '#38BDF8', 1, datetime('now'), datetime('now')),
  ('pendidikan',   (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Pendidikan',         'expense', 'book',         '#818CF8', 1, datetime('now'), datetime('now')),
  ('transportasi', (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Transportasi',       'expense', 'car',          '#34D399', 1, datetime('now'), datetime('now')),
  ('kesehatan',    (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Kesehatan',          'expense', 'activity',     '#FBBF24', 1, datetime('now'), datetime('now')),
  ('ibadah',       (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Ibadah & Sosial',    'expense', 'handCoins',    '#F472B6', 1, datetime('now'), datetime('now')),
  ('rumah',        (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Rumah & Cicilan',    'expense', 'home',         '#2DD4BF', 1, datetime('now'), datetime('now')),
  ('hiburan',      (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Hiburan & Liburan',  'expense', 'sparkles',     '#A78BFA', 1, datetime('now'), datetime('now')),
  ('tabungan',     (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Tabungan & Utang',   'expense', 'trendingUp',   '#4ADE80', 1, datetime('now'), datetime('now'));

-- ---------- Kategori pemasukan (type 'income') ----------
INSERT OR IGNORE INTO categories (id, user_id, name, type, icon, color, rev, created_at, updated_at) VALUES
  ('gaji',         (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Gaji',               'income',  'wallet',       '#34D399', 1, datetime('now'), datetime('now')),
  ('bonus',        (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Bonus / THR',        'income',  'sparkles',     '#FBBF24', 1, datetime('now'), datetime('now')),
  ('sidejob',      (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Side Job',           'income',  'wrench',       '#38BDF8', 1, datetime('now'), datetime('now')),
  ('investasi',    (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Hasil Investasi',    'income',  'trendingUp',   '#818CF8', 1, datetime('now'), datetime('now')),
  ('pemberian',    (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Pemberian / Hadiah', 'income',  'handCoins',    '#F472B6', 1, datetime('now'), datetime('now')),
  ('lainnya',      (SELECT id FROM users WHERE username = 'baytmustaqbal@gmail.com' LIMIT 1), 'Lainnya',            'income',  'inbox',        '#94A3B8', 1, datetime('now'), datetime('now'));
