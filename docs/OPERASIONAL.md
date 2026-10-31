# Operasional, keamanan, dan pemulihan

## Status sinkronisasi

| Status | Arti | Tindakan |
|---|---|---|
| queued | Data sudah di ledger, belum tercatat di HRD | Worker memproses |
| retry_wait | Gagal sebelum pemanggilan submit Form | Retry bertahap 1, 2, 4, 8 menit; maksimal 5 percobaan |
| submitting | Marker sudah disimpan sebelum side effect Google | Jika proses terputus, cocokkan ID pengajuan pada Form |
| synced | ID respons Google sudah tersimpan | Aktifkan notifikasi dashboard, antrekan email/WhatsApp |
| needs_review | Hasil submit tidak pasti atau duplikasi terdeteksi | Rekonsiliasi; tidak submit ulang secara buta |
| failed | Batas retry sebelum submit habis | Perbaiki konfigurasi/izin lalu admin Coba sinkronisasi lagi |

Pengajuan baru ditolak jika tanggal sudah lampau. Retry record yang sudah diterima tidak ditolak hanya karena melewati tengah malam. Ini adalah pencatatan HRD, bukan eksekusi lapangan. Semua tugas tetap perlu prosedur persetujuan, pembayaran dan owner sebelum dikerjakan.

## Idempotency dan batas jaminan

- Browser membuat UUID pengajuan dan kunci acak 256-bit. Hanya kode/kunci tersimpan di sessionStorage, tidak menyimpan alamat atau isi form. SessionStorage dapat tidak tersedia pada mode privasi; simpan kode/kunci yang ditampilkan.
- Selama halaman yang sama, retry memakai payload, kode, dan kunci yang sama. Double click diblokir dan gateway mengecek idempotency secara durable.
- Payload hash mencegah ID lama digunakan dengan isi baru. Token disimpan sebagai hash di ledger.
- LockService mengurutkan operasi proyek Apps Script; marker `submitting` dan flush ledger dilakukan sebelum submit Form.
- Bila terjadi crash sesudah Google menerima tetapi sebelum pencatatan ID, rekonsiliasi mencari jawaban `ID PENGAJUAN WEBSITE`. Satu hasil dipulihkan ke synced; nol/lebih dari satu hasil → needs_review.
- Google Form tidak menyediakan transaksi atomik bersama spreadsheet ledger atau idempotency key native. Mekanisme ini mengurangi duplikasi; tidak menjamin exactly-once dalam semua kegagalan infrastruktur.
- Jangan mengganti kode atau menyuruh agent mengisi ulang ketika hasil masih tidak pasti. Jika refresh terjadi sebelum ada respons, pakai halaman status; admin perlu memeriksa kasus yang tidak ditemukan sebelum menyarankan pengajuan baru.

## Pemulihan kasus needs_review

1. Catat kode pengajuan; cek Audit dan record ledger secara privat.
2. Admin dapat menekan Rekonsiliasi dengan Form. Ini hanya membaca Form, tidak membuat respons baru.
3. Bila satu respons ditemukan, ID dipulihkan; bila belum ditemukan, tetap needs_review. Tunggu konsistensi Google dan periksa lagi.
4. Jika benar-benar tidak ada respons setelah penelusuran dan worker lama sudah berhenti, keputusan pengiriman ulang harus dikerjakan pengelola secara terkontrol dengan catatan audit. Paket sengaja tidak menyediakan tombol "paksa submit" untuk hasil ambigu.
5. Jika banyak respons cocok, koreksi laporan dengan HRD. Jangan hapus respons atau mengubah status ledger sembarangan.

## Notifikasi

`pending` → `sending` → `accepted`; atau `retry_wait`, `failed`, `needs_review`, `disabled`.

- Hanya jalan setelah synced. Kegagalan notifikasi tidak membatalkan respons HRD yang sudah tercatat.
- Email quota/config diperiksa sebelum side effect, lalu dapat dijadwalkan ulang. Jika pengiriman mungkin telah dilakukan tetapi hasilnya tidak pasti, tandai needs_review untuk mencegah email ganda.
- WhatsApp HTTP 429 dijadwalkan ulang; penolakan 4xx lain failed; gangguan jaringan/5xx atau respons tidak jelas ditahan needs_review. Provider ID disimpan bila ada.
- accepted bukan delivered/read. Tidak ada webhook delivery dalam versi ini.
- Notifikasi yang disabled tidak dihidupkan otomatis untuk pengajuan lama setelah konfigurasi berubah. Secara default hanya pengajuan baru yang memakai konfigurasi baru. Pengiriman ulang notifikasi lama memerlukan pengecekan pengelola agar tidak terjadi spam.
- Dashboard menunjukkan 100 record terbaru. Untuk kasus lebih lama, gunakan ledger privat. Polling hanya berjalan saat dashboard terbuka; bunyi/push browser tidak disediakan.

