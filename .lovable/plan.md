

# Kembalikan Pendaftaran Wajah di Kelola Pekerja

`EnrollFaceDialog.tsx` masih ada dan berfungsi. Hanya perlu menambahkan kembali tombol "Daftarkan Wajah" di tabel Workers dan meng-import dialog-nya.

## Perubahan di `src/pages/Workers.tsx`

1. Import `EnrollFaceDialog` dan icon `Camera`
2. Tambah state `enrollWorker` untuk track worker mana yang dibuka dialog enrollment-nya
3. Di kolom aksi tabel, tambahkan tombol Camera di samping Edit dan Delete
4. Render `<EnrollFaceDialog>` di bawah dialog lainnya
5. Juga invalidate `face-embeddings` query setelah enrollment selesai agar thumbnail terupdate

Tidak ada perubahan DB atau file lain yang diperlukan.

