

## Sembunyikan Visual APD untuk Kamera "Keluar Zona"

### Masalah
Saat kamera bertipe "Keluar Zona" dipilih, bagian **Hasil Visual Deteksi** (bounding box overlay) masih menampilkan status APD per item (✓/✗) di label overlay. Seharusnya untuk keluar zona, yang ditampilkan hanya identitas dan status izin, bukan checklist APD.

### Perubahan: `src/pages/Simulate.tsx`

**1. Bounding Box Overlay (baris ~429-443)** — Ubah `ppeItems` agar kosong untuk kamera keluar zona:
- Cek `r.jenisPelanggaran`, jika `KELUAR_TANPA_IZIN`:
  - `hasViolation` → berdasarkan alert type, bukan PPE
  - `ppeStatus` → `"Keluar Tanpa Izin"` (bukan daftar APD)

**2. Matrix APD (sudah disembunyikan)** — Sudah dilakukan sebelumnya, tidak perlu diubah.

Jadi perubahan hanya di satu tempat: mapping data ke `BoundingBoxOverlay` untuk mengganti label APD menjadi label izin keluar saat kamera bertipe keluar zona.

