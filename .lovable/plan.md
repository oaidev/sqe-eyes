

## Waktu Kamera Off — Toggle + Skip Detection

### What Changes

**1. Zones page (`src/pages/Zones.tsx`)** — Add a toggle switch for "Waktu Kamera Off"
- Add state `offTimeEnabled` (boolean)
- When toggle is OFF, clear the time fields and don't save times
- When toggle is ON, show the existing time inputs
- Populate toggle state from existing camera data (if `off_time_start` is non-null → toggle ON)

**2. Simulate page (`src/pages/Simulate.tsx`)** — Check off-time before detection
- Fetch camera data including `off_time_start`, `off_time_end`, `jenis_pelanggaran`
- Before calling `runDetection`, if the selected camera is `KELUAR_TANPA_IZIN` and has off-time set, compare current time (HH:MM) against the range
- If current time is within off-time range → show toast info "Kamera sedang dalam waktu off (HH:MM - HH:MM), deteksi dilewati" and skip the API call
- This check applies to: manual capture button, interval auto-capture, and smart auto-capture

### Logic for time check

```text
function isInOffTime(start: string, end: string): boolean
  now = current HH:MM
  if start <= end → normal range → now >= start && now <= end
  if start > end  → overnight range → now >= start || now <= end
```

### No database changes needed
The `off_time_start` and `off_time_end` columns already exist. We treat "both non-null" as "off-time enabled". No new columns required.

### Files to modify
- `src/pages/Zones.tsx` — Add toggle UI wrapping the time inputs
- `src/pages/Simulate.tsx` — Add off-time check before every detection call, update camera query to include off-time fields

