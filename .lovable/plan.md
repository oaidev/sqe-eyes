

## Plan: Fix PPE Violation Logic to Respect Zone Rules

### Problem

The edge function builds PPE results for **all 5 items** from the Cosmos API's `ppe_missing` array. If the zone only requires helmet and vest, gloves/glasses/shoes are still marked as `detected: false` in the response. The frontend then checks `Object.values(ppe_results).some(v => !v.detected)` and incorrectly flags a violation.

### Root Cause

In `detect-event/index.ts`, `buildPpeResults()` (line 102-112) creates entries for all 5 PPE keys. The zone rules logic (line 338-357) only uses required items to populate `violations[]` for alert creation, but **does not filter `ppeResults`** — all 5 items remain in the response with their raw detection status.

### Fix

**In `supabase/functions/detect-event/index.ts`** (step 6, after zone rules are applied):

- After determining `requiredItems` from zone rules, **remove non-required items** from `person.ppeResults`
- This way only zone-relevant PPE items are returned to the frontend
- The frontend's existing `Object.values(ppe_results).some(v => !v.detected)` check will then only evaluate required items

```typescript
// After line 346 (requiredItems computed), add:
if (requiredItems.length > 0) {
  // Remove PPE items not required by zone rules
  for (const key of ALL_PPE_KEYS) {
    if (!requiredItems.includes(key)) {
      delete person.ppeResults[key];
    }
  }
}
```

This is a ~3 line change in the edge function. No frontend changes needed since the frontend already handles partial PPE results (shows "—" badge for missing keys).

