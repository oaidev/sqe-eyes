

## 8 Perbaikan Form & Import CSV di Kelola Pekerja

### 1. Remove helper text format SID
**Workers.tsx baris 286**: Hapus `<p>` helper text "Wajib diisi. Maks. 100 karakter. Tidak dapat diubah setelah disimpan."

### 2. Duplicate key error → 'SID sudah terdaftar'
**Workers.tsx baris 76**: Di `saveMutation.onError`, cek apakah error message mengandung "duplicate key" atau "unique constraint", jika ya tampilkan "SID sudah terdaftar".

### 3. Info max file size 2 MB di upload foto
**EnrollFaceDialog.tsx baris 193**: Ubah helper text menjadi "Maksimal 3 foto, format JPG/PNG. Ukuran maks. 2 MB per foto"

### 4. Hapus "Wajib diisi" dari helper text, cukup asterisk merah
**Workers.tsx baris 286, 292**: Hapus semua teks "Wajib diisi." dari helper text. Asterisk merah pada label sudah ada.

### 5. Character counter pada semua field dengan maxLength
**Workers.tsx baris 285-286 (SID) dan 291-292 (Nama)**: Ganti helper text statis dengan counter dinamis `{form.sid.length}/100` dan `{form.nama.length}/100`. Format: `<p className="text-xs text-muted-foreground text-right">{count}/100</p>`

### 6. Error SID duplikat di CSV — tambahkan nomor baris
Sudah ada di baris 117: `Baris ${i + 1}: SID sudah terdaftar`. Untuk error dari DB saat insert (baris 145), cek apakah `error.message` mengandung "duplicate key" lalu ubah jadi `Baris ${i + 2}: SID sudah terdaftar`.

### 7. Validasi nama ≤ 100 karakter di import CSV
**Workers.tsx** setelah baris 127: Tambah pengecekan `if (row.nama.length > 100)` → error `Baris ${i + 1}: Nama harus kurang dari 100 karakter`

### 8. Title error jabatan/departemen → "Error Import"
Sudah menggunakan "Error Import" di baris 132. Konfirmasi bahwa semua toast error CSV menggunakan title yang sama — termasuk baris 137 dan 154. Sudah konsisten.

### Files to modify
- `src/pages/Workers.tsx` — poin 1, 2, 4, 5, 6, 7
- `src/components/workers/EnrollFaceDialog.tsx` — poin 3

