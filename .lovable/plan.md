

## Plan: Fix Deteksi & Tambah Fitur

### Masalah yang Ditemukan

1. **Edge function masih pakai `confidence_score`** (line 560 di `detect-event/index.ts`) — kolom ini sudah di-drop di migrasi cleanup tadi. Inilah penyebab utama error: semua event insert gagal, sehingga tidak ada hasil yang dikembalikan (bounding box hilang, APD abu-abu semua karena data kosong).

2. **APD abu-abu untuk "Tidak Dikenal"** — Setelah fix #1, perlu pastikan worker tanpa jabatan (unknown) menggunakan rules general (`jabatan = null`). Logika saat ini sudah benar (line 527-529), tapi hasilnya tidak terlihat karena insert gagal.

3. **Tidak ada matrix APD setelah pilih kamera** — User ingin lihat item APD apa saja yang dicek (general + per jabatan) sebelum menjalankan deteksi.

4. **6 orang = 1 snapshot** — Saat ini semua person pakai `snapshot_url` yang sama (gambar asli tanpa bounding box). Setiap person sudah menghasilkan event terpisah di DB, jadi sudah muncul sebagai row terpisah di validasi. Tapi snapshot-nya belum ada bounding box.

### Perubahan

#### 1. `supabase/functions/detect-event/index.ts` — Fix critical bug
- Hapus `confidence_score` dari event insert (line 560)

#### 2. `src/pages/Simulate.tsx` — Tambah matrix APD
- Query `zone_ppe_rules` berdasarkan `zone_id` dari kamera yang dipilih
- Tampilkan tabel matrix APD (general + per jabatan) di bawah dropdown kamera, sebelum input gambar
- Menampilkan 5 item PPE dan apakah required untuk setiap jabatan

#### 3. `src/pages/Simulate.tsx` — Fix PPE display untuk unknown
- Jika worker tidak dikenal, gunakan rules `jabatan = null` (general) untuk menentukan item mana yang dicek vs abu-abu. Ini sudah dilakukan di edge function tapi frontend perlu match logikanya: jika item ada di `ppe_results` (returned dari API) maka tampilkan hijau/merah, jika tidak ada tapi ada di general rules maka tampilkan merah (violation), sisanya abu-abu.

#### 4. Snapshot dengan bounding box — Pertimbangan
Edge function saat ini upload 1 snapshot untuk semua orang. Untuk menambahkan bounding box pada snapshot memerlukan image processing di server (draw rectangles on image) yang cukup kompleks. Alternatif yang lebih praktis: di halaman validasi, tampilkan bounding box overlay (seperti di Simulate) menggunakan data `ppe_results` dan bounding box yang tersimpan. Ini memerlukan menyimpan `bounding_box` di tabel events.

### Files Changed
- `supabase/functions/detect-event/index.ts` — hapus `confidence_score` dari insert, tambah `bounding_box` field ke event insert (sebagai jsonb di `ppe_results` atau kolom baru)
- `src/pages/Simulate.tsx` — tambah query & tampilan matrix APD setelah pilih kamera
- Database migration — tambah kolom `bounding_box jsonb` ke tabel `events` (agar validasi bisa render overlay)
- `src/pages/OperatorValidation.tsx` — render bounding box overlay dari data event

