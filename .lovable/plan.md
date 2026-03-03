

# Fix: Deteksi APD Kosong & Alert Tidak Terhubung

## Analisis Masalah

1. **PPE results selalu kosong `{}`** — Dari database, semua event terbaru punya `ppe_results: {}`. Kode PPE detection ada (line 174-203) tapi silent-fail di catch block. Kemungkinan besar gagal karena `PPE_MAP` hanya punya 3 item (FACE_COVER, HEAD_COVER, HAND_COVER) padahal zone rules juga butuh SAFETY_SHOES dan REFLECTIVE_VEST. Selain itu, AWS `DetectProtectiveEquipment` hanya support 3 type tersebut — SAFETY_SHOES dan REFLECTIVE_VEST **bukan** type yang didukung AWS Rekognition, jadi perlu di-map dari body part analysis.

2. **Alert logic terlalu sederhana** — Saat ini hanya cek `ppeViolation` (any PPE not detected) atau `isUnknown`. Tidak membandingkan dengan **aturan PPE zona** (`zone_ppe_rules`). Seharusnya: ambil aturan PPE dari zona kamera → bandingkan dengan hasil deteksi → buat alert hanya jika item yang **wajib** tidak terdeteksi.

3. **Response `alert_type` tidak dikirim ke UI** — Edge function sudah return `alert_created: true` tapi tidak mengirim `alert_type`. UI sudah handle field ini tapi tidak ditampilkan secara informatif.

## Perbaikan

### 1. Edge Function `detect-event/index.ts`

**a. Perbaiki PPE detection & mapping:**
- Tambah logging di catch block PPE agar error tidak hilang
- AWS Rekognition `DetectProtectiveEquipment` hanya mendeteksi HEAD_COVER, FACE_COVER, HAND_COVER — untuk SAFETY_SHOES dan REFLECTIVE_VEST, parse dari `BodyParts` analysis (feet/body coverage)
- Update PPE_MAP untuk include semua 5 item yang dipakai di zone rules

**b. Tambah validasi terhadap aturan zona:**
- Setelah PPE detection, query `zone_ppe_rules` berdasarkan `zone_id` dari kamera
- Jika worker teridentifikasi dan punya jabatan, filter rules by jabatan juga
- Bandingkan required items vs detected items → tentukan violations

**c. Perbaiki alert creation:**
- Buat alert dengan detail violations di `notes` field
- Kirim `alert_type` dan detail violations di response
- Tambah `alert_type` ke response JSON

### 2. UI `SimulateCameraDialog.tsx`

- Tampilkan `alert_type` di hasil deteksi (sudah ada tapi perlu dipastikan terhubung)
- Tampilkan detail violation (item APD mana yang tidak sesuai aturan zona)

## Detail Teknis

### Perubahan di Edge Function

```
// Setelah PPE detection, query zone rules:
1. Ambil zone_id dari camera
2. Query zone_ppe_rules WHERE zone_id = camera.zone_id
3. Untuk setiap required PPE item:
   - Jika item ada di ppeResults dan detected=true → OK
   - Jika item TIDAK ada di ppeResults atau detected=false → VIOLATION
4. Buat array violations
5. Jika violations.length > 0 → create alert APD_VIOLATION dengan notes berisi detail
```

### File yang diubah
- `supabase/functions/detect-event/index.ts` — tambah zone PPE rule validation, perbaiki alert logic, tambah alert_type di response
- `src/components/cameras/SimulateCameraDialog.tsx` — tampilkan alert_type dan violation details di panel hasil

