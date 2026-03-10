

## 10 Perbaikan: Zona, Pengguna, Role, Dashboard & Deteksi

### Files to modify
- `src/pages/Zones.tsx` — poin 1, 2, 3
- `src/pages/Users.tsx` — poin 2, 4, 5
- `src/pages/Roles.tsx` — poin 6, 10
- `src/pages/Index.tsx` — poin 7
- `src/pages/Workers.tsx` — poin 9
- `supabase/functions/detect-event/index.ts` — poin 8

---

### 1. Nama Kamera & RTSP URL wajib di tambah kamera
**Zones.tsx baris 363**: Ubah disabled condition dari `!camForm.name` → `!camForm.name || !camForm.rtsp_url`

### 2. Tanda * merah pada semua field wajib
- **Zones.tsx**: Tambah `<span className="text-destructive">*</span>` pada Label Nama Kamera (baris 275), RTSP URL (baris 276), Nama Zona (baris 260)
- **Users.tsx**: Tambah asterisk pada Label Email (baris 164), Role (baris 167). Nama Lengkap jadi wajib (poin 5)

### 3. Karakter max + counter pada form Zona & Kamera
- Nama Kamera: `maxLength={100}` + counter `{camForm.name.length}/100`
- RTSP URL: `maxLength={500}` + counter `{camForm.rtsp_url.length}/500`
- Nama Zona: `maxLength={100}` + counter `{zoneForm.name.length}/100`
- Deskripsi Zona: `maxLength={250}` + counter `{zoneForm.description.length}/250`, ubah ke Textarea jika mau tapi bisa tetap Input

### 4. Role di tabel pengguna → Uppercase first character
**Users.tsx baris 142**: Ubah `{u.role || 'Belum ada role'}` → `{u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Belum ada role'}`

### 5. Nama Lengkap wajib, max 100 karakter
**Users.tsx baris 165**: 
- Ubah label dari "Nama Lengkap (opsional)" → "Nama Lengkap" + asterisk merah
- Tambah `maxLength={100}` pada Input
- Tambah counter `{inviteFullName.length}/100`
- Ubah disabled button (baris 176): tambah `|| !inviteFullName`

### 6 & 10. Kelola Role — hide toggle yang tidak berlaku
**Roles.tsx**: Definisi config per page tentang toggle mana yang tersedia:
```tsx
const PAGE_TOGGLE_CONFIG: Record<string, { edit: boolean; delete: boolean }> = {
  dashboard: { edit: false, delete: false },
  workers: { edit: true, delete: true },
  zones: { edit: true, delete: true },
  users: { edit: true, delete: true },
  roles: { edit: true, delete: true },
  simulate: { edit: true, delete: false },
  'operator-validation': { edit: true, delete: false },
  'supervisor-validation': { edit: true, delete: false },
};
```
Di render: jika config `edit: false`, tampilkan `—` bukan Switch. Sama untuk delete.

### 7. Dashboard: Zona Aktif = zona dengan kamera aktif
**Index.tsx baris 35-38**: Ganti query dari count zones aktif → query zones yang punya minimal 1 kamera aktif:
```tsx
queryFn: async () => {
  const { data } = await supabase.from('cameras').select('zone_id').eq('is_active', true);
  const uniqueZones = new Set((data || []).map(c => c.zone_id));
  return uniqueZones.size;
},
```

### 8. Unknown person → deteksi berdasarkan general PPE rules
**detect-event/index.ts baris 360**: Ubah dari:
```ts
if (!person.workerInfo) return true;
```
menjadi:
```ts
if (!person.workerInfo) return !rule.jabatan;
```
Ini memastikan orang tidak dikenal hanya dievaluasi dengan rules general (jabatan=null), bukan semua rules termasuk jabatan-spesifik.

Tambah juga logic untuk known worker yang jabatannya tidak ada di rules spesifik — sudah benar di kode saat ini (hanya general yang apply).

### 9. Counter nama di Workers konsisten
**Workers.tsx baris 294 dan 300**: Sudah dalam format `{count}/100` text-right. Pastikan tidak ada helper text tambahan selain counter. Kode saat ini sudah benar — akan di-review dan dipastikan konsisten.

