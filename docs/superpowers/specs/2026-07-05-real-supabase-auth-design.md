# Real Supabase Auth for ProspectFlow CRM

## Context

ProspectFlow CRM sudah membaca data runtime dari Supabase, tetapi pengalaman login masih gagal dan UI masih terasa demo. Investigasi menunjukkan penyebab utamanya bukan fallback data lokal, melainkan `auth.users` kosong sehingga `profiles.auth_user_id` tidak pernah terhubung. Akibatnya `signInWithPassword` gagal, `getSession()` tidak pernah mendapat profile, dan beberapa bagian UI tetap menampilkan wording seperti `demo mode`, `Demo fallback`, dan `Seeded from Combined Database`.

Tujuan perubahan ini adalah mengubah aplikasi dari pengalaman “seeded demo-ish” menjadi flow login Supabase yang benar-benar operasional, sambil tetap mempertahankan seed database sebagai data awal operasional.

## Scope

Perubahan ini mencakup:

1. Membuat 4 akun Supabase Auth untuk profile seed yang sudah ada:
   - `admin@prospectflow.app`
   - `budi@prospectflow.app`
   - `citra@prospectflow.app`
   - `dimas@prospectflow.app`
2. Menghubungkan setiap akun auth ke `profiles.auth_user_id`
3. Menggunakan satu password sementara yang sama untuk keempat akun
4. Menghapus wording demo dari UI utama
5. Mempertahankan seed sebagai initial operational data, bukan demo mode

Perubahan ini tidak mencakup:

- flow force-reset password saat first login
- invite email / magic link
- self-service registration
- refactor besar pada data layer

## Recommended Approach

### Approach A — Auth bootstrap + UI cleanup (Recommended)

Gunakan Supabase Auth sebagai source of truth untuk login, lalu link ke `profiles` untuk role/scoping. Seed data tetap dipakai sebagai baseline awal, tetapi semua surface UI yang saat ini menyebut demo diubah menjadi copy operasional.

**Kelebihan:**
- paling cepat mengaktifkan login real
- tidak mengubah arsitektur data layer utama
- tetap sesuai kebutuhan user: bukan demo lagi

**Kekurangan:**
- seed tetap ada sebagai data awal, jadi ini adalah production bootstrap, bukan fresh-empty production

### Approach B — Auth bootstrap + production-empty UX

Selain auth bootstrap, kosongkan atau reset sebagian seed agar aplikasi terasa seperti produksi baru.

**Kelebihan:** lebih “bersih” secara produk

**Kekurangan:** scope lebih besar, perlu empty-state UX baru, dan berisiko menghapus baseline data yang justru masih dibutuhkan

### Approach C — Manual auth provisioning only

Biarkan login real dibangun lewat Supabase dashboard/manual, dan hanya bersihkan UI wording demo.

**Kelebihan:** implementasi kode lebih kecil

**Kekurangan:** tidak menyelesaikan masalah utama karena login tetap belum usable tanpa langkah manual eksternal

## Chosen Design

### 1. Auth bootstrap model

Aplikasi akan memakai model identitas dua lapis:

- `auth.users` = credential identity
- `profiles` = business identity / role / scoped sales identity

Flow login tetap seperti sekarang:

1. user submit email/password di login form
2. `/api/auth/login` memanggil `supabase.auth.signInWithPassword`
3. session cookie ditulis oleh Supabase SSR client
4. `getSession()` membaca current user dari auth session
5. profile di-resolve lewat `profiles.auth_user_id = auth.users.id`
6. role/scoping tetap berasal dari `profiles`

Bootstrap akan membuat 4 akun auth untuk profile seed yang ada, lalu menghubungkan `auth_user_id` masing-masing.

### 2. Password policy for bootstrap

Untuk bootstrap awal:
- semua akun seed memakai satu temporary password yang sama
- password ini dibuat otomatis sekali saat provisioning
- tidak ada force-reset flow di fase ini

Ini menjaga scope tetap kecil dan cukup untuk membuka akses awal ke sistem.

### 3. UI/copy cleanup

Beberapa wording saat ini salah memberi kesan bahwa aplikasi masih demo. Copy akan diubah menjadi operasional:

- `Not signed in / demo mode` → copy netral yang menunjukkan user belum login
- `115 verified prospects seeded from your research workbook` → copy operasional yang tidak menyebut demo sebagai identitas app
- `Seeded dari Combined Database` → helper KPI yang netral / business-facing
- `Demo fallback` di settings → status koneksi yang akurat terhadap Supabase/auth/storage
- deskripsi lain yang menyebut demo akan dibersihkan bila muncul pada surface utama

Prinsipnya: seed boleh tetap ada, tetapi narasi produk tidak lagi menyebut app ini sebagai demo.

### 4. Data layer behavior

Data layer utama di `src/lib/data/queries.ts` tetap dipertahankan karena saat ini sudah langsung membaca dari Supabase. Tidak perlu mengembalikan fallback lokal.

Perubahan yang dibutuhkan fokus pada:
- memastikan auth mapping benar
- memastikan current session menghasilkan profile
- memastikan sales scoping bekerja setelah profile linked

### 5. Provisioning strategy

Provisioning akun seed sebaiknya bersifat idempotent:
- jika user auth belum ada, buat
- jika profile belum linked, update `auth_user_id`
- jika user sudah ada dan email cocok, gunakan user yang ada lalu link profile

Dengan begitu bootstrap aman dijalankan sekali pada project ini tanpa mengandalkan dashboard manual.

### 6. Verification

Perubahan dianggap benar jika:

1. keempat akun auth berhasil dibuat
2. `profiles.auth_user_id` untuk `sales-1..sales-4` terisi
3. login dengan salah satu akun seed berhasil
4. app shell tidak lagi menampilkan `demo mode`
5. settings/dashboard tidak lagi memakai wording demo sebagai identitas sistem
6. halaman utama membaca data dari Supabase seperti sebelumnya
7. scoping sales tetap mengikuti profile linked

## Critical Files

- `src/app/api/auth/login/route.ts`
- `src/lib/auth/server.ts`
- `src/lib/data/queries.ts`
- `src/components/app-shell.tsx`
- `src/app/settings/page.tsx`
- `src/app/page.tsx`
- `supabase/seed.sql` (sebagai referensi identity source)
- script/bootstrap baru untuk provisioning auth users + profile links

## Constraints

- Jangan reintroduce demo fallback runtime
- Jangan tambah self-signup flow
- Jangan tambah force-reset password flow
- Pertahankan role model `Admin | Sales`
- Pertahankan seed data sebagai initial operational dataset
