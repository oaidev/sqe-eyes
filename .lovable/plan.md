

## Analisis: Kode & Database yang Tidak Terpakai

Setelah menelusuri seluruh codebase, berikut temuan item yang tidak terpakai atau redundan:

---

### Database — Tabel & Kolom Tidak Terpakai

| Item | Status | Alasan |
|------|--------|--------|
| **Tabel `compliance_aggregates`** | Tidak dipakai di frontend | Tidak ada kode yang membaca/menulis tabel ini. Hanya muncul di `types.ts` (auto-generated). |
| **Tabel `report_exports`** | Tidak dipakai di frontend | Tidak ada fitur export report yang diimplementasi. |
| **Tabel `zone_access_rules`** | Tidak dipakai di frontend | Tidak ada UI yang membaca/menulis. Hanya dipakai di `types.ts`. |
| **Kolom `cameras.detection_models`** | Redundan | Selalu diset `[]` (array kosong). Logika deteksi ditentukan oleh `jenis_pelanggaran`, bukan field ini. |
| **Kolom `cameras.point_type`** | Derivasi dari `jenis_pelanggaran` | Di `Zones.tsx`, nilainya selalu diturunkan: `exit` jika `KELUAR_TANPA_IZIN`, `area` jika tidak. Bukan input independen. |
| **Kolom `zones.shift`, `zones.shift_start`, `zones.shift_end`** | Tidak dipakai di frontend | Menurut memory, "logika shift dan waktu operasional pada level zona telah dihapus." Tidak ada kode frontend yang menggunakan kolom ini. |
| **Kolom `events.clip_url`** | Selalu null | Tidak ada kode yang mengisi `clip_url`. UI menampilkannya di Operator/Supervisor Validation tapi nilainya selalu kosong. |
| **Kolom `events.confidence_score`** | Tidak pernah diisi | Edge function tidak menulis ke kolom ini. |
| **Enum `worker_shift`** | Hanya di schema | Kolom `workers.shift` ada di DB tapi tidak ditampilkan/diedit di UI Workers. |

### Database — Tabel yang Dipakai (Retain)

| Tabel | Dipakai di |
|-------|-----------|
| `sites` | `Zones.tsx` — untuk mengambil site_id |
| `exit_permits` | `detect-event` edge function — cek izin keluar |
| Semua tabel lain | Aktif dipakai |

---

### Kode — File/Komponen Tidak Terpakai

| Item | Status |
|------|--------|
| **`src/components/ui/toaster.tsx` + `src/hooks/use-toast.ts` + `src/components/ui/toast.tsx`** | Kemungkinan redundan — proyek juga menggunakan `sonner` untuk toast. Tapi `App.tsx` masih import `Toaster` dari `ui/toaster`, dan `Users.tsx` menggunakan `useToast`. Jadi **masih dipakai**, tapi ada duplikasi sistem toast (sonner + radix toast). |
| **`src/test/example.test.ts`** | Placeholder test file — tidak ada test nyata. |

---

### Rencana Pembersihan

#### 1. Database Migration — Hapus kolom tidak terpakai
- Drop kolom `cameras.detection_models`
- Drop kolom `zones.shift`, `zones.shift_start`, `zones.shift_end`
- Drop kolom `events.clip_url`, `events.confidence_score`

#### 2. Database Migration — Hapus tabel tidak terpakai
- Drop tabel `compliance_aggregates`
- Drop tabel `report_exports`
- Drop tabel `zone_access_rules`
- Drop enum `worker_shift` (setelah cek tidak ada referensi lain)

#### 3. Kode — Bersihkan referensi
- `src/pages/Zones.tsx`: Hapus `detection_models: []` dari `camPayload`
- `src/pages/OperatorValidation.tsx` & `SupervisorValidation.tsx`: Hapus referensi `clip_url` dari interface dan render
- Hapus `src/test/example.test.ts` (placeholder)

#### 4. Pertimbangan (Tidak dihapus)
- `cameras.point_type`: Masih dipakai di `detect-event` edge function dan `OperatorValidation.tsx`. Bisa di-derive tapi masih fungsional, lebih baik dipertahankan.
- `exit_permits`: Dipakai di edge function, pertahankan.
- Dual toast system (sonner + radix): Bisa dikonsolidasi nanti tapi bukan prioritas.

### Files Changed
- Database migration: drop tabel & kolom tidak terpakai
- `src/pages/Zones.tsx` — hapus `detection_models` dari payload
- `src/pages/OperatorValidation.tsx` — hapus `clip_url` referensi
- `src/pages/SupervisorValidation.tsx` — hapus `clip_url` referensi
- Hapus `src/test/example.test.ts`

