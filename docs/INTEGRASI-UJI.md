# Integrasi uji — 18 Oktober 2026

Form uji: 1_dMmWuWctF8YWSNmud7SdSjtQCx5Yu8rm7mTGRFVuKU
Ledger uji: 12qlnQg3-s9W8bBRqVAyz7Mv6ixkUmPbE3qg9hrb1hvE

Log pengguna menunjukkan SMOKE-TEST-002 SYNCED dan pemeriksaan ulang mengembalikan ID respons yang sama. Ini hanya pengujian helper manual ke Google Form, bukan pengujian gateway produksi atau Next.js. Gateway mendukung CHECKBOX untuk owner dan task; 29 tes lokal lulus termasuk array YA/TIDAK. Integrasi HTTP, Turnstile, notifikasi, worker, dan formulir resmi belum diuji langsung.

## Pasang dalam proyek Apps Script yang sama
1. Pertahankan fungsi setup/pengujian lama. Tambahkan file Gateway.gs dan salin seluruh apps-script/Code.gs ke dalamnya. Jangan menempel kode gateway dua kali.
2. Tambahkan Catalog.gs dari apps-script/Catalog.gs.
3. Aktifkan tampilan appsscript.json pada Setelan proyek, kemudian gunakan isi apps-script/appsscript.json. Zona waktu harus Asia/Jakarta.
4. Script Properties FORM_ID, LEDGER_SPREADSHEET_ID dan ITEM_MAP_JSON sudah dibuat pada langkah sebelumnya. Jangan hapus. item-map.test.json hanya cadangan mapping untuk salinan uji, tidak untuk formulir resmi.
5. Buat secret lokal dengan Node: node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))". Simpan hasil secara pribadi sebagai APPS_SCRIPT_SECRET. Nilai yang sama diperlukan pada backend Next.js; jangan taruh di NEXT_PUBLIC atau kirim lewat chat.
6. Untuk uji email manual, set PUBLIC_EMAIL_POLICY_APPROVED=true. Email website merupakan isian sendiri, bukan identitas Google terverifikasi. Kebijakan produksi perlu disetujui pemilik formulir.
7. NOTIFY_EMAIL_TO dikosongkan dan WHATSAPP_ENABLED=false selama uji awal.
8. Jalankan setupLedger lalu validateSetup. Keduanya tidak mengirim respons. Jangan installWorker atau deploy sampai pemeriksaan selesai.

File Submissions dan Audit dipakai gateway. IntegrationTest hanya dipakai helper pengujian manual; jangan pindahkan barisnya ke Submissions.
