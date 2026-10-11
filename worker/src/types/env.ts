// worker/src/types/env.ts
// Cloudflare Workers environment bindings

export interface Env {
  // D1 Database
  DB: D1Database;
  
  // KV Namespace (optional - for sessions/cache)
  KV?: KVNamespace;
  
  // Secrets (set via wrangler secret put)
  JWT_SECRET: string;
  FONNTE_TOKEN: string;
  FONNTE_TARGET: string;
  FONNTE_DEVICE: string;
  
  // Service bindings
  // ASSETS?: Fetcher; // for serving frontend from worker
}

export interface JWTPayload {
  user_id: string;
  email: string;
  nama: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

export interface User {
  user_id: string;
  email: string;
  nama: string;
  role: 'admin' | 'user';
  aktif: 'YA' | 'TIDAK';
  password_hash?: string;
  created_at: string;
}

export interface Category {
  category_id: string;
  nama: string;
  tipe: 'income' | 'expense';
  scope: 'pribadi' | 'keluarga' | 'usaha';
  parent_id?: string;
  warna: string;
  ikon: string;
  budget_bulanan: number;
  aktif: 'YA' | 'TIDAK';
  urutan: number;
}

export interface Account {
  account_id: string;
  nama: string;
  tipe: 'tunai' | 'rekening' | 'ewallet' | 'kartu_kredit';
  saldo_awal: number;
  kartu_kredit: 'YA' | 'TIDAK';
  urutan: number;
  aktif: 'YA' | 'TIDAK';
}

export interface Transaction {
  txn_id: string;
  tanggal: string;
  periode: string;
  tipe: 'income' | 'expense';
  kategori_id: string;
  kategori_nama?: string;
  jumlah: number;
  account_id: string;
  scope: 'pribadi' | 'keluarga' | 'usaha';
  metode: 'tunai' | 'transfer' | 'debit' | 'kredit' | 'ewallet';
  keterangan?: string;
  tags?: string;
  recurring_id?: string;
  bill_id?: string;
  void: 'YA' | 'TIDAK';
  dibuat_oleh: string;
  dibuat_pada: string;
  diubah_oleh?: string;
  diubah_pada?: string;
  rev: number;
}

export interface Recurring {
  rec_id: string;
  nama: string;
  tipe: 'income' | 'expense';
  kategori_id: string;
  jumlah: number;
  frekuensi: 'harian' | 'mingguan' | 'bulanan' | 'tahunan';
  interval: number;
  tanggal_mulai: string;
  tanggal_akhir?: string;
  hari_tanggal: number;
  scope: 'pribadi' | 'keluarga' | 'usaha';
  account_id?: string;
  auto_post: 'YA' | 'TIDAK';
  kategori_variabel: 'YA' | 'TIDAK';
  aktif: 'YA' | 'TIDAK';
  void: 'YA' | 'TIDAK';
  dibuat_oleh: string;
  dibuat_pada: string;
  diubah_oleh?: string;
  diubah_pada?: string;
  rev: number;
}

export interface Bill {
  bill_id: string;
  nama: string;
  tipe: 'rutin' | 'cicilan' | 'sekali' | 'kartu_kredit' | 'iuran_sampah';
  jumlah: number;
  jatuh_tempo: string;
  periode: string;
  cicilan_ke: number;
  total_cicilan: number;
  sisa_cicilan: number;
  rec_id?: string;
  status: 'belum' | 'lunas';
  estimasi: 'YA' | 'TIDAK';
  lunas_pada?: string;
  txn_id?: string;
  prioritas: 'tinggi' | 'normal' | 'rendah';
  kategori_id?: string;
  catatan?: string;
  remind_at?: string;
  remind_channel: 'WA' | 'EMAIL' | 'BOTH';
  remind_sent: 'YA' | 'TIDAK';
  void: 'YA' | 'TIDAK';
  dibuat_oleh: string;
  dibuat_pada: string;
  diubah_oleh?: string;
  diubah_pada?: string;
  rev: number;
}

export interface Attendance {
  att_id: string;
  tanggal: string;
  periode: string;
  nama: string;
  status: 'hadir' | 'izin' | 'cuti' | 'sakit' | 'lembur' | 'WFH';
  alasan?: string;
  dari_jam?: string;
  sampai_jam?: string;
  catatan?: string;
  terjadwal: 'YA' | 'TIDAK';
  dibuat_oleh: string;
  dibuat_pada: string;
  void: 'YA' | 'TIDAK';
  rev: number;
}

export interface CalendarEvent {
  event_id: string;
  judul: string;
  kategori: 'keluarga' | 'liburan' | 'rencana' | 'kerja' | 'spiritual' | 'ultah';
  tanggal_mulai: string;
  tanggal_selesai: string;
  jam_mulai?: string;
  jam_selesai?: string;
  lokasi?: string;
  deskripsi?: string;
  biaya_rencana: number;
  all_day: 'YA' | 'TIDAK';
  reminder_hari: number;
  reminder_email: 'YA' | 'TIDAK';
  selesai: 'YA' | 'TIDAK';
  rec_id?: string;
  prioritas: 'tinggi' | 'normal' | 'rendah';
  void: 'YA' | 'TIDAK';
  dibuat_oleh: string;
  dibuat_pada: string;
  diubah_oleh?: string;
  diubah_pada?: string;
  rev: number;
}

export interface ServiceAsset {
  asset_id: string;
  nama: string;
  grup: 'motor' | 'rumah' | 'elektronik' | 'perabot' | 'lainnya';
  merek?: string;
  tipe?: string;
  tahun?: string;
  no_seri?: string;
  lokasi?: string;
  interval_hari: number;
  interval_km: number;
  keterangan?: string;
  aktif: 'YA' | 'TIDAK';
  void: 'YA' | 'TIDAK';
  dibuat_oleh: string;
  dibuat_pada: string;
  diubah_oleh?: string;
  diubah_pada?: string;
  rev: number;
}

export interface ServiceLog {
  svc_id: string;
  asset_id: string;
  jenis: 'servis' | 'ganti' | 'perbaikan' | 'rutin' | 'claim_asuransi';
  tanggal: string;
  kilometer: number;
  biaya: number;
  vendor?: string;
  no_nota?: string;
  parts?: string;
  txn_id?: string;
  catatan?: string;
  selesai: 'YA' | 'TIDAK';
  void: 'YA' | 'TIDAK';
  dibuat_oleh: string;
  dibuat_pada: string;
  diubah_oleh?: string;
  diubah_pada?: string;
  rev: number;
}

export interface Note {
  note_id: string;
  judul: string;
  isi?: string;
  kategori: 'ide' | 'resep' | 'referensi' | 'lainnya';
  pin: 'YA' | 'TIDAK';
  void: 'YA' | 'TIDAK';
  dibuat_oleh: string;
  dibuat_pada: string;
  diubah_oleh?: string;
  diubah_pada?: string;
  rev: number;
}

export interface Settings {
  k: string;
  v: string;
  tipe: 'text' | 'number' | 'bool' | 'date';
  keterangan?: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}