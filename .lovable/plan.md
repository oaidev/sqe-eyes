

## Plan: Fix Violation Flag Logic & Add Color Differentiation

### Problem Analysis
1. **"APD Tidak Lengkap" always shown**: Line 376-382 in `Simulate.tsx` unconditionally renders a destructive "APD Tidak Lengkap" badge for every detected person, regardless of actual PPE compliance. It should only show when there's a real PPE violation.

2. **`hasViolation` logic too broad**: Line 324 flags a person as violating if `!r.worker` (unknown) OR any PPE item not detected OR `alert_created`. Unknown persons get flagged red even when their PPE is fine — the violation is identity, not PPE.

### Changes

#### 1. Fix violation display in result cards (`Simulate.tsx`)
- Use the `alert_type` field from backend response to determine what to display
- Show "APD Tidak Lengkap" only when there are actual PPE violations (items with `detected: false`)
- Show "Tidak Dikenal" badge (warning/orange) when person is unknown but PPE is fine
- Show "APD Lengkap" (green) when all required PPE detected and worker is known
- Fix label "Keluar Tanpa Izin" → "Keluar Zona" (missed in earlier pass)

#### 2. Color scheme for bounding boxes (`BoundingBoxOverlay.tsx`)
Add a new `status` field to `PersonBox` interface with 3 states:
- **Red** (`#ef4444`): Known worker with PPE violation
- **Orange** (`#f97316`): Unknown/unrecognized person  
- **Green** (`#22c55e`): Known worker with APD lengkap

Update both SVG rect stroke colors and HTML label background colors accordingly.

#### 3. Update `hasViolation` mapping in `Simulate.tsx`
Replace the boolean `hasViolation` with a computed status based on:
- `r.worker` exists? → known vs unknown
- PPE items all detected? → compliant vs violation

### Files Changed
- `src/pages/Simulate.tsx` — fix violation badge logic, compute proper status
- `src/components/simulate/BoundingBoxOverlay.tsx` — support 3-color scheme

