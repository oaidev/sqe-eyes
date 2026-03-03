

# Fix: Maximum call stack size exceeded & Hide Technical Labels

## Root Cause
Both `detect-event` and `enroll-worker` edge functions use:
```js
btoa(String.fromCharCode(...imgBytes))
```
The spread operator passes every byte as a separate argument to `String.fromCharCode()`. Even a 300KB image = ~300,000 arguments, exceeding the JavaScript call stack limit.

## Fix 1: Edge Functions — chunked base64 encoding
Replace the problematic `btoa(String.fromCharCode(...imgBytes))` pattern in both files with a chunked approach:
```js
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
```
This processes 8KB chunks at a time, avoiding stack overflow.

**Files affected:**
- `supabase/functions/detect-event/index.ts` — line 119 (`imageB64` assignment) and anywhere else using the spread pattern
- `supabase/functions/enroll-worker/index.ts` — line 137 (inside `IndexFaces` call)

## Fix 2: Hide Technical Labels from UI
Update user-facing text to remove references to "AWS Rekognition" and other internal details:

- `src/components/workers/EnrollFaceDialog.tsx`: Change progress text "Mendaftarkan wajah ke AWS Rekognition..." → "Memproses pendaftaran wajah..."
- `src/components/cameras/SimulateCameraDialog.tsx`: Review and remove any technical service references in UI labels

