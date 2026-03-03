

# Fix: Worker Tidak Dikenal & Webcam Tidak Muncul

## Masalah 1: Worker selalu "Tidak Dikenal"
Edge function `detect-event` mengembalikan `worker_id` saja (UUID), tapi **tidak mengembalikan objek `worker`** dengan `nama` dan `sid`. UI mengecek `data.worker` yang selalu `undefined`.

**Perbaikan:** Setelah `workerId` ditemukan (line ~159), query tabel `workers` untuk ambil `nama` dan `sid`, lalu tambahkan ke response.

File: `supabase/functions/detect-event/index.ts`
- Setelah line 159, tambah query: `supabase.from("workers").select("nama, sid").eq("id", workerId).single()`
- Di response (line 228), tambah field `worker: workerInfo`

## Masalah 2: Webcam tidak muncul di live view
Race condition — `setWebcamActive(true)` dipanggil **sebelum** video element di-render. Saat `startWebcam` dijalankan, `webcamVideoRef.current` mungkin sudah ada tapi stream belum di-attach karena timing React render.

Masalah sebenarnya: `srcObject` di-set saat `webcamVideoRef.current` ada, tapi jika React belum me-render ulang video element (karena `webcamActive` belum true saat assignment), stream hilang.

**Perbaikan:** Gunakan callback ref atau `useEffect` yang watch `webcamActive` untuk assign stream ke video element setelah render.

File: `src/components/cameras/SimulateCameraDialog.tsx`
- Tambah `useEffect` yang memantau `webcamActive`: ketika true dan stream ada, assign `srcObject` ke video ref
- Ini memastikan stream di-attach **setelah** video element sudah di-render oleh React

```typescript
useEffect(() => {
  if (webcamActive && webcamVideoRef.current && webcamStreamRef.current) {
    webcamVideoRef.current.srcObject = webcamStreamRef.current;
  }
}, [webcamActive]);
```

## Masalah 3: Label teknis di UI
Pastikan tidak ada referensi "AWS Rekognition" atau istilah teknis lain yang tampil ke user — sudah diperbaiki di pesan sebelumnya.

