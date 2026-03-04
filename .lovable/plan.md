

# Implementasi: Fix Invite User + Cleanup Simulasi + Auth Text

## 1. Fix Invite User (`supabase/functions/manage-users/index.ts`)
- Ganti `inviteUserByEmail` → `adminClient.auth.admin.createUser({ email, password: tempPassword, email_confirm: true, user_metadata: { full_name } })`
- Generate random 12-char temp password
- Return `{ success: true, user_id, temp_password }` ke frontend

## 2. Tampilkan Temp Password (`src/pages/Users.tsx`)
- Tambah state `createdCredentials: { email: string; password: string } | null`
- Setelah invite sukses, simpan credentials dari response dan tampilkan dialog dengan:
  - Email + temporary password
  - Tombol "Salin Password"
  - Instruksi: "Berikan kredensial ini ke pengguna"

## 3. Hapus Pilih Kamera di Simulasi (`src/pages/Simulate.tsx`)
- Hapus query `cameras`, state `selectedCamera`
- Hapus dropdown kamera (line 160-173)
- Ubah `runDetection`: hapus validasi `selectedCamera`, kirim tanpa `camera_id`
- Hapus `selectedCamera` dari dependency array

## 4. Tambah "Lupa Password" di Auth (`src/pages/Auth.tsx`)
- Tambah teks "Lupa password? Silakan hubungi Admin." di bawah tombol Masuk

## File yang diubah
- `supabase/functions/manage-users/index.ts`
- `src/pages/Users.tsx`
- `src/pages/Simulate.tsx`
- `src/pages/Auth.tsx`

