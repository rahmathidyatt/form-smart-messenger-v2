# Smart Messenger — revisi V2.1

Formulir satu halaman tanpa login pemesan, dengan Google Form Order Smart Messenger Brighton HUB Cibubur sebagai tujuan resmi pelaporan HRD. Versi ini menggantikan alur empat langkah dan backend Supabase pada brief awal untuk jalur penerimaan order.

**Status:** source integrasi disediakan; belum terhubung ke Google Form asli, belum dideploy, dan belum mengirim email/WhatsApp nyata. Pengiriman dinonaktifkan ketika konfigurasi server belum lengkap. Keberhasilan build bukan bukti sinkronisasi langsung dengan Google.

## Revisi V2.1

Teks agent disederhanakan: tidak menampilkan pelaporan HRD, detail sinkronisasi, ID respons Google, atau penjelasan konfigurasi internal. Informasi teknis tetap tersedia bagi admin dan di dokumentasi. Share location opsional: kosong, spasi, atau tanda strip dinormalisasi menjadi tanpa lokasi. Jika diisi tautan, tautan tetap divalidasi. Input tidak lagi memakai validasi URL native browser. Aktivasi integrasi belum dilakukan.

## Jalankan lokal

Ekstrak paket, buka folder `smart-messenger` di VS Code, gunakan Node.js 22+:

```powershell
npm ci
npm run dev
```

Buka http://localhost:3000. Pada Windows jika `npm.ps1` diblokir, gunakan terminal Command Prompt atau `npm.cmd`.

Tanpa `.env.local`, formulir bisa ditinjau tetapi belum dapat mengirim. Ikuti **docs/AKTIVASI.md** untuk menghubungkan Google Apps Script dan Turnstile. Kredensial tidak disertakan dan jangan dikirim melalui chat.

## Perubahan tampilan

- Satu kolom seperti Google Form, header kecil Brighton HUB Cibubur, aksen kuning, tanpa landing page promosi atau stepper.
- Tidak ada tombol login bagi agent. Form langsung terbuka.
- Tarif dan ketentuan dapat dibuka/tutup. Informasi pembayaran tetap melalui staf.
- Identitas, lokasi, tugas, owner, persetujuan, satu tombol kirim.
- Seluruh 31 unit dan 9 layanan sesuai teks yang diberikan. Nama dan kode PA disatukan ketika ditulis ke pertanyaan asli.
- Satu tugas per pengajuan agar pengisian singkat. Adapter menerima item Google bertipe pilihan tunggal/list/checkbox; untuk checkbox, mengirim array satu pilihan. Jenis asli harus diperiksa dengan inspectForm, tidak diasumsikan dari teks.
- Foto belum diunggah melalui website; koordinasi foto dengan staf disebutkan secara jelas. Tidak ada jarak otomatis, kalkulator harga final, atau rekening fiktif.

## Halaman

| URL | Fungsi |
|---|---|
| `/` | Formulir publik tanpa akun |
| `/pemesanan` | Redirect ke formulir |
| `/status` | Status pelaporan melalui ID + kunci acak; tidak mengembalikan PII |
| `/admin` | Dashboard staf, dilindungi kunci akses server; bukan untuk pemesan |

## Arsitektur

Browser → Next.js `/api/orders` (Zod, origin, pembatasan body, Turnstile) → Apps Script (HMAC bertimestamp, validasi ulang, LockService) → ledger Google Sheets privat → Google Form resmi via `FormApp.openById()`, `createResponse()`, `withItemResponse()`, `submit()`.

Setelah respons Google terkonfirmasi dan ID disimpan: dashboard memberi notifikasi belum dibaca; worker memproses email ke staf dan adapter WhatsApp resmi jika diaktifkan. Tidak menggunakan endpoint `formResponse` yang tidak terdokumentasi. Tidak menulis langsung ke sheet respons untuk berpura-pura menjadi respons Form.

Ledger adalah antrean dan catatan sinkronisasi teknis. **Google Form tetap catatan resmi HRD.** Record `queued` belum dianggap sudah dilaporkan. Spreadsheet ledger terpisah tidak perlu dibuka publik.

## Berkas penting

```text
src/app/page.tsx                 Form utama
src/app/api/orders/route.ts      Endpoint submit publik
src/app/api/status/route.ts      Endpoint status dengan kunci
src/app/api/admin/route.ts       Endpoint admin terotorisasi
src/components/simple-form.tsx  UI satu halaman
src/components/challenge.tsx    Turnstile
src/components/admin-dashboard.tsx
src/lib/submission.ts           Zod
src/lib/server/bridge.ts         Server-to-server HMAC
apps-script/Code.gs              Form submission, antrean, retry, audit, notifikasi
apps-script/Catalog.gs           31 unit + layanan
apps-script/appsscript.json      Zona waktu dan scopes
apps-script/item-map.example.json
apps-script/script-properties.example.json
tests/gateway.test.ts            Simulator Apps Script, tanpa akses Google
tests/validation.test.ts         Validasi dan keamanan endpoint
```

## Hal yang tidak boleh disalahartikan

1. Email website diisi manual, bukan email Google terverifikasi. FormResponse tidak memiliki setter email responden bawaan. Pengelola harus menyepakati kolom email website dengan HRD; jangan mengganti atau mengklaim kolom email bawaan berisi identitas agent.
2. Dibutuhkan tiga pertanyaan tambahan opsional pada Form asli: email website, ID pengajuan website, detail website. Script tidak menambahkan atau mengubah Form secara otomatis. Jika perubahan ini tidak diizinkan, jangan mengaktifkan integrasi ini sebelum desain pemetaan alternatif disetujui.
3. `FormResponse.submit()` tidak memicu `onFormSubmit`. Worker memanggil notifikasi secara eksplisit. Audit sistem HRD yang sudah ada dan hubungkan proses turunannya bila sebelumnya bergantung pada trigger tersebut.
4. Respons dibuat oleh script berotorisasi pengelola, bukan sesi Google agent. Tanpa login, nama, kode PA, dan email bersifat pernyataan pemesan; ini bukan verifikasi identitas.
5. `accepted` pada email/WhatsApp berarti penyedia menerima permintaan, bukan pesan sudah dibaca/delivered. Webhook delivery WhatsApp belum diimplementasikan.
6. Pengiriman ke grup WhatsApp yang sudah ada **belum diimplementasikan**. Adapter saat ini untuk penerima individual resmi dengan opt-in dan template disetujui. Jangan mengganti `to` dengan ID grup atau mengaktifkan WhatsApp Web automation.
7. Dashboard menyimpan kunci admin hanya di memori browser. Belum tersedia akun staf per individu/SSO; audit mencatat `admin`, bukan identitas orang per orang. Gunakan kunci acak kuat untuk staf terbatas dan rotasi secara berkala.

## Verifikasi

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Hasil dan batas pengujian ada di **docs/QA.md**. Panduan pemetaan, aktivasi, kasus retry, notifikasi, dan pemulihan ada di **docs/AKTIVASI.md** dan **docs/OPERASIONAL.md**.
