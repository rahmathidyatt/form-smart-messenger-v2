# Aktivasi Google Form resmi dan Netlify

## 1. Persetujuan data dan akses pengelola

Gunakan akun yang berhak mengedit Google Form asli dan mengakses sheet laporan HRD. Link responden `/forms/d/e/.../viewform` tidak memberikan hak editor dan ID publik tersebut bukan ID file editor untuk `FormApp.openById()`.

Ambil `FORM_ID` dari URL editor `https://docs.google.com/forms/d/ID_FILE_FORM/edit`. Jangan menebak dari link responden.

Koordinasikan dengan HRD terlebih dahulu:

- Form tetap tujuan resmi.
- Email tanpa login adalah self-declared. Kolom email otomatis bawaan Google tidak dapat diisi secara bebas melalui API FormResponse. Periksa hasil aktual `getRespondentEmail()` pada uji integrasi dan jangan gunakan sebagai email agent dari website.
- Tambahkan tiga pertanyaan **opsional di akhir Form**, setelah disetujui pengelola: `EMAIL PEMESAN WEBSITE` (short answer), `ID PENGAJUAN WEBSITE` (short answer), `DETAIL WEBSITE` (paragraph). Pertanyaan ini terlihat bagi pengisi Form biasa; Google Form tidak menyediakan hidden field biasa. Jangan mewajibkannya bagi jalur Form lama.
- HRD memakai kolom `EMAIL PEMESAN WEBSITE` untuk sumber website. `DETAIL WEBSITE` menyimpan Maps, asal website, waktu penerimaan, versi persetujuan, serta status email self-declared.
- Tidak mengubah pengaturan pengumpulan email, pembatasan organisasi, atau persetujuan formulir secara otomatis. Uji kompatibilitas pengaturan asli dengan script; jangan melewati kebijakan organisasi. Set `PUBLIC_EMAIL_POLICY_APPROVED=true` hanya setelah keputusan pengelola.

Penambahan metadata diperlukan agar sinkronisasi dapat direkonsiliasi saat koneksi putus. Tidak menjanjikan exactly-once lintas layanan Google karena ledger dan submit Form bukan satu transaksi atomik.

## 2. Siapkan Apps Script

1. Buat proyek Apps Script di akun pengelola. Salin `Code.gs` dan `Catalog.gs` ke file dengan nama sama.
2. Aktifkan tampilan manifest melalui Project Settings lalu salin `appsscript.json`. Zona waktu harus `Asia/Jakarta`.
3. Buat spreadsheet baru **privat** untuk ledger. Jangan gunakan sheet respons HRD sebagai ledger dan jangan memilih "anyone with the link".
4. Pada Script Properties, isi `FORM_ID`, `LEDGER_SPREADSHEET_ID`, `APPS_SCRIPT_SECRET` (acak minimal 32 karakter), dan nanti `ITEM_MAP_JSON`. Contoh nama variabel ada di `script-properties.example.json`; nilai kosong berarti belum siap, bukan kredensial.
5. Jalankan `inspectForm()` dari editor. Hasil hanya inventaris judul/ID/tipe/opsi, tanpa data jawaban responden. Cocokkan pertanyaan dan pilihan dengan Form asli.
6. Isi `ITEM_MAP_JSON` berdasarkan `item-map.example.json` menggunakan ID aktual. `null` pada contoh wajib diganti. Judul harus cocok, spasi berulang dinormalisasi. Jangan memakai posisi item sebagai ID.
7. Jalankan `setupLedger()`: membuat tab Submissions dan Audit pada ledger; tidak mengubah Form asli. Berikan izin Google yang diminta jika sesuai akun pengelola.
8. Jalankan `validateSetup()`. Fungsi ini membangun respons tanpa `submit()`, untuk memeriksa pemetaan seluruh unit, layanan dan owner. Tidak mengirim email atau WhatsApp. Perbaiki jenis item/pilihan/ID jika gagal.
9. Jalankan `installWorker()` sekali. Trigger waktu setiap menit untuk retry dan notifikasi; pemasangan ulang mengganti hanya trigger `worker` proyek ini. Aktifkan notifikasi kegagalan trigger di pengaturan Google dan pantau Executions.
10. Deploy → New deployment → Web app → execute as akun pengelola. Akses endpoint perlu memungkinkan panggilan server Next.js tanpa sesi Google (opsi sesuai kebijakan Workspace). Endpoint tetap memverifikasi HMAC. Bila Workspace melarang endpoint ini, jangan melemahkan kebijakan; gunakan arsitektur gateway yang disetujui pengelola. Salin URL `/exec`, bukan `/dev`.
11. Setiap perubahan source Apps Script memerlukan update deployment/version web app. Trigger waktu memakai source proyek terkini; pastikan source trigger dan deployment web app konsisten sebelum go-live.

## 3. Pemetaan jawaban

