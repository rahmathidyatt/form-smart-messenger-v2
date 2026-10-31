# Form Order Smart Messenger — Brighton HUB Cibubur V2

Aplikasi web pemesanan operasional **Smart Messenger Brighton HUB Cibubur** yang terhubung langsung ke Google Form resmi HRD melalui gateway ringan **Google Apps Script (`FormApp`)**.

## Alur Kerja Utama

1. **Agent membuka website** (tanpa perlu login Google atau menyelesaikan CAPTCHA).
2. **Mengisi formulir order Smart Messenger** (Nama & Kode Agent, Email, Unit Brighton, Tanggal Pengerjaan, Alamat Lengkap + Google Maps opsional, Tugas Messenger, Catatan Tambahan, dan Konfirmasi Pemilik/Owner).
3. **Klik "Kirim & Sinkronkan Pesanan"**.
4. **Gateway `/api/orders`** memvalidasi seluruh kolom wajib, memeriksa duplikasi ID pengajuan, dan mengirim data ke Web App Google Apps Script (`APPS_SCRIPT_URL`).
5. **Google Apps Script (`doPost`)** menyimpan respons asli ke Google Forms (`FormApp`) sehingga otomatis tercatat di tab **Responses** Google Form dan **Google Sheets** tujuan.
6. **Notifikasi sukses `"Berhasil dikirim"`** tampil beserta nomor referensi respons, dan **formulir direset otomatis** tanpa berpindah halaman.

## Konfigurasi Minimal

Salin `.env.example` menjadi `.env.local` dan isi satu variabel berikut:

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

Lihat panduan lengkap pemasangan Google Apps Script dan deployment Netlify di [`docs/AKTIVASI.md`](docs/AKTIVASI.md).

## Perintah Pengembangan & Pengujian

```bash
# Menjalankan server pengembangan (port 3000)
npm run dev

# Menjalankan seluruh unit test (validasi + gateway Apps Script)
npm test

# Memeriksa lint & build produksi
npm run lint
npm run build
```
