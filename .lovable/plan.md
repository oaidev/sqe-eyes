

# Fix Simulasi Deteksi & Analisis Masalah Lain

## Masalah yang Ditemukan

### 1. ❌ Tombol Close Simulasi Tidak Berfungsi
**Penyebab**: `Simulate.tsx` merender `SimulateCameraDialog` dengan `onOpenChange={() => {}}` (no-op). Karena ini sudah jadi halaman dedicated (`/simulate`), bukan dialog popup lagi.

**Solusi**: Refactor `SimulateCameraDialog` → konversi dari `Dialog` menjadi komponen inline biasa (bukan modal). Hapus wrapper Dialog, render konten langsung di halaman. Tombol close tidak diperlukan karena user navigasi via sidebar.

### 2. ⚠️ Console Warning: Function components cannot be given refs
**Penyebab**: `SimulateCameraDialog` menggunakan `Select` di dalam `DialogContent` yang menyebabkan ref forwarding error.

**Solusi**: Terselesaikan otomatis saat Dialog wrapper dihapus.

### 3. ⚠️ Console Warning: Missing DialogDescription
**Penyebab**: `DialogContent` tanpa `DialogDescription` atau `aria-describedby`.

**Solusi**: Terselesaikan otomatis saat Dialog wrapper dihapus.

## Perubahan File

### `src/pages/Simulate.tsx`
- Pindahkan seluruh konten `SimulateCameraDialog` langsung ke halaman ini sebagai komponen inline (bukan Dialog)
- Hapus wrapper `Dialog`, `DialogContent`, `DialogHeader`
- Pertahankan semua fungsionalitas (webcam, upload, video, detection, results panel)

### `src/components/cameras/SimulateCameraDialog.tsx`
- Bisa dihapus atau dipertahankan untuk backward compatibility
- Rekomendasi: hapus karena tidak dipakai di tempat lain

