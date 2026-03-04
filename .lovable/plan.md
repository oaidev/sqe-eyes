

## Plan: Redesign Hasil Deteksi Panel di Simulasi

### Changes

**1. Edge Function (`detect-event/index.ts`)** — Line 397: Include `jabatan` in the worker response object:
```
worker: workerInfo ? { nama: workerInfo.nama, sid: workerInfo.sid, jabatan: workerInfo.jabatan } : null,
```

**2. `src/pages/Simulate.tsx`** — Redesign the results card and interface:

- Update `DetectionResult` interface: add `jabatan` to worker, remove `event_type`, `violations`, `zone_rules_applied`
- Add `jenisPelanggaran` field derived from selected camera's `jenis_pelanggaran`
- In `runDetection`, capture `jenis_pelanggaran` from the selected camera and include worker `jabatan`

**Results card layout** (replace lines 286-328):
```
1. Tanggal & Waktu — full date + time (e.g. "04 Mar 2026, 20:30:28")
2. SID & Nama — "SID: 12345 — Nama Worker" or "Tidak Dikenal"
3. Jabatan — worker.jabatan or "-"
4. Jenis Pelanggaran — badge: "APD Tidak Lengkap" or "Keluar Tanpa Izin"
5. Detail:
   - If APD: show PPE badges (checked/unchecked) — same as current but no redundant text
   - If Keluar Tanpa Izin: show message "Tidak Ada Izin"
6. Remove the bottom notes section ("Orang Tidak Dikenal / Tidak terdeteksi: ...")
   Remove the "APD sesuai aturan zona" section
```

### Files Changed
- `supabase/functions/detect-event/index.ts` — add `jabatan` to response
- `src/pages/Simulate.tsx` — redesign results panel

