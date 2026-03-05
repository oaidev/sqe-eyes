

## Analisis: Mapping & Deteksi — Temuan dari Log

Saya menganalisis log edge function dan data `zone_ppe_rules`. Berikut temuan:

### Temuan dari Log AWS

PPE raw response untuk Person 0:
```text
FACE:       EquipmentDetections: []     → tidak ada kacamata/face cover terdeteksi
LEFT_HAND:  EquipmentDetections: []     → tidak ada sarung tangan terdeteksi  
RIGHT_HAND: EquipmentDetections: []     → tidak ada sarung tangan terdeteksi
HEAD:       EquipmentDetections: [{Confidence: 99.4, CoversBodyPart: true}]  → helm ✅
```

Artinya: AWS memang **tidak menemukan** equipment di wajah dan tangan. Ini bukan masalah threshold kita — AWS mengembalikan array kosong (`[]`), bukan confidence rendah.

### Masalah 1: Data `zone_ppe_rules` Masih Punya FACE_COVER

Zone `b1...0004` punya **KEDUA** item:
- `FACE_COVER` (jabatan: null — berlaku semua)  
- `SAFETY_GLASSES` (jabatan: Mekanik)

Kode sudah normalisasi `FACE_COVER` → `SAFETY_GLASSES`, tapi data ganda ini membingungkan dan bisa menyebabkan duplikasi di UI.

### Masalah 2: Sepatu & Rompi Bersifat Global (Paling Berdampak)

`DetectLabels` mendeteksi sepatu/rompi untuk **seluruh gambar**, bukan per orang. Akibatnya:
- Jika 1 orang pakai rompi → semua 6 orang ditandai "rompi ✅"
- Jika label "boot"/"vest" **tidak ditemukan** di gambar → **semua 6 orang** ditandai merah

Ini adalah penyebab utama banyak item merah. DetectLabels mencari label generik ("boot", "vest") yang sering tidak muncul pada foto pekerja di tambang.

### Masalah 3: Body Part yang Tidak Terdeteksi AWS = Kosong

AWS `DetectProtectiveEquipment` hanya mendeteksi 3 tipe: `FACE_COVER`, `HEAD_COVER`, `HAND_COVER`. Jika orang kecil/jauh/tertutup di gambar, AWS mengembalikan `EquipmentDetections: []` — ini bukan threshold, ini limitasi AWS.

---

### Rencana Perbaikan

#### 1. `supabase/functions/detect-event/index.ts` — Perbaiki deteksi sepatu & rompi

Saat ini sepatu/rompi dicek via `DetectLabels` global. Perbaikan:
- Tambah **lebih banyak keyword** untuk shoe: `"steel toe"`, `"cowboy boot"`, `"hiking boot"`, `"sneaker"`, `"rubber boot"`, `"protective footwear"`, `"clothing"`, `"apparel"`
- Tambah keyword untuk vest: `"uniform"`, `"overall"`, `"coverall"`, `"workwear"`, `"outerwear"`, `"fluorescent"`
- **Turunkan MinConfidence** DetectLabels dari `40` → `30`
- Jika label `"Person"` terdeteksi dan gambar jelas menampilkan pekerja, asumsikan sepatu ada (karena hampir pasti pekerja pakai alas kaki) — opsional, bisa diatur via flag

#### 2. `supabase/functions/detect-event/index.ts` — Fallback detection logic

Tambahkan logika: jika body part confidence tinggi (>90%) tapi `EquipmentDetections` kosong, log secara eksplisit bahwa item **tidak dipakai** (bukan "tidak terdeteksi"). Ini membantu membedakan "AWS yakin tidak ada" vs "AWS tidak bisa lihat".

#### 3. Database migration — Bersihkan FACE_COVER di zone_ppe_rules  

Update semua `ppe_item = 'FACE_COVER'` → `'SAFETY_GLASSES'` agar konsisten. Hapus duplikat yang terbentuk setelah update.

### Files Changed
- `supabase/functions/detect-event/index.ts` — keyword diperluas, MinConfidence diturunkan, logging diperbaiki
- Database migration — normalisasi FACE_COVER → SAFETY_GLASSES di zone_ppe_rules

