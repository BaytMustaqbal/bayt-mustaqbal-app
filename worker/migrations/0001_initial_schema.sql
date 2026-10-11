-- Migration 0001: Initial schema for Bayt Mustaqbal
-- Run: wrangler d1 migrations apply bayt-mustaqbal-db --local

-- 1. users
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','user')) DEFAULT 'user',
  aktif TEXT CHECK(aktif IN ('YA','TIDAK')) DEFAULT 'YA',
  password_hash TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 2. settings (key-value)
CREATE TABLE settings (
  k TEXT PRIMARY KEY,
  v TEXT,
  tipe TEXT CHECK(tipe IN ('text','number','bool','date')),
  keterangan TEXT
);

-- 3. categories
CREATE TABLE categories (
  category_id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  tipe TEXT CHECK(tipe IN ('income','expense')) NOT NULL,
  scope TEXT CHECK(scope IN ('pribadi','keluarga','usaha')) DEFAULT 'keluarga',
  parent_id TEXT REFERENCES categories(category_id),
  warna TEXT DEFAULT '#757575',
  ikon TEXT DEFAULT '📁',
  budget_bulanan INTEGER DEFAULT 0,
  aktif TEXT CHECK(aktif IN ('YA','TIDAK')) DEFAULT 'YA',
  urutan INTEGER DEFAULT 0
);

