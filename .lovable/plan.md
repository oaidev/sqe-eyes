

# Pasang Logo Official & Selaraskan Warna/Style

## Analisis Logo
Logo SQE Eyes menggunakan warna:
- **Biru utama**: ~`#0066CC` (lingkaran besar)
- **Biru gelap**: ~`#003366` (teks "SQE EYES")
- **Merah**: ~`#CC0000` (pupil/core)
- **Biru muda**: ~`#4DA6FF` (pixel squares)

Font: Sans-serif bold, all-caps untuk "SQE EYES"

## Perubahan

### 1. Copy logo ke project
- Copy `user-uploads://logo_eye_3@3x.png` → `src/assets/logo.png`

### 2. Pasang logo di 3 tempat
- **Auth page** (`src/pages/Auth.tsx`): Ganti Shield icon dengan `<img>` logo
- **Sidebar header** (`src/components/layout/AppSidebar.tsx`): Ganti Shield icon dengan logo kecil
- **Loading states** (AppLayout, ProtectedRoute, Auth): Gunakan logo sebagai loading indicator

### 3. Selaraskan warna dengan logo
Update CSS variables di `src/index.css`:
- `--primary`: Ubah ke biru logo `213 100% 40%` (dari `213 70% 45%`)
- `--sidebar-background`: Gelap biru tua selaras dengan logo `215 50% 12%`
- `--sidebar-primary`: Biru logo terang
- `--ring`: Match primary

### 4. Konsistensi loading state
Saat ini ada 3 pola loading berbeda:
- Auth: `<Loader2 className="h-8 w-8 animate-spin text-primary" />`
- AppLayout: `<Loader2 className="h-8 w-8 animate-spin text-primary" />`
- ProtectedRoute: `<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />`
- Table loading: `<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />`

**Standarisasi**: Buat komponen `LoadingScreen` yang menampilkan logo + spinner, digunakan di semua full-page loading. Table loading tetap pakai inline Loader2.

### 5. NotFound page
Tambahkan logo dan selaraskan style dengan halaman Auth.

### File yang diubah/dibuat
1. `src/assets/logo.png` — copy logo
2. `src/components/ui/LoadingScreen.tsx` — komponen loading reusable dengan logo
3. `src/index.css` — update warna primary selaras logo
4. `src/pages/Auth.tsx` — ganti Shield dengan logo image
5. `src/components/layout/AppSidebar.tsx` — ganti Shield dengan logo image
6. `src/components/layout/AppLayout.tsx` — gunakan LoadingScreen
7. `src/components/layout/ProtectedRoute.tsx` — gunakan LoadingScreen
8. `src/pages/NotFound.tsx` — tambah logo + style konsisten

