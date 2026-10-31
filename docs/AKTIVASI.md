# Panduan Aktivasi & Deployment Google Form + Netlify (Smart Messenger V2)

Dokumen ini menjelaskan dua metode koneksi server-side dari tombol **"Kirim & Sinkronkan Pesanan"** ke Google Form resmi **Brighton HUB Cibubur** (`https://forms.gle/DYqwvwHXGxERZihD7`) tanpa mewajibkan agent login akun Google di website:

1. **Opsi A (Tanpa Environment Variable / Direct Server-Side `/formResponse`)**: Mengubah pengaturan pengumpulan email pada Google Form dari *"Terverifikasi"* menjadi *"Input responden"* atau *"Jangan kumpulkan"*.
2. **Opsi B (Gateway Google Apps Script `APPS_SCRIPT_URL`)**: Memasang Web App Google Apps Script (`FormApp`) yang berjalan atas nama pemilik formulir sehingga tetap dapat mengirim respons meskipun Google Form mengaktifkan pembatasan *"Terverifikasi"*.

---

## 1. Informasi Google Form Resmi & Pemetaan 7 Kolom

- **Tautan pendek publik:** `https://forms.gle/DYqwvwHXGxERZihD7`
- **Tautan publik (`viewform`):** `https://docs.google.com/forms/d/e/1FAIpQLSeqONvaBzMiA6CtZMFSxnIN3udlFu2Bx9EAma3LN6W78cIWTg/viewform`
- **Endpoint pengiriman server (`formResponse`):** `https://docs.google.com/forms/d/e/1FAIpQLSeqONvaBzMiA6CtZMFSxnIN3udlFu2Bx9EAma3LN6W78cIWTg/formResponse`

| Field Aplikasi | Item ID Google Form | Entry ID (`formResponse`) | Judul Pertanyaan di Google Form | Tipe | Wajib |
| --- | --- | --- | --- | --- | --- |
| `name_code` | `1566074241` | `entry.879620768` | `NAMA DAN KODE AGENT` | `TEXT` | Ya |
| `unit` | `760147080` | `entry.370605340` | `UNIT` (31 Unit Brighton) | `LIST` | Ya |
| `date` | `1829319111` | `entry.934170759` (`_year`, `_month`, `_day`) | `TANGGAL PENGERJAAN ` | `DATE` | Ya |
| `address` (+ `maps`) | `508325269` | `entry.1051884350` | `ALAMAT LENGKAP PENUGASAN (Blok dan Nomor Rumah)` | `PARAGRAPH_TEXT` | Ya |
| `task` | `1176534648` | `entry.902053342` (+ `_sentinel`) | `TUGAS YANG DIBERIKAN  KE MESSENGER` | `CHECKBOX` | Ya |
| `other` (+ `email` & `Ref`) | `1142790665` | `entry.1271873642` | `TUGAS LAINNYA (JIKA TUGAS TIDAK ADA DI LIST ATAS)` | `PARAGRAPH_TEXT` | Opsional |
| `owner` | `1280203260` | `entry.2046702710` (+ `_sentinel`) | `APAKAH SUDAH KONFIRMASI PEMILIK/OWNER` | `CHECKBOX` | Ya |

---

## 2. Mengapa Pengiriman Langsung Sebelumnya Ditolak (`HTTP 401` / `NOT_CONFIGURED`)

1. **Di sisi aplikasi (`route.ts`)**: Sebelumnya `/api/orders` hanya memanggil `bridge()` yang mewajibkan variabel environment `APPS_SCRIPT_URL`. Ketika `APPS_SCRIPT_URL` kosong, server langsung mengembalikan kode `NOT_CONFIGURED` (*"Layanan pengiriman belum aktif pada server"*).
2. **Di sisi Google Form (`1FAIpQLSeqONvaBzMiA6CtZMFSxnIN3udlFu2Bx9EAma3LN6W78cIWTg`)**: Pada pengaturan Google Form saat ini, menu **Setelan (Settings) → Respons (Responses) → Kumpulkan alamat email (Collect email addresses)** diatur ke **"Terverifikasi" (Verified)** (*"Rekam alamat email dengan respons saya"*). Pengaturan ini membuat Google menolak setiap `POST /formResponse` tanpa cookie login akun Google dengan status **`HTTP 401 Unauthorized`**.

Sekarang `/api/orders` mendukung kedua jalur pengiriman secara otomatis dan memverifikasi respons HTML/JSON dari Google sebelum menampilkan **"Pesanan Berhasil Dikirim"**.

---

## 3. Cara Mengaktifkan Pengiriman Otomatis (Pilih Salah Satu)

### Opsi A — Tanpa Variabel Environment (Ubah 1 Pengaturan di Google Form)
Jika Anda ingin aplikasi berjalan langsung di Netlify **tanpa perlu membuat Google Apps Script atau mengisi `APPS_SCRIPT_URL`**:
1. Buka editor Google Form **FORM ORDER SMART MESSENGER BRIGHTON HUB CIBUBUR**.
2. Buka tab **Setelan (Settings)** → klik bagian **Respons (Responses)**.
3. Pada **Kumpulkan alamat email (Collect email addresses)**, ubah dari **Terverifikasi (Verified)** menjadi **Input responden (Responder input)** atau **Jangan kumpulkan (Do not collect)**.
4. Pastikan **Batasi ke 1 respons (Limit to 1 response)** dalam keadaan **Nonaktif (Off)**.
5. Selesai! Server `/api/orders` akan langsung mengirim data ke `/formResponse`, memverifikasi tanda konfirmasi Google Forms (`vHW8K` / `Jawaban Anda telah direkam`), dan menampilkan **"Pesanan Berhasil Dikirim"**.

### Opsi B — Menggunakan Gateway Google Apps Script (`APPS_SCRIPT_URL`)
Jika Anda ingin mempertahankan pengaturan Google Form apa adanya:
1. Dari editor Google Form, klik ikon titik tiga di kanan atas → **Editor skrip (Script editor)** (sebagai *Container-Bound Script* sehingga `FormApp.getActiveForm()` otomatis terhubung tanpa perlu mengisi `FORM_ID`).
2. Buat file `Catalog.gs` (salin isi `/apps-script/Catalog.gs`) dan `Code.gs` (salin isi `/apps-script/Code.gs`).
3. Klik **Deploy** → **New deployment** → pilih jenis **Web app**:
   - **Execute as:** `Me` (akun pemilik/editor Google Form)
   - **Who has access:** `Anyone` (Siapa saja)
4. Salin URL Web App yang berakhiran `/exec` (`https://script.google.com/macros/s/.../exec`).
5. Di **Netlify** → **Site configuration** → **Environment variables**, tambahkan:
   - Key: `APPS_SCRIPT_URL`
   - Value: `https://script.google.com/macros/s/.../exec`
6. Trigger deploy ulang di Netlify.
