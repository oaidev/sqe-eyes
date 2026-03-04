

## Plan: Sidebar Light Blue + Teks COSMOS + Konsistensi Visual

### 1. `src/index.css` — Update sidebar CSS variables (light mode)

Sidebar saat ini dark (`215 50% 12%`). Ubah ke light blue agar senada dengan Auth page:

```css
--sidebar-background: 210 50% 97%;        /* light blue-gray, mirip --background */
--sidebar-foreground: 215 40% 20%;        /* dark text */
--sidebar-primary: 213 100% 40%;          /* brand blue, sama dengan --primary */
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 213 90% 93%;            /* light blue hover */
--sidebar-accent-foreground: 213 100% 35%;
--sidebar-border: 214 20% 90%;            /* subtle border, sama dengan --border */
--sidebar-ring: 213 100% 40%;
```

Dark mode sidebar tetap tidak berubah.

### 2. `src/components/layout/AppSidebar.tsx` — Header + border

- Ganti `border-r-0` menjadi `border-r` pada `<Sidebar>` agar ada separator visual
- Ganti logo `<img>` di header dengan teks:
  ```
  COSMOS
  Computer Vision for Mining Operation & Safety
  ```
  Menggunakan warna `text-primary` untuk "COSMOS" dan `text-sidebar-foreground/60` untuk subtitle

### 3. Komponen lain yang perlu dicek

**Sudah konsisten** — `LoadingScreen.tsx` dan `NotFound.tsx` sudah menggunakan logo PROXIS URL dan warna `bg-background` / `text-primary` yang senada dengan tema. Tidak perlu perubahan tambahan.

### Files Changed
- `src/index.css` — sidebar CSS variables ke light blue
- `src/components/layout/AppSidebar.tsx` — teks COSMOS + border

