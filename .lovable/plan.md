

## Plan: Multi-Face Identification & Redesigned Bounding Box Overlay

### Issue 1: Only 1 face identified in multi-person images

**Root cause**: `SearchFacesByImage` (line 242-250) uses `MaxFaces: 1`, so AWS only identifies the largest/most prominent face. The second person always shows as "Tidak Dikenal".

**Fix** (`supabase/functions/detect-event/index.ts`):
- After DetectFaces returns all face bounding boxes, crop each face individually from the image using canvas-like pixel extraction (base64 crop)
- For each cropped face, call `SearchFacesByImage` separately so each person can be identified
- This replaces the single `SearchFacesByImage` call with a loop over all detected faces

Since Edge Functions (Deno) don't have Canvas API, alternative approach:
- Use `IndexFaces` with `MaxFaces: 1` per call won't work either since we can't crop
- Better approach: Call `SearchFacesByImage` multiple times isn't possible with full image (always returns largest face)
- **Best approach**: Use `IndexFaces` temporarily or use AWS `SearchFacesByImage` but with image cropping via bounding box coordinates. AWS Rekognition does NOT support crop parameters directly.
- **Practical solution**: After detecting all faces with `DetectFaces`, iterate through faces. For the first identification, use `SearchFacesByImage` as-is (identifies largest face). For remaining unidentified faces — we can't crop server-side easily in Deno without image libraries.

**Revised approach**: Instead of cropping, we can use the fact that `SearchFacesByImage` returns `SearchedFaceBoundingBox`. We'll call it once but then also try `SearchFaces` using FaceIds from an indexed collection. However, we'd need faces already indexed.

**Most practical fix**: Change `MaxFaces` to a higher number (e.g., 5) in `SearchFacesByImage`. AWS `SearchFacesByImage` with `MaxFaces > 1` still only searches for the **single largest face** in the input image — `MaxFaces` controls how many matches to return from the collection, not how many faces to search.

**Actual solution**: We need to crop faces client-side before sending, OR use a workaround:
1. Use the detected face bounding boxes from `DetectFaces` 
2. For each face, crop the base64 image to that bounding box region using Deno image manipulation
3. Call `SearchFacesByImage` for each cropped face image

I'll implement face cropping in the edge function using raw pixel manipulation of the base64 JPEG. We can use the `imagescript` Deno library or do a simpler approach: pass bounding box info and use a pure-JS JPEG crop library.

**Simplest reliable approach**: Use the npm package available via esm.sh for image cropping in Deno, or manually construct cropped images. Given complexity, the most pragmatic path is:
- Decode base64 to raw bytes
- Use `sharp` or a lightweight alternative via esm.sh
- Crop each face region and search separately

### Issue 2: Redesigned Bounding Box Overlay

**Current**: Single label bar above bounding box with name + PPE checklist in one line.

**New design** — two-row label per person:
- **Row 1 (Identity)**: Green background if recognized, orange if unknown. Shows `#N Name` or `#N Tidak Dikenal`
- **Row 2 (Violation)**: Red background. For "Keluar Zona": shows "Pekerja Keluar Dari Area Kerja". For APD violations: shows only the missing PPE items with ✗ icons. Hidden if compliant (no violations).

**Changes to `BoundingBoxOverlay.tsx`**:
- Add `jenisPelanggaran` field to `PersonBox` interface
- Split the label into two rows: identity row + violation row
- Identity row: green (known) or orange (unknown)
- Violation row: red, only shown when there's a violation

**Changes to `Simulate.tsx`**:
- Pass `jenisPelanggaran` to the overlay component
- Update ppeStatus to only contain violation items (missing PPE with ✗)

### Files Changed
1. `supabase/functions/detect-event/index.ts` — Loop `SearchFacesByImage` per cropped face for multi-person identification
2. `src/components/simulate/BoundingBoxOverlay.tsx` — Two-row label design (identity + violation)
3. `src/pages/Simulate.tsx` — Pass jenisPelanggaran to overlay, adjust ppeStatus generation

