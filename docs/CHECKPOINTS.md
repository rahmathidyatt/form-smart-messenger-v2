# Rencana implementasi dan batas penerimaan

## A — Fondasi dan design system (paket saat ini)

Next.js App Router dan UI utama; katalog unit/layanan; pratinjau empat langkah; React Hook Form/Zod; layout mobile-first; halaman informasi akses; konfigurasi Netlify tanpa static export. UI lokal tidak membutuhkan kredensial. Pengujian: lint, TypeScript, unit, build; verifikasi browser dicatat terpisah.

## B — Database, autentikasi, RLS

Migrasi `profiles`, `units`, `service_types`, `orders`, `order_services`, `order_attachments`, `order_quotes`, `payments`, `assignments`, `status_events`, `audit_logs`, `app_settings`, `legacy_imports`. FK, index, unique order_number/client_submission_id, UTC timestamp, ownership, source provenance. Seed katalog dari src/lib/catalog.ts. Pengaturan origin dan basis jarak awal null. Email dari sesi Auth, role server-managed, endpoint login/callback, cookies SSR dan logout. Uji akses anonim, agent A/B, messenger dan admin untuk SELECT/INSERT/UPDATE/DELETE termasuk storage. Tidak membuka panel internal sebelum pembatasan akses berhasil diuji.

## C — Form dan kalkulator persisten

Validasi ulang di server; draft aman per pengguna; idempotent submit; nomor pesanan; penyimpanan persisten; foto privat dengan pembatasan ukuran/MIME dan signed URL setelah otorisasi. Jarak PP manual terverifikasi, asal/keterangan/pemberi persetujuan tercatat. Basis one_way/round_trip harus eksplisit; jangan menyimpulkan rute simetris tanpa konfirmasi. Tarif snapshot integer rupiah; pembulatan jarak disepakati. Tanggal valid kalender Jakarta; batas layanan tervalidasi kembali server-side.

## D — Operasional, pembayaran, workflow

Panel admin dengan filter, detail, final quote, adjustment beralasan dan audit, rekening resmi, verifikasi bukti transfer, penugasan. Mesin transisi order terpisah dari pembayaran; blokir in_progress sebelum paid dan izin owner yang diperlukan. Panel messenger hanya pekerjaan miliknya. Kontrol perubahan quote sesudah dibayar. CSV export aman dari formula injection, pengaturan unit dan tarif.

## E — QA, deployment, migrasi

E2E desktop/mobile, keyboard, kegagalan server, retry, CSRF/session, rate limit, pengujian unggahan, isolasi data. Deploy Netlify melalui GitHub dan Supabase production setelah konfigurasi dan izin. Impor CSV hanya setelah file dan izin pemilik tersedia: preview, mapping, error per baris, dedupe, provenance terbatas. Backup/restore, retensi dan permintaan penghapusan diuji. Tidak menulis respons ke Google Form lama.

## Konfigurasi pengelola yang masih dibutuhkan

- URL Supabase dan publishable key; pengaturan Auth provider dan redirect.
- Admin awal yang sah, kebijakan master-agent dan penetapan messenger.
- Titik keberangkatan resmi dan basis batas banner 25 km.
- Instruksi pembayaran resmi, konfirmasi tarif, kebijakan pembulatan jarak dan penjadwalan.
- Izin branding, aturan akses data serta masa retensi foto/bukti pembayaran.
- CSV lama beserta otorisasi bila fitur migrasi akan digunakan.
