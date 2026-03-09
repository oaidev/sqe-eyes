

## Smart Detection: Capture Hanya Saat Ada Orang

### Masalah
Saat ini auto-capture mengirim frame ke server setiap N detik tanpa peduli apakah ada orang di frame atau tidak — membuang API calls.

### Solusi
Tambahkan **motion detection berbasis pixel-diff** di sisi klien sebagai "gate" sebelum mengirim frame ke server. Alurnya:

1. Setiap ~1 detik, ambil frame dari video/webcam dan bandingkan dengan frame sebelumnya
2. Hitung persentase piksel yang berubah (threshold ~5%)
3. Jika ada pergerakan signifikan → kirim frame ke `detect-event` untuk deteksi penuh
4. Jika tidak ada pergerakan → skip, tidak ada API call

### Perubahan File

**`src/pages/Simulate.tsx`**:
- Tambah mode baru: "Smart Capture" (toggle Switch) sebagai alternatif dari auto-capture interval
- Saat smart capture aktif, jalankan interval ~1 detik yang membandingkan frame saat ini dengan frame sebelumnya menggunakan canvas 2D context
- Jika pixel diff melebihi threshold, baru panggil `runDetection()`
- Tambah `useRef` untuk menyimpan previous frame data (`ImageData`)
- Ganti UI: Switch "Auto-capture" menjadi dua opsi — "Auto (interval)" dan "Smart (motion)"

### Logika Motion Detection (helper function)
```text
captureFrame → getImageData (downscaled ~160x90)
  → bandingkan dengan previousFrameData
  → hitung % piksel berbeda (RGB diff > 30)
  → jika > 5% → ada gerakan → runDetection()
  → simpan frame saat ini sebagai previousFrameData
```

### UI Changes
- Tambah radio/select: "Mode: Interval | Smart"
- Mode Interval: sama seperti sekarang (slider 3-10s)
- Mode Smart: label "Deteksi otomatis saat ada pergerakan", tanpa slider interval
- Tambah indikator kecil "Menunggu gerakan..." atau "Gerakan terdeteksi!" 