## Batas operasional

Ledger berbasis Sheets dirancang untuk volume kecil cabang: maksimal 5 pengajuan per email per 15 menit dan 60 pengajuan total per 15 menit, kapasitas 5.000 record aktif. Kuota email/Apps Script bergantung akun Google; periksa dokumentasi dan pemakaian aktual. Jika volume meningkat, pindahkan antrean teknis ke database/queue persisten tanpa mengubah tujuan Form HRD.

Jangan hapus ledger aktif untuk menghindari batas kapasitas: hilangnya idempotency record berisiko pengiriman ganda. Sebelum kapasitas penuh, lakukan migrasi indeks idempotency dan arsip sesuai kebijakan, atau hentikan penerimaan sampai migrasi selesai.

## Keamanan dan privasi

- Endpoint publik Next.js wajib Zod, JSON body <=16 KB, exact Origin dan Turnstile hostname/action. Pemeriksaan origin bukan identitas agent. Jangan jadikan nama/kode/email sebagai bukti identitas terverifikasi.
- Apps Script hanya menerima envelope HMAC SHA-256 dengan timestamp 5 menit, nonce dan secret server. Cache nonce menolak replay umum, tetapi cache best-effort; perlindungan duplikasi utama ada pada ledger dan lock.
- Secret gateway dan kunci admin berbeda. Scope izin Google dimiliki pengelola dan tidak dibagikan ke client. Akses endpoint GAS yang publik tanpa signature valid tidak memproses order.
- Admin endpoint perlu kunci acak minimal 32 karakter. Simpan di password manager; rotasi dan cabut ketika staf berubah. Tidak ada password default. Dashboard tidak boleh diakses melalui token query string atau link publik berkunci.
- Status publik membutuhkan UUID + kunci acak; hasil hanya status, ID respons, dan timestamp. Tidak ada URL edit Google Form yang dibagikan.
- Ledger memiliki PII; hanya beri akses ke staf yang dibutuhkan. Audit tidak menyimpan body atau secret, hanya waktu/id/event/actor generik. Project editor dan spreadsheet editor tetap bisa mengubah data, jadi audit ini bukan log tahan manipulasi.
- Jangan log body request di Netlify/APM. Jangan publish sheet ledger, token akses, email pemesan, atau alamat properti ke grup.
- Tidak ada uploader di versi ini; jangan menambahkan input file tanpa storage privat, validasi ukuran/MIME dan otorisasi.

## Backup, retensi, penghapusan

Pengelola menetapkan masa retensi bersama HRD sebelum produksi. Buat backup ledger dan laporan resmi secara privat sesuai kebijakan, uji restore pada salinan. Retensi tidak diotomatisasi agar tidak menghapus bukti HRD atau indeks idempotency tanpa keputusan pemilik data. Penghapusan data pemesan harus mencakup ledger, respons Form/sheet terkait, backup sesuai jadwal, dan jejak notifikasi berdasarkan kebijakan. Simpan tombstone idempotency non-PII bila diperlukan untuk mencegah replay setelah penghapusan. Implementasi hapus/arsip otomatis belum tersedia.

## Sumber teknis utama

- https://developers.google.com/apps-script/reference/forms/form-response
- https://developers.google.com/apps-script/guides/triggers/installable
- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/reference/forms/date-item
- https://developers.google.com/apps-script/reference/lock/lock
- https://developers.google.com/apps-script/guides/services/quotas
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.facebook.com/documentation/business-messaging/whatsapp/overview

Dokumentasi spesifik Meta Groups gagal diakses saat penyusunan; tidak ada angka syarat kelayakan atau kemampuan memasuki grup lama yang diasumsikan. Aktivasi WhatsApp harus mengacu akun dan dokumentasi Meta yang berlaku saat implementasi live.
