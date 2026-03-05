

## Analisis: Kenapa Banyak APD Masih Tidak Terdeteksi

Setelah menganalisis edge function, ada **2 threshold utama** yang menyebabkan banyak APD tidak terdeteksi:

### Masalah 1: `MinConfidence: 70` di DetectProtectiveEquipment (line 323)
AWS hanya mengembalikan equipment yang confidence-nya ≥ 70%. Jika helm/sarung tangan/kacamata terdeteksi dengan confidence 50-69%, AWS **tidak mengembalikannya sama sekali** — sehingga dianggap "tidak ada".

### Masalah 2: `CoversBodyPart.Value` sebagai satu-satunya penentu (line 345)
Saat ini, `detected = eq.CoversBodyPart?.Value`. Artinya, meskipun AWS **mendeteksi** helm di kepala seseorang, jika AWS ragu apakah helm itu benar-benar menutupi kepala (`CoversBodyPart.Value = false`), hasilnya tetap `detected: false`. Ini terlalu ketat.

### Masalah 3: Sepatu & Rompi global untuk semua orang
DetectLabels mendeteksi sepatu/rompi secara **global** (seluruh gambar), bukan per orang. Jika 1 orang pakai rompi, semua 6 orang ditandai "rompi terdeteksi". Sebaliknya, jika tidak terdeteksi, semua ditandai merah.

---

### Rencana Perbaikan

**File: `supabase/functions/detect-event/index.ts`**

1. **Turunkan `MinConfidence`** di `SummarizationAttributes` dari `70` → `50` (line 323) agar lebih banyak equipment dikembalikan AWS
2. **Ubah logika `detected`** (line 345): jika confidence equipment ≥ 50%, anggap `detected: true` — tidak hanya bergantung pada `CoversBodyPart.Value`
3. **Tambahkan log per-person PPE** untuk debugging: log body parts dan equipment yang ditemukan per orang

### Files Changed
- `supabase/functions/detect-event/index.ts` — turunkan threshold dan ubah logika deteksi