| Kunci map | Pertanyaan / tipe | Data |
|---|---|---|
| name_code | NAMA DAN KODE AGENT, TEXT/PARAGRAPH_TEXT | Nama (Kode PA) |
| unit | UNIT, LIST/MULTIPLE_CHOICE | Satu dari 31 unit |
| date | TANGGAL PENGERJAAN, DATE dengan tahun | Tanggal, zona Jakarta |
| address | ALAMAT LENGKAP PENUGASAN (Blok dan Nomor Rumah), TEXT/PARAGRAPH_TEXT | Alamat asli |
| task | TUGAS YANG DIBERIKAN KE MESSENGER | Label tugas sesuai katalog, satu pilihan |
| other | TUGAS LAINNYA (JIKA TUGAS TIDAK ADA DI LIST ATAS), TEXT/PARAGRAPH_TEXT | Keterangan |
| owner | APAKAH SUDAH KONFIRMASI PEMILIK/OWNER, LIST/MULTIPLE_CHOICE | YA/TIDAK |
| email | EMAIL PEMESAN WEBSITE, TEXT | Email manual, bukan verified |
| request_id | ID PENGAJUAN WEBSITE, TEXT | UUID idempotency |
| details | DETAIL WEBSITE, PARAGRAPH_TEXT | JSON metadata, Maps dan persetujuan |

Opsi Lainnya: didukung sebagai pilihan literal `Lainnya`, atau built-in Other pada item yang mendukungnya. `validateSetup()` memeriksa hasil. Bila judul/opsi asli berbeda, verifikasi perbedaan terlebih dahulu; jangan diam-diam membuang jawaban.

## 4. Hubungkan website

1. Salin `.env.example` menjadi `.env.local` untuk lokal.
2. Buat widget Cloudflare Turnstile dengan hostname localhost untuk uji dan domain aktual untuk produksi. Isi public site key dan server secret yang benar.
3. Isi `APP_ORIGIN`, `APPS_SCRIPT_URL` dan `APPS_SCRIPT_SECRET` yang sama dengan Script Properties. `APP_ORIGIN` harus origin tepat; satu deployment satu origin. Jangan memakai wildcard.
4. Buat `ADMIN_ACCESS_TOKEN` acak yang berbeda dari secret gateway. Contoh pembuat secret lokal: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Simpan di password manager; jangan commit atau mengirimkannya di chat.
5. Turnstile wajib dan diverifikasi server (hostname/action); tidak ada bypass produksi atau kredensial dummy. Menjalankan tanpa konfigurasi hanya membuka pratinjau form, tidak mensimulasikan submit sukses.
6. Untuk Netlify: impor repository GitHub Anda, Node 22+, `npm run build`, publish `.next`, gunakan runtime Next.js Netlify. Jangan static export. Tambahkan env vars melalui Netlify, lalu deploy ulang (site key publik di-bundle saat build).
7. Gunakan HTTPS untuk produksi. Site bisa publik agar agent tidak login, sedangkan `/api/admin` hanya menerima kunci staf. UI admin boleh terbuka tetapi tidak ada data sebelum otorisasi.

## 5. Notifikasi email dan WhatsApp

- `NOTIFY_EMAIL_TO`: alamat staf/HRD yang memang berwenang, dapat berupa satu alamat grup email atau beberapa email dipisah koma (maksimal 10). Tidak mengirim otomatis ke email pemesan yang belum terverifikasi. Default kosong = disabled.
- Email hanya berisi kode, ID respons, dan tanggal permintaan; alamat properti, token akses, data pembayaran tidak dikirim ke grup.
- Dashboard: status synced menjadi notifikasi belum dibaca; polling 60 detik selama dashboard terbuka; tombol Tandai dibaca dicatat di audit. Ini bukan push notification browser/background.
- `WHATSAPP_ENABLED=false` secara bawaan. Untuk mengaktifkan: pengelola harus mengonfirmasi akun Cloud API resmi/akses yang sah, penerima opt-in, nomor bisnis, versi Graph yang masih didukung, dan template disetujui. Set flag konfirmasi hanya setelah pemeriksaan akun; source tidak dapat membuktikan kelayakan akun sendiri.
- Adapter mengirim **template individual** dengan dua parameter body: kode pengajuan (`{{1}}`) dan tanggal (`{{2}}`). Sesuaikan nama/language template di Script Properties; buat template yang menyatakan pengajuan telah tercatat, bukan pembayaran berhasil.
- Token WhatsApp hanya di Script Properties. Jangan menggunakan nomor pribadi sebagai bot WhatsApp Web. Grup WhatsApp biasa belum didukung dalam paket ini; Groups API memerlukan verifikasi terpisah dan implementasi khusus, bukan sekadar mengganti nomor penerima.
- `accepted` berarti provider menerima permintaan; bukan bukti delivered/read. Email/WhatsApp tidak digunakan sebagai satu-satunya bukti bahwa laporan HRD sudah tercatat.

## 6. Uji sebelum digunakan

Mulai dengan salinan Form dan spreadsheet uji milik pengelola. Jalankan pengujian lengkap pada salinan, lalu ganti FORM_ID/ITEM_MAP_JSON ke Form asli yang telah disetujui. Lakukan satu pengajuan uji resmi bertanda jelas setelah izin pengelola. Verifikasi tab Responses, ID respons, sheet HRD yang terhubung, email dan dashboard. Jangan menganggap report HRD otomatis benar hanya karena script mengembalikan ID.

Jika sistem HRD lama menggunakan `onFormSubmit`, Apps Script `FormResponse.submit()` tidak menyalakannya. Panggil pekerjaan HRD tambahan secara eksplisit setelah synced, sesuai kode lama yang telah diaudit; paket ini tidak mengarang atau mengubah proses internal HRD yang belum dilihat.
