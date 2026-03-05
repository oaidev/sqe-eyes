

## Plan: Bounding Box Overlay pada Hasil Deteksi

### Apa yang akan dilakukan
Setelah deteksi, gambar/frame yang di-capture akan ditampilkan dengan overlay bounding box di atas setiap orang yang terdeteksi. Box hijau = OK, box merah = ada pelanggaran/tidak dikenal. Label nama/status ditampilkan di atas box.

### Perubahan

#### 1. `supabase/functions/detect-event/index.ts`
Edge function sudah punya data `boundingBox` dari `personsPPE` tapi **tidak mengirimnya** ke frontend. Tambahkan `bounding_box` ke setiap item di `allResults` (line 631-643).

#### 2. `src/pages/Simulate.tsx`
- Tambah field `boundingBox` ke interface `DetectionResult`
- Simpan frame yang di-capture terakhir sebagai data URL (`lastCapturedImage`)
- Setelah deteksi, tampilkan gambar dengan overlay canvas/div yang menggambar bounding box per orang:
  - **Hijau** jika semua PPE OK dan worker dikenal
  - **Merah** jika ada pelanggaran atau tidak dikenal
  - Label di atas box: nama worker atau "Unknown", plus status PPE

Preview area akan menampilkan gambar terakhir + bounding box overlay, menggantikan live feed sementara sampai capture berikutnya.

### Files Changed
- `supabase/functions/detect-event/index.ts` — tambah `bounding_box` ke response
- `src/pages/Simulate.tsx` — simpan captured frame, render bounding box overlay

