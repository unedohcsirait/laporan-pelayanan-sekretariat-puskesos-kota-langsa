# Panduan Deployment ke Vercel

Panduan langkah demi langkah untuk mengunggah project ini ke Vercel.

## 1. Persiapan Repository

Project ini sudah dikonfigurasi untuk Vercel. Anda hanya perlu memastikan semua perubahan sudah di-push ke GitHub.

1. Buka terminal di folder project
2. Jalankan perintah berikut untuk meng-update repository:
   ```bash
   git add .
   git commit -m "siap deploy ke vercel"
   git push
   ```

## 2. Setup Vercel

1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Klik tombol **Add New...** -> **Project**
3. Di bagian **Import Git Repository**, cari repo project Anda (misal: `laporan-pelayanan-sekretariat-puskesos-kota-langsa`)
4. Klik **Import**

## 3. Konfigurasi Environment Variables

Sebelum klik Deploy, Anda **WAJIB** menambahkan Environment Variables agar database dan fitur login bisa berjalan.

Di halaman konfigurasi "Configure Project":

1. Buka bagian **Environment Variables**
2. Tambahkan variable berikut (copy dari file `.env` di komputer Anda):

| Key | Value | Keterangan |
|-----|-------|------------|
| `DATABASE_URL` | `postgresql://...` | URL koneksi database Neon Anda |
| `SESSION_SECRET` | `rahasia_acak_panjang` | String acak untuk enkripsi session (bisa isi apa saja, minimal 32 karakter) |
| `NODE_ENV` | `production` | Mode produksi |

## 4. Deploy

1. Klik tombol **Deploy**
2. Tunggu proses build selesai (biasanya 1-2 menit)
3. Setelah selesai, Anda akan mendapatkan URL project (misal: `https://laporan-otomatis.vercel.app`)

## Catatan Penting

- Project ini menggunakan **Vercel Serverless Functions** untuk backend Express.
- **Database:** Menggunakan Neon (PostgreSQL) yang cloud-based, jadi data aman tersimpan meski Vercel merestart server.
- **Session:** Karena Vercel bersifat *serverless* (stateless), login session disimpan di database PostgreSQL (tabel `session`). Ini sudah dikonfigurasi otomatis.

## Troubleshooting

Jika login gagal atau ada error:
- Cek tab **Logs** di dashboard Vercel project Anda.
- Pastikan `DATABASE_URL` benar dan bisa diakses dari luar.
