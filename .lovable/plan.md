

# Simulasi Kamera: Webcam, Upload Gambar & Upload Video

Menambahkan dialog simulasi deteksi di halaman Live Cameras dengan 3 mode input untuk testing pipeline AWS Rekognition.

---

## Komponen Baru: `src/components/cameras/SimulateCameraDialog.tsx`

### 3 Tab Input
1. **Webcam** — Stream webcam via `getUserMedia`, tombol "Capture & Detect" mengambil frame via `<canvas>` → base64 → kirim ke `detect-event`
2. **Upload Gambar** — Input file (JPG/PNG), convert ke base64 → kirim ke `detect-event`
3. **Upload Video** — Input file (MP4/WebM), play di `<video>` element, tombol "Capture Frame" untuk ambil frame dari video pada posisi saat ini via `<canvas>` → base64 → kirim ke `detect-event`. Juga ada mode **auto-capture** setiap N detik selama video diputar

### Fitur Tambahan
- Dropdown pilih `camera_id` dari tabel cameras (untuk asosiasi zona & aturan PPE)
- Auto-capture toggle (interval 3-10 detik) untuk webcam & video
- Panel hasil deteksi: worker teridentifikasi, status APD, confidence, alert created
- Riwayat 5 deteksi terakhir dalam mini-feed

## Perubahan di `src/pages/LiveCameras.tsx`
- Tambah tombol "Simulasi Deteksi" di header yang membuka dialog

## Alur Deteksi (semua mode sama)
1. Ambil frame → base64
2. `supabase.functions.invoke('detect-event', { body: { camera_id, image_base64 } })`
3. Tampilkan hasil (worker, PPE, event type, alert)
4. Data otomatis masuk ke halaman Events & Alerts via realtime

## Detail Teknis
- Video upload menggunakan `<video>` + `<canvas>` untuk extract frame — tidak perlu backend processing
- Tidak ada library tambahan, semua pakai browser API native
- Maksimal ukuran video: dibatasi di UI (50MB warning)

