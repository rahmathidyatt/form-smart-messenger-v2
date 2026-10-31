# Hasil pemeriksaan V2.1

## Dijalankan

Lingkungan: Node v24.19.0, npm 11.9.0, Next.js 16.4.2. `npm ci` berhasil pada folder revisi dengan dependensi lokal sendiri.

| Pemeriksaan | Hasil |
|---|---|
| ESLint | Lulus, tanpa warning/error |
| TypeScript | Lulus |
| Unit + simulator integrasi Apps Script | 28/28 lulus |
| Next.js production build | Lulus; root dan endpoint API dinamis, halaman pendukung diprerender |

Simulator menjalankan **source Code.gs dan Catalog.gs yang sama dengan paket**, melalui Node VM dengan stub FormApp, SpreadsheetApp, LockService, PropertiesService, Utilities, MailApp dan UrlFetchApp. Tidak ada email, WhatsApp atau data Google nyata yang dikirim selama pengujian.

## Skenario yang diuji

- Jalur `createResponse` → `withItemResponse` → `submit`, pemetaan data/email/ID, pencatatan ID respons dan audit (simulasi).
- Retry idempotent dengan ID sama; payload berubah ditolak; token status salah tidak mengungkap data.
- Timeout setelah submit berhasil: respons direkonsiliasi tanpa submit kedua.
- Submit tidak pasti tanpa respons terlihat: needs_review dan tidak retry buta.
- Form ditutup/gagal sebelum submit: retry_wait lalu dapat diproses setelah pulih.
- Map tidak lengkap: tidak mengirim respons parsial.
- Notifikasi tidak berjalan sebelum synced; email hanya sekali pada kasus normal simulasi.
- Email ambigu tidak diulang otomatis; WhatsApp disabled secara default dan gagal tertutup bila syarat belum dikonfirmasi.
- Adapter template WhatsApp resmi mencatat provider ID pada respons simulasi sukses; tidak mengklaim provider nyata berhasil.
- HMAC invalid/replay ditolak, rate limit email tahan antarrequest pada ledger simulasi.
- Validasi ulang GAS untuk unit/tanggal/Maps/persetujuan/tugas Lainnya.
- Validasi frontend/server, body >16KB, origin tidak sesuai, otorisasi admin, field role tambahan.

## Belum diuji — wajib sebelum produksi

1. Rendering browser/E2E aktual, layar 360 px, navigasi keyboard dan screen reader. Kontrol browser yang didukung tidak tersedia di lingkungan pengerjaan; CSS mobile tidak sama dengan lulus audit aksesibilitas.
2. Uji Google Form/Apps Script/Sheets live beserta scope akun, aturan Workspace, pengumpulan email bawaan, validasi item asli, serta sheet laporan HRD yang terkait.
3. True concurrent requests dan kegagalan proses Google nyata. LockService dimodelkan, bukan di-stress-test pada runtime Google.
4. Kuota, trigger waktu, timeout jaringan nyata, schema drift Form asli, serta pemulihan backup ledger.
5. Turnstile live, domain Netlify aktual, secret rotation, dan deployment Netlify.
6. Pengiriman email nyata, kepemilikan/izin penerima, eligibility WhatsApp, template Meta, dan delivery webhook. Grup WhatsApp belum diimplementasikan.
7. Proses HRD turunan yang saat ini bergantung pada onFormSubmit. Tidak dianggap aktif otomatis saat programmatic submit.

## Uji penerimaan oleh pengelola

- Jalankan `inspectForm`, pastikan ID/tipe/pilihan sesuai, tambah metadata opsional setelah persetujuan, jalankan `validateSetup` tanpa submit.
- Uji pada salinan Form terlebih dahulu. Gunakan Turnstile development yang sesuai hostname; tetap verifikasi server.
- Isi form tanpa login; required fields kosong, owner kosong, unit invalid, tanggal lampau, Lainnya kosong harus ditolak.
- Submit data uji; periksa tab Responses Google, kolom email manual, ID pengajuan, detail metadata dan sheet HRD. Status UI hanya synced setelah ID tersimpan.
- Klik kirim ganda/retry jaringan dengan kode sama: pastikan hanya satu respons. Putuskan jaringan setelah request lalu cek status menggunakan kunci.
- Tutup Form uji sebelum submit: UI menampilkan antrean/retry; buka kembali dan jalankan worker, verifikasi pemulihan.
- Ubah judul item pada salinan: validasi map gagal, bukan silently drop jawaban.
- Status dengan kunci salah harus gagal; endpoint admin tanpa bearer key tidak boleh mengembalikan row.
- Setelah synced, dashboard menunjukkan unread; Tandai dibaca tersimpan dan tercatat audit. Email ke penerima uji resmi dikirim melalui worker.
- WhatsApp tetap disabled hingga pengelola menyelesaikan seluruh persyaratan; uji individual resmi dahulu. Jangan mencoba ID grup lama.
- Browser 360px: tidak ada horizontal overflow, opsi panjang dapat dipilih, semua field punya label dan pesan error, tombol kirim mudah disentuh.

Tidak ada klaim bebas bug atau siap operasional tanpa konfigurasi dan uji live tersebut.

## Regresi V2.1

Kolom Maps menerima kosong, spasi, strip biasa/en dash/em dash pada Zod dan Apps Script. Strip dinormalisasi menjadi kosong sebelum hashing, sehingga retry dengan strip lalu kosong tidak membuat respons kedua. Tautan valid tetap diterima dan input berbahaya tetap ditolak. Teks internal HRD, Google Form, sinkronisasi, serta ID respons tidak ditampilkan di komponen publik. Browser/mobile belum diuji.
