## Plan: Form Validation, Required Markers & Role UI Fixes

### 1. Camera form — required fields + max chars (`Zones.tsx`)

- Add `<span className="text-red-500">*</span>` to Nama Kamera and RTSP URL labels
- Add `maxLength={100}` to camera name input, `maxLength={500}` to RTSP URL input
- Show character counter hint below each input (e.g., "0/100")
- Disable Simpan button when `!camForm.name || !camForm.rtsp_url`

### 2. Zone form — required marker + max chars (`Zones.tsx`)

- Add red `*` to Nama Zona label
- Add `maxLength={100}` to zone name input, `maxLength={250}` to description input
- Show character counter hints
- Nama Zona already required via `disabled={!zoneForm.name}`

### 3. All forms — required field indicators

- Invite User dialog (`Users.tsx`): red `*` on Email and Role labels (already required via button disable)
- Email: can only accept text in email format
- Nama Lengkap: change from "opsional" to required with red `*`, add `maxLength={100}`, disable Buat Akun when empty
- Show character counter for Nama Lengkap

### 4. Role display uppercase (`Users.tsx`)

- In the badge display (line 142), capitalize first letter: `u.role.charAt(0).toUpperCase() + u.role.slice(1)`
- Also in invite dialog role selector labels (already uppercase via ROLES const — confirmed OK)

### 5. Kelola Role — remove edit/delete toggles for specific pages (`Roles.tsx`)

- For pages: `dashboard`, `simulate` — only show "Lihat" toggle, hide "Edit" and "Hapus" columns
- For pages: `operator-validation`, `supervisor-validation` — only show "Lihat" and "Edit" toggle, hide "Hapus" column
- Implementation: define a set of view-only pages, conditionally render edit/delete switches as disabled or hidden for those pages

### Files Changed

1. `src/pages/Zones.tsx` — required markers, maxLength, character counters on zone & camera forms
2. `src/pages/Users.tsx` — required markers, nama lengkap required + max 100 chars, role badge uppercase
3. `src/pages/Roles.tsx` — hide edit/delete toggles for dashboard, simulasi deteksi, validasi operator, validasi supervisor