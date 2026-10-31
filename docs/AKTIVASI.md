# Panduan Aktivasi & Deployment Google Apps Script + Netlify (Smart Messenger V2)

Dokumen ini menjelaskan langkah-langkah menghubungkan aplikasi web **Form Order Smart Messenger Brighton HUB Cibubur V2** secara langsung ke Google Form resmi menggunakan **Google Apps Script (`FormApp`)** dan men-deploy aplikasi ke **Netlify** hanya dengan 1 variabel environment (`APPS_SCRIPT_URL`).

---

## 1. Informasi Google Form Resmi

- **Tautan pendek publik:** `https://forms.gle/DYqwvwHXGxERZihD7`
- **Tautan publik (`viewform`):** `https://docs.google.com/forms/d/e/1FAIpQLSeqONvaBzMiA6CtZMFSxnIN3udlFu2Bx9EAma3LN6W78cIWTg/viewform`
- **Catatan Penting ID Form:**
  - String `1FAIpQLSeqONvaBzMiA6CtZMFSxnIN3udlFu2Bx9EAma3LN6W78cIWTg` adalah **Public Responder ID** (`/forms/d/e/.../viewform`).
  - `FormApp.openById()` pada Google Apps Script **wajib** menggunakan **Internal Editor Form ID** dari URL editor (`/forms/d/<INTERNAL_FORM_ID>/edit`) atau dipasang langsung sebagai *Bound Script* di dalam Google Form tersebut.
  - Fungsi `openForm_()` di `apps-script/Code.gs` secara otomatis menolak ID publik `1FAIpQL...` dengan kode `PUBLIC_FORM_ID_NOT_ALLOWED` agar tidak terjadi kesalahan konfigurasi.

### Pemetaan 7 Pertanyaan Google Form (`DEFAULT_ITEM_MAP` di `apps-script/Code.gs`)

| Field Aplikasi | Item ID Google Form | Entry ID (`viewform`) | Judul Pertanyaan di Google Form | Tipe | Wajib |
| --- | --- | --- | --- | --- | --- |
| `name_code` | `1566074241` | `entry.879620768` | `NAMA DAN KODE AGENT` | `TEXT` | Ya |
| `unit` | `760147080` | `entry.370605340` | `UNIT` (31 Unit Brighton) | `LIST` | Ya |
| `date` | `1829319111` | `entry.934170759` | `TANGGAL PENGERJAAN ` | `DATE` | Ya |
| `address` (+ `maps`) | `508325269` | `entry.1051884350` | `ALAMAT LENGKAP PENUGASAN (Blok dan Nomor Rumah)` | `PARAGRAPH_TEXT` | Ya |
| `task` | `1176534648` | `entry.902053342` | `TUGAS YANG DIBERIKAN  KE MESSENGER` | `CHECKBOX` | Ya |
| `other` (+ `email` & `id`) | `1142790665` | `entry.1271873642` | `TUGAS LAINNYA (JIKA TUGAS TIDAK ADA DI LIST ATAS)` | `PARAGRAPH_TEXT` | Opsional |
| `owner` | `1280203260` | `entry.2046702710` | `APAKAH SUDAH KONFIRMASI PEMILIK/OWNER` | `CHECKBOX` | Ya |

---

## 2. Langkah Deployment Google Apps Script

1. **Buka Editor Google Form** menggunakan akun Google pemilik/editor formulir:
   - Cara A (*Container-Bound*, paling mudah): Dari tampilan editor Google Form, klik ikon titik tiga di kanan atas → **Script editor (Editor skrip)**. Anda tidak perlu mengisi `FORM_ID` karena skrip otomatis memanggil `FormApp.getActiveForm()`.
   - Cara B (*Standalone Script*): Buka `https://script.google.com`, buat project baru, lalu salin **Internal Form ID** dari bilah alamat editor Google Form:
     `https://docs.google.com/forms/d/<INTERNAL_FORM_ID>/edit`
2. **Salin Kode Apps Script**:
   - Buat file `Catalog.gs` dan tempel isi dari `/apps-script/Catalog.gs`.
   - Buka file `Code.gs` dan tempel isi dari `/apps-script/Code.gs`.
   - (Opsional) Buat file `Diagnose.gs` dan tempel isi dari `/apps-script/Diagnose.gs`.
3. **Atur Zona Waktu Project**:
   - Buka **Project Settings (Setelan Proyek)** → pastikan **Time zone** diatur ke `Asia/Jakarta` (atau aktifkan *Show "appsscript.json" manifest file in editor* dan salin `/apps-script/appsscript.json`).
4. **Isi Script Properties (Jika Menggunakan Cara B / Standalone)**:
   - Di **Project Settings** → **Script Properties**, tambahkan:
     - Property: `FORM_ID`
     - Value: `<INTERNAL_FORM_ID>` (ID dari URL `/forms/d/<INTERNAL_FORM_ID>/edit`, **bukan** `1FAIpQL...`).
5. **Uji Konfigurasi di Editor Apps Script**:
   - Pilih fungsi `diagnoseWebsiteIntegration` atau `validateSetup` di toolbar atas, lalu klik **Run**.
   - Setujui izin akses Google Forms saat diminta.
   - Pastikan Execution Log menampilkan bahwa seluruh 31 unit dan 9 layanan valid.
6. **Deploy sebagai Web App**:
   - Klik **Deploy** → **New deployment**.
   - Pilih jenis **Web app**.
   - **Execute as:** `Me` (akun pemilik/editor Google Form).
   - **Who has access:** `Anyone` (Siapa saja — wajib agar server Next.js/Netlify dapat mengirim data tanpa memaksa agent login Google).
   - Klik **Deploy** dan salin **Web App URL** yang berakhiran `/exec`:
     `https://script.google.com/macros/s/.../exec`

---

## 3. Konfigurasi Variabel Environment (`.env.local` & Netlify)

Aplikasi ini telah disederhanakan sehingga hanya membutuhkan **satu** variabel environment:

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/ GANTI_DENGAN_DEPLOYMENT_ID /exec
```

Variabel lama yang tidak diperlukan (`ADMIN_ACCESS_TOKEN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `APPS_SCRIPT_SECRET`, `APP_ORIGIN`) telah dihapus dari alur pengiriman pesanan standar.

### Pengaturan di Netlify:
1. Buka dashboard site di **Netlify** → **Site configuration** → **Environment variables**.
2. Tambahkan variabel:
   - Key: `APPS_SCRIPT_URL`
   - Value: `https://script.google.com/macros/s/.../exec`
3. Trigger deploy ulang (**Deploy site**). Route `/api/orders` akan berjalan sebagai fungsi serverless yang memvalidasi data, mencegah duplikasi berdasarkan ID pengajuan unik (`id`), menerapkan pembatasan laju (*rate limit*), dan meneruskan pesanan ke Google Form melalui `APPS_SCRIPT_URL`.
