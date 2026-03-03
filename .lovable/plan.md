

# Plan: Assign Admin Role + Build Phase 2 (Admin System)

## Step 0: Assign Admin Role
- Insert `admin` role for user `farid.pamuji@smma.id` (ID: `9770dd33-a7e8-4941-9f07-ae2406f62f8b`) into `user_roles` table.

## Step 1: Dashboard — Connect to Real Data
- Update `Index.tsx` to fetch real counts from database (workers, zones, cameras, events today, alerts baru) instead of hardcoded values.

## Step 2: Worker Management Page (`/workers`)
- Full CRUD table page: list all workers with columns (SID, Nama, Jabatan, Departemen, Shift, Status, Enrollment)
- Add/Edit worker dialog form
- Delete worker confirmation
- Enrollment status badge (Terdaftar / Belum Didaftarkan)
- CSV import button (parse CSV and bulk insert)
- Search and filter by departemen/shift

## Step 3: Zone & Camera Management Page (`/zones`)
- List zones with site assignment and camera count
- Add/Edit zone dialog
- Expandable row showing cameras per zone
- Add/Edit camera dialog (name, RTSP URL, point_type: entry/exit/area)
- Camera active/inactive toggle

## Step 4: PPE Rules Page (`/ppe-rules`)
- Visual matrix: zones as rows, PPE items as columns (HEAD_COVER, HAND_COVER, FACE_COVER, safety_shoes, reflective_vest)
- Toggle required/not-required per cell
- Optional jabatan filter
- Auto-save on toggle

## Step 5: Access Rules Page (`/access-rules`)
- Table listing access rules per zone
- Add/Edit rule dialog: select zone, worker or jabatan, shift, time window (time_start, time_end)
- Active/inactive toggle
- Filter by zone

## Step 6: Routes & Navigation
- Add routes for `/workers`, `/zones`, `/ppe-rules`, `/access-rules` in `App.tsx`
- All wrapped in `AppLayout` with appropriate titles

---

**Technical notes:**
- All pages use `@tanstack/react-query` for data fetching with `supabase` client
- RLS is already configured: admin role can manage all tables, others can only view
- Existing UI components (Table, Card, Dialog, Form, Badge, etc.) will be reused
- Indonesian language labels throughout

