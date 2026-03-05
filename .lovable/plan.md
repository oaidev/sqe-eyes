

## Plan: Fix Bounding Box Overlay & Face Identification Issues

### Issue Analysis

From the screenshot: both persons show as "Tidak Dikenal" with orange bounding boxes and "Orang Tidak Dikenal" violation row, despite both having Helm and Rompi Reflektif detected (APD lengkap). Three problems:

1. **Bounding box color wrong**: Both boxes are orange/red. Since APD is lengkap, compliant persons should have green boxes. The overlay shows "Orang Tidak Dikenal" as violation row even though the real issue is just identity — if APD is complete, box should be green for the APD portion.
2. **Violation row shows "Orang Tidak Dikenal" instead of actual violation type**: Row 2 should show the jenis pelanggaran context (e.g., nothing if APD lengkap, or the specific missing items).
3. **Face identification failing for multi-person**: The cropping approach may be failing silently. Need to check edge function logs, but likely the `jpeg-js` decode/encode is producing images that AWS can't process, or the crop region is too large/small.

### Changes

#### 1. `BoundingBoxOverlay.tsx` — Fix two-row label logic

**Current problem**: `hasViolation` is `true` when `status === 'unknown'`, which forces orange box + "Orang Tidak Dikenal" violation text. But the user wants:
- Row 1 (Identity): Green if known, orange if unknown — this is correct
- Row 2 (Violation): Only show if there's an *actual PPE/zone violation*, NOT just because identity is unknown
- Box color: Should reflect PPE compliance, not identity. Green if APD lengkap (even if unknown person), red if APD violation or keluar zona.

**Fix**:
- Separate identity status from violation status
- Box color = green if no PPE violations, red if PPE violations or keluar zona
- Row 2 = only shown when there's a PPE violation or keluar zona, with red background
- Remove "Orang Tidak Dikenal" as a violation row — identity is already shown in row 1

#### 2. `Simulate.tsx` — Fix status calculation for overlay

**Current**: `status` is set to `'unknown'` when worker is null, which drives box color to orange.

**Fix**: Status should be based on PPE compliance, not identity:
- `'compliant'` if all PPE detected (regardless of identity)
- `'violation'` if any PPE missing or keluar zona

#### 3. `Simulate.tsx` — Fix badge in Hasil Deteksi (results panel)

The badge should also reflect jenis pelanggaran properly — currently for unknown persons it always shows "Tidak Dikenal" badge regardless of APD status.

#### 4. `detect-event/index.ts` — Fix face cropping for multi-person identification

The `jpeg-js` library may be producing images that AWS rejects. Potential issues:
- `Buffer.alloc` may not work in Deno (it's a Node.js API)
- The crop may produce too-small images
- Error is silently caught and skipped

**Fix**: Add better error logging, use `Uint8Array` instead of `Buffer`, and ensure the cropped JPEG is valid. Also increase padding to ensure enough face context for recognition.

### Files Changed
1. `src/components/simulate/BoundingBoxOverlay.tsx` — Decouple identity from violation; box color based on PPE compliance
2. `src/pages/Simulate.tsx` — Fix status logic and badge display
3. `supabase/functions/detect-event/index.ts` — Fix Buffer→Uint8Array in crop function, improve error handling

