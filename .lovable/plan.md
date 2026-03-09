

## Plan: Replace All AWS Rekognition with Cosmos API

### Context

Replace **all** AWS Rekognition calls (face detection, face search, PPE detection) with a single Cosmos API that handles everything in one call. The API requires a login step to get a JWT token, then an infer endpoint that returns person detections with face recognition and PPE analysis built-in.

### API Response Analysis

The `/api/v1/infer` response contains detections where:
- **`class: "person"`** entries have: `face_name`, `similarity`, `ppe_valid`, `ppe_missing`, `bbox`
- **`class: "helmet"|"safety_vest"|etc`** entries have: `bbox`, `confidence` (individual PPE item boxes for visualization)

Key insight: the API already associates PPE to persons (`ppe_missing` is on the person detection), so we don't need the face-to-body overlap logic.

### Mapping

| API `ppe_missing` value | Internal Key |
|---|---|
| `"gloves"` | `HAND_COVER` |
| `"safety glasses"` | `SAFETY_GLASSES` |
| `"shoes"` | `SAFETY_SHOES` |
| `"vest"` | `REFLECTIVE_VEST` |
| `"helmet"` (inferred if not in detections) | `HEAD_COVER` |

| API `face_name` | Match to |
|---|---|
| Non-null string (e.g. "Carry") | `workers.nama` (case-insensitive lookup) |
| `null` / absent | Unknown person |

### Bounding Box Conversion

API returns `bbox: [x1, y1, x2, y2]` in **pixel coordinates**. Must normalize to `{Left, Top, Width, Height}` in 0-1 range using the image dimensions. Since the API returns a `frame` field (base64 image), we can decode dimensions from the input image or use a fixed known size.

**Approach**: Send image dimensions alongside the request, or extract from the input image bytes. The edge function already has `imageBytes` — we'll parse JPEG/PNG header for width/height.

### Credential Storage

Store Cosmos API credentials in `system_config`:
- `cosmos_api_url`: `"https://cosmos.squantumengine.com"`
- `cosmos_api_username`: `"admin"`
- `cosmos_api_password`: `"admin"`

This keeps them configurable without redeployment. Alternatively, use secrets for password — but since user provided them directly and they're `admin/admin`, system_config is fine for now.

### Files Changed

#### 1. Database — insert config rows
Insert into `system_config`:
- `cosmos_api_url` = `"https://cosmos.squantumengine.com"`
- `cosmos_api_username` = `"admin"`
- `cosmos_api_password` = `"admin"`

#### 2. `supabase/functions/detect-event/index.ts` — Major rewrite
- **Remove**: All AWS Signature V4 helpers, all Rekognition calls (DetectFaces, SearchFacesByImage, DetectProtectiveEquipment, DetectLabels), PPE_MAP, SHOE_LABELS, VEST_LABELS, bboxOverlap, uint8ToBase64
- **Add**:
  - `cosmosLogin(apiUrl, username, password)` → returns JWT token
  - `cosmosInfer(apiUrl, token, imageBytes)` → calls `/api/v1/infer` with multipart form-data, returns detections array
  - `getImageDimensions(bytes)` → parse JPEG/PNG header for width/height to normalize bboxes
  - `mapPpeMissing(ppe_missing)` → converts API's missing list to our internal PPE results format
- **New flow**:
  1. Read cosmos config from `system_config`
  2. Login to get token
  3. Call infer with image
  4. For each `class: "person"` detection:
     - Normalize bbox to 0-1 range
     - Look up `face_name` → match to `workers.nama` (case-insensitive) to get worker_id
     - Build `ppe_results` from `ppe_missing`: all 5 PPE items marked detected=true except those in ppe_missing
     - **But**: still apply zone PPE matrix rules (existing step 5-6 logic stays)
  5. Rest of logic (zone rules, event/alert creation) stays the same

#### 3. `supabase/functions/enroll-worker/index.ts` — Discuss impact
The Cosmos API uses `face_name` matching, not face_id from Rekognition IndexFaces. This means:
- **Face enrollment to AWS is no longer needed for detection** — the Cosmos API handles recognition internally
- However, the enrollment flow (upload photos → IndexFaces) may still be needed if Cosmos requires face registration
- **For now**: keep enroll-worker as-is since it's a separate concern. The user said "face recognition matching antara di kelola pekerja untuk face_name" — meaning the `nama` field in workers table is what gets matched to `face_name` from the API

#### 4. `BoundingBoxOverlay.tsx` — Minor update
- Also render individual PPE item bounding boxes (helmet, vest detections) returned by the API, not just person boxes
- This gives visual confirmation of what the model detected

#### 5. `Simulate.tsx` — No changes needed
- The frontend already sends `image_base64` and receives the same response structure

### Technical Detail: Image Dimension Parsing

To normalize pixel bboxes, we need image width/height. Simple approach:
```typescript
// Parse JPEG dimensions from SOF marker
function getJpegDimensions(bytes: Uint8Array): {w: number, h: number} { ... }
// Parse PNG dimensions from IHDR chunk
function getPngDimensions(bytes: Uint8Array): {w: number, h: number} { ... }
```

Alternative: use a fixed assumption (e.g., if the API always returns based on the original image dimensions) or include dimensions from the frontend.

### What Stays the Same
- Zone PPE rules logic (step 5-6)
- Event and alert creation
- Frontend components (BoundingBoxOverlay, Simulate.tsx result rendering)
- PPE labels and internal keys

