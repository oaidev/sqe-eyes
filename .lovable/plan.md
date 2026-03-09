

## Sembunyikan Matrix APD untuk Kamera Keluar Zona

### Masalah
Baris 273 di `src/pages/Simulate.tsx` masih menampilkan `PpeMatrixDisplay` tanpa mengecek `jenis_pelanggaran`.

### Perubahan: `src/pages/Simulate.tsx` (baris 273)

Tambah kondisi agar matrix APD hanya muncul jika kamera **bukan** bertipe `KELUAR_TANPA_IZIN`:

```tsx
{selectedCamera && (selectedCamera as any).jenis_pelanggaran !== 'KELUAR_TANPA_IZIN' && (
  <PpeMatrixDisplay ... />
)}
```

Satu baris kondisi ditambahkan, tidak ada file lain yang perlu diubah.