-- 4. accounts
CREATE TABLE accounts (
  account_id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  tipe TEXT CHECK(tipe IN ('tunai','rekening','ewallet','kartu_kredit')) NOT NULL,
  saldo_awal INTEGER DEFAULT 0,
  kartu_kredit TEXT CHECK(kartu_kredit IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  urutan INTEGER DEFAULT 0,
  aktif TEXT CHECK(aktif IN ('YA','TIDAK')) DEFAULT 'YA'
);

-- 5. transactions
CREATE TABLE transactions (
  txn_id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  periode TEXT NOT NULL,
  tipe TEXT CHECK(tipe IN ('income','expense')) NOT NULL,
  kategori_id TEXT REFERENCES categories(category_id),
  kategori_nama TEXT,
  jumlah INTEGER NOT NULL,
  account_id TEXT REFERENCES accounts(account_id),
  scope TEXT CHECK(scope IN ('pribadi','keluarga','usaha')),
  metode TEXT CHECK(metode IN ('tunai','transfer','debit','kredit','ewallet')),
  keterangan TEXT,
  tags TEXT,
  recurring_id TEXT REFERENCES recurring(rec_id),
  bill_id TEXT REFERENCES bills(bill_id),
  void TEXT CHECK(void IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  dibuat_oleh TEXT REFERENCES users(email),
  dibuat_pada TEXT DEFAULT (datetime('now')),
  diubah_oleh TEXT REFERENCES users(email),
  diubah_pada TEXT,
  rev INTEGER DEFAULT 1
);

-- 6. recurring
CREATE TABLE recurring (
  rec_id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  tipe TEXT CHECK(tipe IN ('income','expense')),
  kategori_id TEXT REFERENCES categories(category_id),
  jumlah INTEGER DEFAULT 0,
  frekuensi TEXT CHECK(frekuensi IN ('harian','mingguan','bulanan','tahunan')),
  interval INTEGER DEFAULT 1,
  tanggal_mulai TEXT,
  tanggal_akhir TEXT,
  hari_tanggal INTEGER DEFAULT 1,
  scope TEXT CHECK(scope IN ('pribadi','keluarga','usaha')),
  account_id TEXT REFERENCES accounts(account_id),
  auto_post TEXT CHECK(auto_post IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  kategori_variabel TEXT CHECK(kategori_variabel IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  aktif TEXT CHECK(aktif IN ('YA','TIDAK')) DEFAULT 'YA',
  void TEXT CHECK(void IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  dibuat_oleh TEXT REFERENCES users(email),
  dibuat_pada TEXT DEFAULT (datetime('now')),
  diubah_oleh TEXT REFERENCES users(email),
  diubah_pada TEXT,
  rev INTEGER DEFAULT 1
);

-- 7. bills
CREATE TABLE bills (
  bill_id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  tipe TEXT CHECK(tipe IN ('rutin','cicilan','sekali','kartu_kredit','iuran_sampah')),
  jumlah INTEGER NOT NULL,
  jatuh_tempo TEXT NOT NULL,
  periode TEXT NOT NULL,
  cicilan_ke INTEGER DEFAULT 0,
  total_cicilan INTEGER DEFAULT 0,
  sisa_cicilan INTEGER DEFAULT 0,
  rec_id TEXT REFERENCES recurring(rec_id),
  status TEXT CHECK(status IN ('belum','lunas')) DEFAULT 'belum',
  estimasi TEXT CHECK(estimasi IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  lunas_pada TEXT,
  txn_id TEXT REFERENCES transactions(txn_id),
  prioritas TEXT CHECK(prioritas IN ('tinggi','normal','rendah')) DEFAULT 'normal',
  kategori_id TEXT REFERENCES categories(category_id),
  catatan TEXT,
  remind_at TEXT,
  remind_channel TEXT CHECK(remind_channel IN ('WA','EMAIL','BOTH')) DEFAULT 'WA',
  remind_sent TEXT CHECK(remind_sent IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  void TEXT CHECK(void IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  dibuat_oleh TEXT REFERENCES users(email),
  dibuat_pada TEXT DEFAULT (datetime('now')),
  diubah_oleh TEXT REFERENCES users(email),
  diubah_pada TEXT,
  rev INTEGER DEFAULT 1
);

-- 8. attendance
CREATE TABLE attendance (
  att_id TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL,
  periode TEXT NOT NULL,
  nama TEXT NOT NULL,
  status TEXT CHECK(status IN ('hadir','izin','cuti','sakit','lembur','WFH')),
  alasan TEXT,
  dari_jam TEXT,
  sampai_jam TEXT,
  catatan TEXT,
  terjadwal TEXT CHECK(terjadwal IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  dibuat_oleh TEXT REFERENCES users(email),
  dibuat_pada TEXT DEFAULT (datetime('now')),
  void TEXT CHECK(void IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  rev INTEGER DEFAULT 1,
  UNIQUE(tanggal, nama)
);

-- 9. attendance_quota
CREATE TABLE attendance_quota (
  tahun INTEGER NOT NULL,
  nama TEXT NOT NULL,
  jatah_cuti INTEGER DEFAULT 12,
  jatah_izin INTEGER DEFAULT 0,
  catatan TEXT,
  PRIMARY KEY (tahun, nama)
);

-- 10. calendar_events
CREATE TABLE calendar_events (
  event_id TEXT PRIMARY KEY,
  judul TEXT NOT NULL,
  kategori TEXT CHECK(kategori IN ('keluarga','liburan','rencana','kerja','spiritual','ultah')),
  tanggal_mulai TEXT NOT NULL,
  tanggal_selesai TEXT NOT NULL,
  jam_mulai TEXT,
  jam_selesai TEXT,
  lokasi TEXT,
  deskripsi TEXT,
  biaya_rencana INTEGER DEFAULT 0,
  all_day TEXT CHECK(all_day IN ('YA','TIDAK')) DEFAULT 'YA',
  reminder_hari INTEGER DEFAULT 1,
  reminder_email TEXT CHECK(reminder_email IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  selesai TEXT CHECK(selesai IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  rec_id TEXT REFERENCES recurring(rec_id),
  prioritas TEXT CHECK(prioritas IN ('tinggi','normal','rendah')) DEFAULT 'normal',
  void TEXT CHECK(void IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  dibuat_oleh TEXT REFERENCES users(email),
  dibuat_pada TEXT DEFAULT (datetime('now')),
  diubah_oleh TEXT REFERENCES users(email),
  diubah_pada TEXT,
  rev INTEGER DEFAULT 1
);

-- 11. service_asset
CREATE TABLE service_asset (
  asset_id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  grup TEXT CHECK(grup IN ('motor','rumah','elektronik','perabot','lainnya')),
  merek TEXT, tipe TEXT, tahun TEXT,
  no_seri TEXT, lokasi TEXT,
  interval_hari INTEGER DEFAULT 0,
  interval_km INTEGER DEFAULT 0,
  keterangan TEXT,
  aktif TEXT CHECK(aktif IN ('YA','TIDAK')) DEFAULT 'YA',
  void TEXT CHECK(void IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  dibuat_oleh TEXT REFERENCES users(email),
  dibuat_pada TEXT DEFAULT (datetime('now')),
  diubah_oleh TEXT REFERENCES users(email),
  diubah_pada TEXT,
  rev INTEGER DEFAULT 1
);

-- 12. service_log
CREATE TABLE service_log (
  svc_id TEXT PRIMARY KEY,
  asset_id TEXT REFERENCES service_asset(asset_id),
  jenis TEXT CHECK(jenis IN ('servis','ganti','perbaikan','rutin','claim_asuransi')),
  tanggal TEXT NOT NULL,
  kilometer INTEGER DEFAULT 0,
  biaya INTEGER DEFAULT 0,
  vendor TEXT, no_nota TEXT, parts TEXT,
  txn_id TEXT REFERENCES transactions(txn_id),
  catatan TEXT,
  selesai TEXT CHECK(selesai IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  void TEXT CHECK(void IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  dibuat_oleh TEXT REFERENCES users(email),
  dibuat_pada TEXT DEFAULT (datetime('now')),
  diubah_oleh TEXT REFERENCES users(email),
  diubah_pada TEXT,
  rev INTEGER DEFAULT 1
);

-- 13. notes
CREATE TABLE notes (
  note_id TEXT PRIMARY KEY,
  judul TEXT NOT NULL,
  isi TEXT,
  kategori TEXT CHECK(kategori IN ('ide','resep','referensi','lainnya')) DEFAULT 'lainnya',
  pin TEXT CHECK(pin IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  void TEXT CHECK(void IN ('YA','TIDAK')) DEFAULT 'TIDAK',
  dibuat_oleh TEXT REFERENCES users(email),
  dibuat_pada TEXT DEFAULT (datetime('now')),
  diubah_oleh TEXT REFERENCES users(email),
  diubah_pada TEXT,
  rev INTEGER DEFAULT 1
);

-- 14. audit_log
CREATE TABLE audit_log (
  log_id TEXT PRIMARY KEY,
  waktu TEXT DEFAULT (datetime('now')),
  email TEXT REFERENCES users(email),
  role TEXT,
  aksi TEXT,
  entity TEXT,
  entity_id TEXT,
  ringkas TEXT,
  sebelum TEXT,
  sesudah TEXT
);

-- 15. notification_log
CREATE TABLE notification_log (
  notif_id TEXT PRIMARY KEY,
  waktu TEXT DEFAULT (datetime('now')),
  tipe TEXT,
  periode TEXT,
  penerima TEXT,
  status TEXT CHECK(status IN ('terkirim','gagal')),
  pesan TEXT,
  error TEXT
);

-- Indexes
CREATE INDEX idx_txn_periode ON transactions(periode);
CREATE INDEX idx_txn_user ON transactions(dibuat_oleh);
CREATE INDEX idx_txn_kategori ON transactions(kategori_id);
CREATE INDEX idx_bills_status ON bills(status, jatuh_tempo);
CREATE INDEX idx_bills_rec ON bills(rec_id);
CREATE INDEX idx_attendance_user_date ON attendance(nama, tanggal);
CREATE INDEX idx_calendar_date ON calendar_events(tanggal_mulai);
CREATE INDEX idx_servicelog_asset ON service_log(asset_id, tanggal);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);