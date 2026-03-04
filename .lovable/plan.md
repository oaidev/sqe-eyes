

# Analisis End-to-End & Rencana User Management + RBAC

## Status Fitur Saat Ini

| Fitur | Status | Catatan |
|-------|--------|---------|
| Auth (Login/Register) | ✅ Berfungsi | Login, register, logout bekerja |
| Dashboard | ✅ Berfungsi | Statistik real-time |
| Kelola Pekerja | ✅ Berfungsi | CRUD + CSV import + face enrollment |
| Zona & Kamera | ✅ Berfungsi | CRUD zona dan kamera |
| Aturan APD | ✅ Berfungsi | Matriks toggle per zona |
| Aturan Akses | ✅ Berfungsi | CRUD aturan akses zona |
| Live Kamera | ✅ Berfungsi | Grid kamera + simulasi deteksi |
| Event Terkini | ✅ Berfungsi | Realtime + detail APD |
| Inbox Alert | ✅ Berfungsi | Filter, teruskan, catatan |
| Validasi Alert | ✅ Berfungsi | Form validasi supervisor |
| Izin Keluar | ✅ Berfungsi | Buat + approve/reject |
| Laporan Kepatuhan | ✅ Berfungsi | Chart bar + pie |
| Rekap Pelanggaran | ✅ Berfungsi | Group by worker |
| Ekspor Laporan | ⚠️ Parsial | Hanya insert record, tidak generate file |
| **Kelola Pengguna** | ❌ Tidak ada | Tidak ada halaman user management |
| **CRUD Role** | ❌ Tidak ada | Tidak ada UI assign/ubah/hapus role |
| **Route Protection** | ❌ Tidak ada | Semua halaman bisa diakses via URL langsung |
| **Permission per Menu** | ❌ Tidak ada | Sidebar filter saja, halaman tidak cek role |

## Yang Perlu Dibangun

### 1. Halaman "Kelola Pengguna" (`/users`)
Halaman admin-only untuk:
- **Daftar semua user** — email, nama, role, status (dari `profiles` + `user_roles`)
- **Invite user baru** — form email + role, panggil `supabase.auth.admin.inviteUserByEmail()` via edge function (karena admin API tidak bisa dipanggil dari client)
- **Ubah role** — dropdown ganti role (admin/operator/supervisor/safety_manager)
- **Hapus user** — soft-delete atau remove dari sistem via edge function
- **Tampilkan user tanpa role** — highlight user yang belum di-assign role

### 2. Edge Function `manage-users`
Diperlukan karena operasi admin (invite, delete user, list users) membutuhkan `service_role_key`:
- `POST /invite` — invite user by email + assign role
- `POST /update-role` — update role user
- `POST /delete-user` — delete user dari auth + cleanup
- `GET /list` — list semua user dengan profile & role

### 3. Role-Based Route Protection
Saat ini sidebar menyembunyikan menu, tapi user bisa ketik URL langsung dan tetap masuk. Perlu:
- Komponen `<ProtectedRoute roles={['admin']}>` yang wrap halaman
- Redirect ke dashboard jika role tidak sesuai
- Tambahkan di setiap route di `App.tsx`

### 4. Permission Granular per Menu (View/Edit/Delete)
Definisi permission matrix di kode:

```text
Menu                  | admin | operator | supervisor | safety_manager
──────────────────────|───────|──────────|────────────|───────────────
Dashboard             | view  | view     | view       | view
Kelola Pekerja        | full  | —        | —          | —
Zona & Kamera         | full  | —        | —          | —
Aturan APD            | full  | —        | —          | —
Aturan Akses          | full  | —        | —          | —
Kelola Pengguna       | full  | —        | —          | —
Live Kamera           | full  | view     | —          | —
Event Terkini         | full  | view     | —          | —
Inbox Alert           | full  | edit     | —          | —
Validasi Alert        | full  | —        | edit       | —
Izin Keluar           | full  | —        | edit       | —
Laporan Kepatuhan     | view  | —        | —          | view
Rekap Pelanggaran     | view  | —        | —          | view
Ekspor Laporan        | full  | —        | —          | edit
```

### File yang Diubah/Dibuat

1. **`supabase/functions/manage-users/index.ts`** — Edge function baru untuk admin user operations
2. **`src/pages/Users.tsx`** — Halaman baru kelola pengguna
3. **`src/components/layout/ProtectedRoute.tsx`** — Komponen route guard
4. **`src/App.tsx`** — Tambah route `/users` + wrap semua route dengan ProtectedRoute
5. **`src/components/layout/AppSidebar.tsx`** — Tambah menu "Kelola Pengguna"
6. **`src/lib/permissions.ts`** — Permission matrix & helper `canAccess(role, page, action)`
7. **Database migration** — Update RLS policy pada `profiles` agar admin bisa lihat semua profile

### Alur Invite User
1. Admin buka `/users` → klik "Invite User"
2. Isi email + pilih role → panggil edge function `manage-users/invite`
3. Edge function: `supabase.auth.admin.inviteUserByEmail()` + insert ke `user_roles`
4. User terima email → klik link → set password → login dengan role yang sudah di-assign

