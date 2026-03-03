

# Phase 3-5 Implementation Plan

Phases 1 (Foundation) and 2 (Admin) are complete. The next phases to build are:

---

## Phase 3: Security Operator (3 pages)

### 3.1 Live Cameras (`/live-cameras`)
- Grid of camera cards (2-3 columns) showing camera name, zone, point type, and a placeholder thumbnail with a "LIVE" badge
- Filter by zone dropdown
- Each card shows status indicator (active/inactive)

### 3.2 Event Feed (`/events`)
- Table of today's detection events with real-time updates (Supabase realtime on `events` table)
- Columns: Waktu, Pekerja (nama + SID), Kamera, Zona, Tipe Event (color-coded badges: MASUK=green, KELUAR=orange, UNKNOWN=red), APD Status, Confidence
- APD status badge derived from `ppe_results` JSON (Lengkap / Perlu Perhatian)
- Click row to expand detail panel showing PPE breakdown items
- Date filter

### 3.3 Alert Inbox (`/alerts`)
- Table of alerts with columns: Waktu, Tipe Alert, Pekerja, Zona, Status (badge: BARU=red, DITERUSKAN=yellow, SELESAI=green)
- Filter by alert_type and status
- "Teruskan ke Supervisor" button on BARU alerts (updates status to DITERUSKAN)
- Notes field for operator comments

## Phase 4: Supervisor (2 pages)

### 4.1 Validasi Alert (`/validations`)
- List of DITERUSKAN alerts with event snapshot info, worker details
- Validation form dialog: Status (VALID / TIDAK_VALID), Alasan Keluar, APD manual check toggles, Komentar
- Submit inserts into `supervisor_validations` and updates alert status to SELESAI

### 4.2 Izin Keluar (`/exit-permits`)
- Table of exit permit requests with status badges
- Create permit request form (select worker, reason, valid_from, valid_until)
- Approve/Reject buttons for supervisors (updates status + approved_by)

## Phase 5: Safety Manager (3 pages)

### 5.1 Compliance Dashboard (`/compliance`)
- Summary cards: total events, total violations, compliance rate
- Bar chart: violations per day (last 7 days) using Recharts
- Pie chart: violation breakdown by type (UNAUTHORIZED_EXIT, APD_VIOLATION, UNKNOWN_PERSON)
- Data from `compliance_aggregates` + live queries on alerts/events

### 5.2 Rekap Pelanggaran (`/violations`)
- Worker violation table: nama, SID, total violations, last violation date
- Click to expand: full violation history per worker with alert type, zone, timestamp, validation status
- Filter by date range

### 5.3 Ekspor Laporan (`/reports`)
- Form: select report type, date range, format (PDF/Excel)
- Export history table from `report_exports`
- Generate button creates a record (actual file generation placeholder)

## Additional Data
- Insert 5 dummy `exit_permits` records with mixed statuses (PENDING, APPROVED, REJECTED)
- Insert 3 dummy `supervisor_validations` records

## Routing
- Add all 8 new routes to `App.tsx`, each wrapped in `AppLayout`
- Routes already referenced in `AppSidebar.tsx`, no sidebar changes needed

---

**Technical approach:**
- All pages use `@tanstack/react-query` for fetching, `supabase` client for CRUD
- Reuse existing UI components (Table, Card, Dialog, Badge, Select, Tabs)
- Recharts for charts on compliance page
- Enable realtime on `events` table for live feed
- Indonesian labels throughout

