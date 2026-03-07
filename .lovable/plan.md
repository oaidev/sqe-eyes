

## Problem

In `detect-event/index.ts` line 240, the worker lookup query filters by `.eq("is_active", true)`. Since the daily cron resets all workers to `is_active: false` at midnight, and workers only become active when detected, the very first detection always fails to match -- creating a chicken-and-egg problem.

## Fix

**File: `supabase/functions/detect-event/index.ts`**

Remove the `.eq("is_active", true)` filter from the workers query (line 240). All enrolled workers should be matchable regardless of active status. The `is_active` flag is meant for attendance tracking, not for controlling face recognition eligibility.

```typescript
// Before (line 237-240):
const { data: allWorkers } = await supabase
  .from("workers")
  .select("id, nama, sid, jabatan")
  .eq("is_active", true);

// After:
const { data: allWorkers } = await supabase
  .from("workers")
  .select("id, nama, sid, jabatan");
```

Single line change. No other files affected.

