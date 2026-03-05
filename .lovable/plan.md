

## Plan: Tambah Label Person & Tampilkan Semua 5 Item PPE

### Masalah yang Ditemukan

1. **Person 1 vs Person 2 tidak jelas**: Kartu hasil tidak menampilkan nomor/indeks orang, sehingga tidak bisa dibedakan mana Person 1 dan Person 2.

2. **Kacamata Safety & Sarung Tangan tidak muncul**: Zone PPE rules di database untuk zona kamera yang digunakan kemungkinan hanya mewajibkan 3 item (Helm, Rompi, Sepatu) untuk jabatan umum (null). HAND_COVER dan SAFETY_GLASSES hanya diwajibkan untuk jabatan tertentu (Welder, Mekanik). Karena pekerja "Tidak Dikenal" tidak punya jabatan, aturan berbasis jabatan tetap diterapkan — tapi jika zone tersebut tidak punya rule untuk SAFETY_GLASSES/HAND_COVER sama sekali, item tersebut tidak akan muncul.

### Perubahan

#### 1. `src/pages/Simulate.tsx`
- Tambah field `personIndex` ke `DetectionResult` interface
- Simpan `person_index` dari response API
- Tampilkan label **"Person 1"**, **"Person 2"** dst di setiap kartu hasil dengan warna badge yang sesuai
- Tampilkan **semua 5 item PPE** di checklist (HEAD_COVER, HAND_COVER, SAFETY_GLASSES, SAFETY_SHOES, REFLECTIVE_VEST) — jika item tidak ada di `ppe_results`, tampilkan sebagai "Tidak Terdeteksi" (abu-abu) bukan merah, agar user tahu item tersebut tidak dicek oleh zone rules vs memang tidak terpakai

#### 2. `src/components/simulate/BoundingBoxOverlay.tsx`
- Tambah nomor person di label bounding box (e.g. "#1 Tidak Dikenal" atau "#2 Ahmad")

### Files Changed
- `src/pages/Simulate.tsx` — tambah personIndex, tampilkan semua 5 PPE items, label person
- `src/components/simulate/BoundingBoxOverlay.tsx` — tambah nomor person di label

