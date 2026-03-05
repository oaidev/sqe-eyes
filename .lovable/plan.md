

## Plan: Replace AWS Rekognition PPE Detection with Custom API

### Context

Currently, PPE detection uses 3 AWS Rekognition calls:
1. **DetectProtectiveEquipment** — helmet, gloves, safety glasses (per person)
2. **DetectLabels** — shoes, vest (global labels)

These will be replaced with a single call to a custom YOLO-based API that returns per-object bounding boxes with classes: helmet, safety_vest, gloves, shoes, safety_glasses.

AWS Rekognition will **still be used** for face detection (`DetectFaces`) and face identification (`SearchFacesByImage`).

### Class Mapping

| Custom API Class | Internal Key | Label |
|---|---|---|
| helmet | HEAD_COVER | Helm |
| safety_vest | REFLECTIVE_VEST | Rompi Reflektif |
| gloves | HAND_COVER | Sarung Tangan |
| shoes | SAFETY_SHOES | Sepatu Safety |
| safety_glasses | SAFETY_GLASSES | Kacamata Safety |

### Key Design Decision: Associating PPE with Persons

The custom API returns individual PPE item bounding boxes (not grouped by person like Rekognition). We need to associate PPE items to persons detected by `DetectFaces`. Strategy:
- For each detected PPE item bbox, check overlap with each person's face bbox (expanded to approximate body area)
- If overlap exists, assign that PPE item to that person
- If only 1 person detected, all PPE items are assigned to them

### Configuration

- Store the PPE API URL in `system_config` table with key `ppe_api_url` so it's easily changeable (no hardcoded ngrok URL)
- The edge function reads this URL at runtime

### Files Changed

#### 1. Database migration — add `ppe_api_url` to `system_config`
- Insert default row: key=`ppe_api_url`, value=`"https://1d3f-2404-8000-1012-8996-2ceb-c61d-d712-eaac.ngrok-free.app/api/v1/predict"`

#### 2. `supabase/functions/detect-event/index.ts`
- **Remove**: `DetectProtectiveEquipment` call (step 3), `DetectLabels` call (step 3b), related constants (`SHOE_LABELS`, `VEST_LABELS`)
- **Add**: `callPpeApi()` function that:
  - Converts image bytes to form-data with `file` field
  - POSTs to the custom API URL (fetched from `system_config`)
  - Parses response: extracts class name, confidence, and bounding box per detection
  - Maps class names → internal PPE keys
- **Update merge logic** (step 4): Instead of merging PPE-per-person from Rekognition, iterate PPE detections and assign to nearest person by bbox proximity
- Keep face detection (step 1) and face identification (step 2) unchanged

#### 3. `supabase/functions/process-video/index.ts`
- Same changes as detect-event: replace `DetectProtectiveEquipment` + `DetectLabels` in `processFrame()` with custom API call
- Reuse the same mapping and person-association logic

#### 4. No frontend changes needed
- The PPE key names (`HEAD_COVER`, `SAFETY_GLASSES`, etc.) and bounding box format remain identical, so `BoundingBoxOverlay`, `VideoEvidencePlayer`, `Simulate.tsx`, and validation pages work without modification

### API Response Assumption

Typical YOLO API response format (will adapt if different):
```json
{
  "predictions": [
    { "class": "helmet", "confidence": 0.95, "bbox": [x1, y1, x2, y2] },
    { "class": "gloves", "confidence": 0.87, "bbox": [x1, y1, x2, y2] }
  ]
}
```

Bounding box coordinates from the API (pixel-based) will be normalized to 0-1 range to match existing format.

