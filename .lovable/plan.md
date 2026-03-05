

## Plan: Tambah 2 Grafik Breakdown per Jenis Alert

### Apa yang akan dilakukan
Menambahkan 2 grafik bar chart baru di bawah grafik "Alert 7 Hari Terakhir" yang sudah ada:

1. **APD Tidak Lengkap** — menampilkan jumlah alert `APD_VIOLATION` + `UNKNOWN_PERSON` per hari selama 7 hari terakhir, dibagi menjadi Valid vs Tidak Valid
2. **Keluar Tanpa Izin** — menampilkan jumlah alert `UNAUTHORIZED_EXIT` per hari selama 7 hari terakhir, dibagi menjadi Valid vs Tidak Valid

### Data yang dibutuhkan
- Query alerts 7 hari terakhir **dengan `alert_type`**: `supabase.from('alerts').select('id, created_at, alert_type')`
- Query supervisor_validations 7 hari terakhir **dengan `status`**: `supabase.from('supervisor_validations').select('alert_id, status')`

Validasi status enum: `VALID` | `TIDAK_VALID`. Alert tanpa validasi = "Belum Divalidasi".

### Perubahan di `src/pages/Index.tsx`

1. Update query `stats-7day-alerts` untuk juga select `alert_type`
2. Update query `stats-7day-validation-ids` untuk juga select `status` (bukan hanya `alert_id`)
3. Tambah 2 `useMemo` baru untuk memproses chart data:
   - `apdChartData`: filter `alert_type` = `APD_VIOLATION` atau `UNKNOWN_PERSON`, group per hari, hitung Valid / Tidak Valid / Belum Divalidasi
   - `exitChartData`: filter `alert_type` = `UNAUTHORIZED_EXIT`, group per hari, hitung Valid / Tidak Valid / Belum Divalidasi
4. Render 2 Card baru dengan BarChart di bawah grafik existing, dalam grid 2 kolom

### Layout
```text
[========= Alert 7 Hari Terakhir (existing) =========]
[== APD Tidak Lengkap 7 Hari ==] [== Keluar Tanpa Izin 7 Hari ==]
```

Setiap grafik baru menggunakan stacked bar chart dengan 3 warna:
- Hijau: Valid
- Merah: Tidak Valid  
- Abu-abu: Belum Divalidasi

### Files Changed
- `src/pages/Index.tsx` — update queries, tambah 2 chart baru

