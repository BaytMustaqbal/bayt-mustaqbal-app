-- Migration 0002: Seed data for Bayt Mustaqbal
-- Run after 0001_initial_schema.sql

-- Settings
INSERT INTO settings (k, v, tipe, keterangan) VALUES
('nama_keluarga', 'Keluarga Triana', 'text', 'Nama keluarga untuk header'),
('mulai_data', '2026-10-01', 'date', 'Batas bawah filter tanggal'),
('bulan_angsuran_gaji', '25', 'number', 'Tanggal gaji dalam bulan'),
('default_scope', 'keluarga', 'text', 'Scope default transaksi'),
('mata_uang', 'IDR', 'text', 'Mata uang'),
('hari_libur', '2026-01-01,2026-02-17,2026-03-29,2026-04-03,2026-05-01,2026-05-14,2026-05-25,2026-06-01,2026-07-30,2026-08-17,2026-09-05,2026-12-25', 'text', 'Hari libur nasional CSV'),
('cuti_tahunan', '12', 'number', 'Default jatah cuti tahunan'),
('fonnte_token', '', 'text', 'API Token Fonnte — ISI DARI DASHBOARD FONNTE'),
('fonnte_target', '', 'text', 'Group ID WA (format: 628xxx@g.us) — ISI SETELAH BUAT GRUP'),
('fonnte_device', 'default', 'text', 'Device ID Fonnte'),
('notifikasi_channel', 'WA', 'text', 'Channel notifikasi: WA / EMAIL / BOTH'),
('jam_notifikasi', '07:00', 'text', 'Jam kirim digest harian');

-- Categories (Income)
INSERT INTO categories (category_id, nama, tipe, scope, warna, ikon, budget_bulanan, aktif, urutan) VALUES
('cat-gaji', 'Gaji', 'income', 'pribadi', '#4CAF50', '💰', 0, 'YA', 1),
('cat-lembur', 'Lembur', 'income', 'pribadi', '#4CAF50', '💼', 0, 'YA', 2),
('cat-bonus', 'Bonus', 'income', 'pribadi', '#4CAF50', '🎁', 0, 'YA', 3),
('cat-sidejob', 'Side Job', 'income', 'pribadi', '#4CAF50', '🔧', 0, 'YA', 4),
('cat-usaha', 'Usaha', 'income', 'usaha', '#4CAF50', '🏪', 0, 'YA', 5),
('cat-refund', 'Refund', 'income', 'keluarga', '#4CAF50', '↩️', 0, 'YA', 6);

-- Categories (Expense - Keluarga)
INSERT INTO categories (category_id, nama, tipe, scope, warna, ikon, budget_bulanan, aktif, urutan) VALUES
('cat-makan', 'Makan & Belanja', 'expense', 'keluarga', '#FF9800', '🛒', 2000000, 'YA', 10),
('cat-transport', 'Transportasi', 'expense', 'keluarga', '#FF9800', '🚗', 500000, 'YA', 11),
('cat-tagihan', 'Tagihan', 'expense', 'keluarga', '#FF9800', '📄', 1000000, 'YA', 12),
('cat-pendidikan', 'Pendidikan', 'expense', 'keluarga', '#FF9800', '📚', 500000, 'YA', 13),
('cat-kesehatan', 'Kesehatan', 'expense', 'keluarga', '#FF9800', '🏥', 300000, 'YA', 14),
('cat-rumah', 'Perlengkapan Rumah', 'expense', 'keluarga', '#FF9800', '🏠', 500000, 'YA', 15),
('cat-liburan', 'Liburan', 'expense', 'keluarga', '#FF9800', '✈️', 1000000, 'YA', 16),
('cat-cicilan', 'Cicilan', 'expense', 'keluarga', '#FF9800', '📋', 2000000, 'YA', 17),
('cat-zakat', 'Zakat/Infak', 'expense', 'keluarga', '#FF9800', '🕌', 0, 'YA', 18);

-- Categories (Expense - Pribadi)
INSERT INTO categories (category_id, nama, tipe, scope, warna, ikon, budget_bulanan, aktif, urutan) VALUES
('cat-grooming', 'Grooming', 'expense', 'pribadi', '#9C27B0', '💈', 200000, 'YA', 20),
('cat-hobi', 'Hobi', 'expense', 'pribadi', '#9C27B0', '🎮', 300000, 'YA', 21),
('cat-seragam', 'Seragam/Kerja', 'expense', 'pribadi', '#9C27B0', '👔', 200000, 'YA', 22),
('cat-kopi', 'Kopi', 'expense', 'pribadi', '#9C27B0', '☕', 150000, 'YA', 23);

-- Categories (Expense - Usaha)
INSERT INTO categories (category_id, nama, tipe, scope, warna, ikon, budget_bulanan, aktif, urutan) VALUES
('cat-bahan', 'Bahan Baku', 'expense', 'usaha', '#607D8B', '📦', 0, 'YA', 30),
('cat-alat', 'Alat', 'expense', 'usaha', '#607D8B', '🔨', 0, 'YA', 31),
('cat-transport-usaha', 'Transport', 'expense', 'usaha', '#607D8B', '🚚', 0, 'YA', 32),
('cat-iklan', 'Iklan', 'expense', 'usaha', '#607D8B', '📢', 0, 'YA', 33),
('cat-operasional', 'Operasional', 'expense', 'usaha', '#607D8B', '⚙️', 0, 'YA', 34);

-- Accounts
INSERT INTO accounts (account_id, nama, tipe, saldo_awal, kartu_kredit, urutan, aktif) VALUES
('acc-cash', 'Cash', 'tunai', 0, 'TIDAK', 1, 'YA'),
('acc-bca', 'BCA', 'rekening', 0, 'TIDAK', 2, 'YA'),
('acc-gopay', 'GoPay', 'ewallet', 0, 'TIDAK', 3, 'YA');

-- Recurring (templates)
INSERT INTO recurring (rec_id, nama, tipe, kategori_id, jumlah, frekuensi, interval, tanggal_mulai, hari_tanggal, scope, auto_post, kategori_variabel, aktif, dibuat_oleh, dibuat_pada) VALUES
('rec-gaji', 'Gaji', 'income', 'cat-gaji', 0, 'bulanan', 1, '2026-10-01', 25, 'pribadi', 'TIDAK', 'TIDAK', 'YA', 'system', datetime('now')),
('rec-listrik', 'Listrik PLN', 'expense', 'cat-tagihan', 0, 'bulanan', 1, '2026-10-01', 10, 'keluarga', 'TIDAK', 'YA', 'YA', 'system', datetime('now')),
('rec-internet', 'Internet IndiHome', 'expense', 'cat-tagihan', 350000, 'bulanan', 1, '2026-10-01', 15, 'keluarga', 'TIDAK', 'TIDAK', 'YA', 'system', datetime('now')),
('rec-asuransi', 'Asuransi Kendaraan', 'expense', 'cat-tagihan', 650000, 'bulanan', 1, '2026-10-01', 5, 'keluarga', 'TIDAK', 'TIDAK', 'YA', 'system', datetime('now')),
('rec-simpanan', 'Simpanan', 'expense', 'cat-cicilan', 500000, 'bulanan', 1, '2026-10-01', 2, 'keluarga', 'TIDAK', 'TIDAK', 'YA', 'system', datetime('now')),
('rec-sampah', 'Iuran Sampah RT', 'expense', 'cat-tagihan', 50000, 'bulanan', 1, '2026-10-01', 1, 'keluarga', 'TIDAK', 'TIDAK', 'YA', 'system', datetime('now'));