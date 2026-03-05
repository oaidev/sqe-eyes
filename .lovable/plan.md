

## Plan: Hide PPE Checklist from Bounding Box for Keluar Zona

### Problem
When camera type is "Keluar Zona" (`KELUAR_TANPA_IZIN`), the bounding box overlay still shows PPE checklist (e.g. "Rompi Reflektif ✓, Helm ✗, ..."). This is irrelevant for zone-exit violations.

### Change

**`src/pages/Simulate.tsx`** (lines 326-333):
- When `r.jenisPelanggaran === 'KELUAR_TANPA_IZIN'`, set `ppeStatus` to `'Keluar Zona'` (or empty string) instead of listing PPE items.

```typescript
const ppeItems = r.jenisPelanggaran === 'KELUAR_TANPA_IZIN'
  ? 'Keluar Zona'
  : Object.entries(r.ppe_results)
      .map(([k, v]) => `${ppeLabel[k] || k} ${v.detected ? '✓' : '✗'}`)
      .join(', ');
```

### Files Changed
- `src/pages/Simulate.tsx` — conditional ppeStatus based on jenisPelanggaran

