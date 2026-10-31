# Panduan deployment bertahap

## Uji lokal Checkpoint A

`npm ci` → `npm run dev`. Tidak perlu Supabase. Jangan memasukkan data nyata ke pratinjau.

## GitHub dan Netlify

1. Buat repositori terpisah, misalnya `brighton-smart-messenger`. Jangan mengganti proyek dashboard Streamlit yang sudah ada.
2. Dari root proyek: `git init`, `git add .`, `git commit -m "feat: checkpoint A smart messenger"`. Hubungkan remote repositori yang Anda miliki dan push. Periksa `.gitignore` sebelum push.
3. Di Netlify, impor repositori GitHub tersebut. Build command: `npm run build`; publish directory: `.next`; Node: 22. Konfigurasi yang sama tersedia di `netlify.toml`.
4. Gunakan deteksi runtime Next.js bawaan/adapter OpenNext Netlify. Jangan mengubah ke static export: tahap berikutnya membutuhkan auth dan server routes.
5. Uji ulang semua URL dan build log. Paket ini belum pernah dideploy ke akun Netlify Anda. Deploy tahap A hanya pratinjau tanpa backend dan belum layak menerima pesanan.

## Supabase (tahap B; belum aktif di source A)

1. Buat proyek di akun pengelola. Simpan URL proyek dan publishable key dalam `.env.local` saat pengembangan; simpan konfigurasi deployment di Netlify environment variables.
2. Publishable key bukan pengganti RLS. Service role/secret key tidak boleh menggunakan prefix NEXT_PUBLIC_, berada di browser, atau masuk git. Aplikasi tidak membutuhkan secret tersebut pada tahap A.
3. Setelah migration B tersedia, jalankan migration dan seed; uji RLS/grants sebelum menghubungkan halaman operasional. Migration belum disediakan dalam paket A.
4. Konfigurasi Auth Site URL dan daftar redirect URL spesifik untuk localhost dan domain produksi yang sebenarnya. Hindari wildcard lebar.
5. Untuk Google OAuth, ikuti dokumentasi provider Supabase dan gunakan callback URL yang diberikan dashboard Supabase pada Google Cloud Console. Client ID/secret provider disimpan di konfigurasi Auth Supabase; jangan ditulis di frontend.
6. Untuk email OTP, konfigurasi template, provider email dan pembatasan permintaan; cek pengiriman, kedaluwarsa, dan sesi. Route callback aplikasi diimplementasikan pada tahap B; belum tersedia sekarang.
7. Storage harus private, policies dan otorisasi signed URL diuji untuk agent A/B, messenger, admin. Jangan mengaktifkan upload publik sebagai jalan pintas.

## Rujukan resmi

- https://nextjs.org/docs/app/getting-started/installation
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/auth/social-login/auth-google

Halaman Next.js dan Netlify diperiksa saat menyusun tahap A. Konfigurasi rinci Supabase harus ditinjau kembali saat implementasi B.
