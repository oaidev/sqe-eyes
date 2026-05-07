## Toggle Bahasa ID ↔ EN (Full i18n)

### Pendekatan
Gunakan **react-i18next** dengan `i18next-browser-languagedetector` (localStorage). Default: Indonesian. Toggle switch di header (kanan atas).

### File baru
- `src/i18n/index.ts` — inisialisasi i18next, detector localStorage, fallback `id`
- `src/i18n/locales/id.json` — semua string ID (key per halaman: `common`, `sidebar`, `auth`, `dashboard`, `workers`, `zones`, `users`, `roles`, `simulate`, `validation`, `toast`)
- `src/i18n/locales/en.json` — terjemahan EN
- `src/components/layout/LanguageToggle.tsx` — switch ID/EN dengan icon Languages, update `i18n.changeLanguage()` + persist localStorage

### File yang dimodifikasi
- `src/main.tsx` — import `./i18n`
- `src/components/layout/AppLayout.tsx` — tambah `<LanguageToggle />` di header (kanan, sebelum/ di area kanan header)
- `src/pages/Auth.tsx` — Auth tidak pakai AppLayout, tambah toggle terpisah di pojok kanan atas
- Semua halaman & komponen yang punya teks hardcoded:
  - `src/pages/Auth.tsx`, `Index.tsx`, `Workers.tsx`, `Zones.tsx`, `Users.tsx`, `Roles.tsx`, `Simulate.tsx`, `OperatorValidation.tsx`, `SupervisorValidation.tsx`, `NotFound.tsx`
  - `src/components/layout/AppSidebar.tsx` (label menu, group)
  - `src/components/simulate/PpeMatrixDisplay.tsx`, `BoundingBoxOverlay.tsx`, `EnrollFaceDialog.tsx`
  - `src/components/ui/LoadingScreen.tsx` jika ada teks
  - `src/lib/validation.ts` — error messages (export key, lookup via t() di pemanggil) ATAU return key string lalu translate di UI
- `index.html` — `<html lang>` di-set dinamis via i18n (opsional, set di App effect)

### Strategi key
Struktur bertingkat berdasarkan halaman:
```
{
  "common": { "save": "Simpan", "cancel": "Batal", "edit": "Ubah", "delete": "Hapus", "add": "Tambah", "search": "Cari", "loading": "Memuat...", "required": "Wajib diisi", "characters": "karakter" },
  "sidebar": { "groups": {...}, "items": {...} },
  "workers": { "title": "Kelola Pekerja", "addWorker": "Tambah Pekerja", "name": "Nama", "sid": "SID", ... },
  "validation": { "nameInvalid": "Nama hanya boleh mengandung huruf", "emailInvalid": "Format email tidak valid", "sidInvalid": "...", "zoneNameInvalid": "..." },
  "toast": { "saved": "Tersimpan", "deleted": "Terhapus", "error": "Terjadi kesalahan", ... }
}
```

### Komponen LanguageToggle
- Dua tombol kecil "ID" / "EN" dengan style toggle (atau Switch + label), pakai `useTranslation()` → `i18n.changeLanguage(lng)`
- Persist via i18next-browser-languagedetector (localStorage key: `i18nextLng`)
- Tampilkan di header `AppLayout` rata kanan (gunakan `ml-auto`)
- Untuk halaman `/auth` yang tidak pakai `AppLayout`, render toggle absolute top-right

### Detail teknis
- Install: `i18next`, `react-i18next`, `i18next-browser-languagedetector`
- `useTranslation()` di setiap komponen, ganti string hardcoded → `t('namespace.key')`
- Untuk pesan validasi di `validation.ts`: ubah agar fungsi return `{ valid, errorKey }` dan UI panggil `t(errorKey)`. Atau lebih ringan: pindahkan pesan error ke pemanggil dan validation.ts hanya return boolean (saat ini mostly boolean — cek isi file)
- Toast `sonner`/`useToast`: bungkus pesan dengan `t()`
- Dynamic content dari DB (nama pekerja, zona, role enum) **tidak diterjemahkan** — tetap ditampilkan apa adanya. Tapi label role enum (`super_admin`, `admin`, dll) di sidebar footer & Users page diterjemahkan via map.

### Verifikasi
- Build pass
- Toggle di header berfungsi, refresh tetap mempertahankan bahasa
- Cek 3 halaman sample (Dashboard, Workers, Roles) di EN: tidak ada teks ID tersisa
- Toast & validation muncul sesuai bahasa aktif