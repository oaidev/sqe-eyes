

## Plan: Replace AWS Face Enrollment with Cosmos API Face Management

### Context

The `enroll-worker` edge function currently uses AWS Rekognition `IndexFaces` to register worker faces. This needs to be replaced with the Cosmos API face endpoints so face recognition during inference (`/api/v1/infer`) actually works — Cosmos can only recognize faces that were registered through its own `/api/v1/faces` endpoint.

### API Endpoints

| Action | Method | Endpoint | Body |
|---|---|---|---|
| Submit face | POST | `/api/v1/faces` | multipart: `name`, `photo`, `employee_id` |
| List faces | GET | `/api/v1/faces` | — |
| Get a face | GET | `/api/v1/faces/:id` | — |
| Delete face | DELETE | `/api/v1/faces/:id` | — |

All require `Authorization: Bearer <token>` from the login step.

### Changes

#### 1. `supabase/functions/enroll-worker/index.ts` — Full rewrite

- Remove all AWS Signature V4 code and Rekognition calls
- Add Cosmos login + face submission logic
- Support 3 actions via request body `{ action, worker_id, photo_urls?, cosmos_face_id? }`:
  - **`enroll`** (default): Login to Cosmos, upload each photo via `POST /api/v1/faces` with `name=worker.nama`, `employee_id=worker.sid`, save returned face ID to `worker_face_embeddings`
  - **`delete`**: Call `DELETE /api/v1/faces/:cosmos_face_id`, remove from `worker_face_embeddings`
  - **`list`**: Call `GET /api/v1/faces` and return the list
- Read Cosmos credentials from `system_config` (same as detect-event)

#### 2. `src/components/workers/EnrollFaceDialog.tsx` — Update UI

- Show existing registered faces with a delete button per face (calls enroll-worker with `action: "delete"`)
- On enroll, send photo files to the edge function (upload to storage first, then pass URLs — same flow but edge function now calls Cosmos instead of AWS)
- Display cosmos face ID from the response

#### 3. No database changes needed

`worker_face_embeddings` table already has `face_id` (text) and `photo_url` fields which will store the Cosmos face ID and photo URL respectively.

### Flow

```text
User uploads photo → storage upload → enroll-worker edge function
  → cosmosLogin() → POST /api/v1/faces (name, photo, employee_id)
  → save face_id to worker_face_embeddings
  → update worker.enrollment_status
```

For delete:
```text
User clicks delete → enroll-worker (action: "delete", cosmos_face_id)
  → cosmosLogin() → DELETE /api/v1/faces/:id
  → remove from worker_face_embeddings
```

