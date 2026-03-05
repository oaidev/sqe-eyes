

## Plan: Multi-Person Detection Support

### Masalah
Saat ini edge function hanya menganalisis `Persons[0]` (orang pertama) dari respons AWS `DetectProtectiveEquipment`. Orang ke-2, ke-3, dst diabaikan total.

Selain itu, `SearchFacesByImage` hanya mencari `MaxFaces: 1`. Jadi hanya 1 wajah yang diidentifikasi.

### Perubahan

#### 1. `supabase/functions/detect-event/index.ts`
- **SearchFacesByImage**: Ganti ke `IndexFaces` atau gunakan `DetectFaces` dulu untuk mendapatkan semua bounding box wajah, lalu `SearchFacesByImage` per crop — ATAU lebih praktis: ubah `MaxFaces` ke 10 dan gunakan respons `SearchedFaceBoundingBox` untuk mapping.

  **Pendekatan realistis**: AWS `SearchFacesByImage` hanya mencocokkan **1 wajah terbesar**. Untuk multi-face, kita perlu:
  1. Panggil `DetectFaces` untuk mendapatkan semua bounding box
  2. Untuk setiap wajah, crop image lalu panggil `SearchFacesByImage` per crop

  Ini mahal (N+1 API calls). **Alternatif lebih efisien**: Gunakan `SearchFacesByImage` untuk wajah terbesar saja, tapi proses **semua Persons** dari `DetectProtectiveEquipment` untuk PPE.

- **DetectProtectiveEquipment**: Loop semua `Persons[]`, bukan hanya `Persons[0]`. Setiap person mendapat analisis PPE sendiri.

- **Response**: Ubah response dari single object ke array `results[]`, di mana setiap item = 1 person dengan PPE results-nya. Wajah yang dikenali di-match berdasarkan bounding box overlap.

- **Event/Alert creation**: Buat 1 event + 1 alert per person (bukan 1 total).

#### 2. `src/pages/Simulate.tsx`
- Update `DetectionResult` interface dan parsing untuk handle array results dari edge function
- Setiap capture bisa menghasilkan **multiple result cards** (1 per person)
- Update `runDetection` untuk push multiple results ke state

### Estimasi Kompleksitas
- Edge function: Moderate — loop Persons[], multi-event insert, bounding box matching
- Frontend: Minor — parse array instead of single object

### Files Changed
- `supabase/functions/detect-event/index.ts` — multi-person PPE loop, multi-event/alert creation, array response
- `src/pages/Simulate.tsx` — handle array response, display multiple results per capture

