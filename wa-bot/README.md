# TMS WA Bot (Cloudflare Worker)

Worker ini menerima webhook WA Cloud API masuk, memverifikasi signature, menyimpan log,
menghindari duplikat, dan membalas pesan. Tidak ada model LLM yang berjalan saat ini.

## Apa yang dijalankannya

- Webhook `POST /` dari Meta (WA Cloud API). Harus memakai header `X-Hub-Signature-256`.
- Verifikasi HMAC-SHA256 dengan secret dari `WA_WEBHOOK_SECRET` (lihat secrets di bawah).
- Dedupe message id (KV) dan simpan setiap pesan baru ke D1 (`wa_messages`).
- Membalas setiap pesan masuk dengan respons teks statis (placeholder `"Anda bilang: ..."`).
- Log kesalahan saat membalas ke `wa_errors`.

## Setting up secrets di Cloudflare

Di dashboard Cloudflare > Workers > neuro-wa-bot > Secrets, tambahkan:

- `WA_WEBHOOK_SECRET` → kunci rahasia yang cocok dengan yang dipakai Meta.
- `WA_ACCESS_TOKEN` → token bearer untuk `POST /{phone-id}/messages`.
- `WA_PHONE_ID` → ID nomor WhatsApp yang dipakai untuk webhook.

Atau gunakan `wrangler secret put WA_WEBHOOK_SECRET`, dll.

## Menyiapkan D1 dan KV

```bash
npx wrangler d1 create neuro-wa-bot-db
npx wrangler kv:namespace create neuro-wa-bot
npx wrangler kv:namespace list
```

Ganti placeholder IDs di wrangler.toml dengan yang di atas.

Buat tabel D1:

```sql
CREATE TABLE IF NOT EXISTS wa_messages (
  message_id TEXT PRIMARY KEY,
  from_number TEXT NOT NULL,
  phone_number_id TEXT,
  message_text TEXT,
  timestamp TEXT NOT NULL,
  processed BOOLEAN DEFAULT false,
  error TEXT
);
CREATE TABLE IF NOT EXISTS wa_errors (
  message_id TEXT PRIMARY KEY,
  error_message TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
);
```

## Deploy worker

```bash
cd wa-bot
npx wrangler deploy
```

Worker akan menjadi `neuro-wa-bot.workers.dev`.

## Webhook URL

Gunakan URL worker di dashboard Cloudflare (misal `https://neuro-wa-bot.workers.dev`) sebagai webhook WA Cloud API di Meta dashboard.

## Tahapan berikutnya

- Tambahkan routing percakapan (state per nomor) di Durable Objects.
- Ganti balasan placeholder dengan jawaban berdasarkan intents.
- Hubungkan ke model LLM (Workers AI, Ollama, API hosted) untuk `replyToWhatsApp`.
- Hubungkan ke service binding ke TMS worker untuk akses data internal.

## Keamanan

- Worker ini menerima HTTP dari internet; pastikan secrets tidak bocor.
- Hanya endpoint / yang aktif.

## Rekam jejak

- Semua pesan masuk disimpan di `wa_messages`.
- Duplikat dicegah via KV `WA_DEDUPE`.
- Kesalahan saat membalas dicatat ke `wa_errors`.

## Mulai cepat

1. Push skeleton (wa-bot/) ke repo.
2. `npx wrangler login`.
3. Buat D1 dan KV.
4. Tambahkan secrets.
5. Isi ID placeholder di wrangler.toml.
6. `npx wrangler deploy`.
7. Daftarkan webhook di Meta.

## Contoh penggunaan di klien

Skrip curl dasar:

```bash
curl -X POST https://neuro-wa-bot.workers.dev \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$(echo -n 'secretbody' | openssl dgst -sha256 -hmac secret | cut -d' ' -f2)" \
  -d '{"entry":[{"id":"test","changes":[{"value":{"id":"msg1","from":"12345","message":{"text":"test"}},"field":"messages"}]}]}'
```