# Panduan Deploy Suara Cerdas

## Stack
- **Frontend + Backend**: Next.js 14 (App Router)
- **Database + Auth Storage**: Supabase
- **Hosting**: Vercel
- **AI TTS**: Google Gemini API
- **Payment**: Manual transfer (konfirmasi admin)

---

## STEP 1: Setup Supabase (15 menit)

1. Buka https://supabase.com → Create New Project
2. Catat: Project URL dan API Keys (Settings → API)
3. Buka SQL Editor → paste isi file `supabase-schema.sql` → Run
4. Buat Storage bucket:
   - Storage → New Bucket
   - Nama: `transfer-proofs`
   - Public: YES (agar admin bisa lihat bukti)
5. Update admin account:
   ```sql
   -- Generate hash password dulu di terminal:
   -- node -e "const b=require('bcryptjs'); b.hash('PasswordAdmin123!',10).then(console.log)"
   
   UPDATE public.users 
   SET password_hash = 'HASIL_HASH_BCRYPT'
   WHERE email = 'admin@suaracerdas.com';
   ```

---

## STEP 2: Setup Gemini API Key (5 menit)

1. Buka https://aistudio.google.com/app/apikey
2. Create API Key
3. Simpan key (format: AIzaSy...)
4. Masukkan ke Settings admin setelah deploy

---

## STEP 3: Deploy ke Vercel (10 menit)

### Opsi A: Via GitHub (Rekomendasi)
```bash
# Di folder proyek
git init
git add .
git commit -m "Initial commit: Suara Cerdas"
git remote add origin https://github.com/USERNAME/suara-cerdas.git
git push -u origin main
```
→ Buka vercel.com → Import from GitHub → Pilih repo

### Opsi B: Via Vercel CLI
```bash
npm install -g vercel
vercel --prod
```

### Environment Variables di Vercel
Buka Project Settings → Environment Variables, tambahkan:

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJxxx...
SUPABASE_SERVICE_ROLE_KEY       = eyJxxx...
JWT_SECRET                      = [random 32+ karakter, bisa generate di: https://generate-secret.vercel.app/32]
GEMINI_API_KEY                  = AIzaSy...
NEXT_PUBLIC_APP_URL             = https://nama-app.vercel.app
```

---

## STEP 4: Konfigurasi Setelah Deploy (5 menit)

1. Login sebagai admin: `admin@suaracerdas.com`
2. Buka tab **Pengaturan**
3. Isi:
   - Rekening bank transfer
   - WhatsApp admin (format: 628xxx)
   - Gemini API Key
   - Harga lifetime (89000)

---

## Alur Member

```
Daftar → Lihat Info Bank → Transfer → Upload Bukti
  → Admin Konfirmasi → Akun Aktif → Bisa Generate
```

---

## Biaya Operasional Bulanan (estimasi)

| Item                        | Biaya/bulan |
|-----------------------------|-------------|
| Vercel Pro (jika perlu)     | ~Rp 340.000 |
| Supabase Free (s/d 500 MB)  | Gratis      |
| Supabase Pro (jika >500 MB) | ~Rp 385.000 |
| Domain .com                 | ~Rp 17.000  |
| Gemini API (200 member, 12x/hari, 400 char) | ~Rp 77.000 |

**Total: ±Rp 420.000 - Rp 820.000/bulan**

Dengan 200 member @89.000 = **Rp 17.800.000 pendapatan** (one-time)
Setelah bulan pertama, pendapatan = dari member baru saja.

---

## Maintenance Rutin

- Cek `pending payments` setiap hari (notif WA dari member)
- Monitor usage via tab Statistik
- Kuota Gemini API via console.cloud.google.com

---

## Backup Database

Supabase otomatis backup harian (plan Pro) atau mingguan (Free).
Manual backup: Database → Backups di dashboard Supabase.
