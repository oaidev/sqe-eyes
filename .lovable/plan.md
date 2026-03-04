

## Plan: Fix PPE Mapping untuk AWS Rekognition

### Masalah

AWS Rekognition `DetectProtectiveEquipment` hanya mendukung **3 tipe** secara native: `FACE_COVER`, `HEAD_COVER`, `HAND_COVER`. Tipe `SAFETY_GLASSES`, `SAFETY_SHOES`, dan `REFLECTIVE_VEST` **tidak bisa dideteksi** oleh Rekognition PPE API.

Namun, kita bisa menggunakan **DetectLabels** API untuk mendeteksi item-item tambahan ini (sepatu safety, rompi reflektif). Untuk kacamata safety, `FACE_COVER` dari Rekognition bisa di-remap.

Saat ini ada inkonsistensi di mapping:
- `FACE_COVER` di edge function di-label "Masker", tapi di frontend di-label "Kacamata Safety"
- `SAFETY_GLASSES` ada di enum DB dan frontend tapi tidak dideteksi di edge function
- `SAFETY_SHOES` dan `REFLECTIVE_VEST` ada di enum DB tapi tidak dideteksi

### Solusi

Karena Rekognition PPE API terbatas pada 3 tipe, pendekatan realistis:

1. **Remap `FACE_COVER` → `SAFETY_GLASSES` (Kacamata Safety)** — karena Rekognition mendeteksi kacamata/goggle sebagai FACE_COVER
2. **Untuk `SAFETY_SHOES` dan `REFLECTIVE_VEST`** — gunakan **DetectLabels** API tambahan untuk mendeteksi label seperti "Boot", "Shoe", "Vest", "High-Vis"
3. **Hapus `FACE_COVER` dari mapping** — tidak dipakai sebagai masker di konteks ini

### Perubahan

**1. `supabase/functions/detect-event/index.ts`**

- Update `PPE_MAP`: remap `FACE_COVER` → `SAFETY_GLASSES`
- Update `PPE_LABEL`: hapus `FACE_COVER`, tambah `SAFETY_GLASSES`
- Tambah panggilan **DetectLabels** setelah DetectProtectiveEquipment untuk mendeteksi `SAFETY_SHOES` dan `REFLECTIVE_VEST` berdasarkan label
- Update `RequiredEquipmentTypes` tetap `["FACE_COVER", "HEAD_COVER", "HAND_COVER"]` (ini constraint AWS)

DetectLabels approach:
```ts
// Call DetectLabels to find shoes/vest
const labelsBody = JSON.stringify({
  Image: { Bytes: imageB64 },
  MaxLabels: 50,
  MinConfidence: 60,
});
// Look for labels: "Boot", "Shoe", "Footwear" → SAFETY_SHOES
// Look for labels: "Vest", "Clothing" with high-vis context → REFLECTIVE_VEST
```

**2. `src/pages/Simulate.tsx`** — `ppeLabel` sudah benar (ada SAFETY_GLASSES, SAFETY_SHOES, REFLECTIVE_VEST)

**3. `src/pages/OperatorValidation.tsx`** & **`src/pages/SupervisorValidation.tsx`** — `PPE_LABELS` sudah ada mapping untuk semua item, tapi ada duplikat `FACE_COVER: 'Kacamata Safety'` dan `SAFETY_GLASSES: 'Kacamata Safety'`. Hapus entry `FACE_COVER`.

**4. `src/pages/Zones.tsx`** — `PPE_ITEMS` hanya punya 3 item. Tambah `SAFETY_GLASSES`, `SAFETY_SHOES`, `REFLECTIVE_VEST`.

### Files Changed
- `supabase/functions/detect-event/index.ts` — remap FACE_COVER→SAFETY_GLASSES, tambah DetectLabels untuk shoes/vest
- `src/pages/Zones.tsx` — tambah 3 PPE items ke list
- `src/pages/OperatorValidation.tsx` — hapus FACE_COVER dari PPE_LABELS
- `src/pages/SupervisorValidation.tsx` — hapus FACE_COVER dari PPE_LABELS

