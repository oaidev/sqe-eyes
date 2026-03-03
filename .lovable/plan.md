

# Phase 6: Edge Functions & AWS Rekognition Integration

## Status
Phases 1-5 are **complete** — all 15 pages are built. **Phase 6 (Edge Functions & AWS Integration) has NOT been implemented yet.** There are zero edge functions in the project.

## What needs to be built

### 6.1 Edge Function: `enroll-worker`
- Accepts worker ID + photo URLs
- Sends photos to **AWS Rekognition** `IndexFaces` API to register faces into a Face Collection
- Stores returned `FaceId` and quality score in `worker_face_embeddings` table
- Updates worker `enrollment_status` to `ENROLLED`
- Called from the Workers page when admin clicks "Daftarkan Wajah"

### 6.2 Edge Function: `detect-event`
- Accepts camera frame (image URL or base64) + camera ID
- Calls **AWS Rekognition** `SearchFacesByImage` to identify worker
- Calls a PPE detection model (Rekognition `DetectProtectiveEquipment`) for PPE compliance check
- Creates an `events` record with detected worker, event type, PPE results, confidence score
- If violation detected, creates an `alerts` record automatically
- This would be called by the camera pipeline (integration-ready endpoint)

### 6.3 Storage Bucket
- Create a `worker-photos` storage bucket for face enrollment images
- Update Workers page to upload photos to storage before calling enroll-worker

### 6.4 Frontend Integration
- Add "Daftarkan Wajah" button on Workers page that uploads photos and calls `enroll-worker`
- Show enrollment progress and quality scores from `worker_face_embeddings`

## AWS Credentials Required
Three secrets need to be configured:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (e.g. `ap-southeast-1`)

I will need to request these from you before proceeding with implementation.

## Technical approach
- Edge functions use Deno `fetch` to call AWS Rekognition REST API with AWS Signature V4 signing
- CORS headers included for browser calls
- `verify_jwt = false` in config.toml with manual auth validation in code
- Supabase service role key used server-side for DB writes

---

**Do you want to proceed?** I will first ask you to provide the 3 AWS secrets, then build the edge functions and frontend integration.

