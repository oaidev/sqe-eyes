

# SQE Eyes — Safety Monitoring Web App
### PT Bukit Makmur Mandiri Utama (Berau Coal, Indonesia)

A full-stack AI CCTV analytics app for workshop safety monitoring with face recognition & PPE detection.

---

## Phase 1: Foundation & Database Setup
- Set up Lovable Cloud (Supabase) with all core tables: **sites, zones, cameras, workers, worker_face_embeddings, zone_ppe_rules, zone_access_rules, events, alerts, supervisor_validations, exit_permits, compliance_aggregates, report_exports**
- Create user roles system (admin, operator, supervisor, safety_manager)
- Auth setup with login page (clean & light design theme)
- App shell: sidebar navigation, role-based menu, light/clean UI with blue accent colors
- Generate 5 dummy records per table (PT Bukit Makmur Mandiri Utama context: Site LMO Berau, zones like Workshop Bigshop, Workshop LCC, Office Area, Fuel Station, Parking Area)

## Phase 2: Role 1 — Admin System (Configuration)

### 2.1 Worker Management
- CRUD page for workers (nama, SID format SID-2024-XXX, jabatan, departemen, shift, foto, status aktif)
- Import from CSV support
- Enrollment badge status indicator (Terdaftar / Belum Didaftarkan)

### 2.2 Face Enrollment
- Upload 3-5 photos per worker interface
- Integration-ready with AWS Rekognition (Edge Function `enroll-worker`)
- Quality score display & enrollment status tracking

### 2.3 Zone & Camera Management
- CRUD zones with site assignment
- Camera management per zone (name, RTSP URL, point_type: entry/exit/area)
- Visual zone overview with camera count indicators

### 2.4 PPE Rules per Zone
- Configure required PPE items per zone & position (HEAD_COVER, HAND_COVER, FACE_COVER, safety_shoes, reflective_vest)
- Visual matrix of zone × PPE requirements

### 2.5 Zone Access Rules
- Define who can be in which zone and when (by worker or position)
- Shift-based time window configuration

## Phase 3: Role 2 — Security Operator (Control Room)

### 3.1 Live Multi-Camera View
- Grid view of all cameras per zone with simulated feed thumbnails
- AI overlay indicators (bounding box style display for detected workers)

### 3.2 Real-Time Event Feed
- Live scrolling list of today's detection events
- Worker photo, name, SID, time, position, event type (MASUK=green, KELUAR=orange, UNKNOWN=red)
- APD status badges (Lengkap / Perlu Perhatian)

### 3.3 Event Detail & Video Playback
- Click-to-expand detail panel: personal info, timestamp, camera, zone, PPE results breakdown, snapshot/clip viewer

### 3.4 Alert Inbox
- Filtered view: Unauthorized Exit, APD Violation, Unknown Person
- Alert status tracking: Baru → Diteruskan → Selesai
- Forward-to-supervisor action

## Phase 4: Role 3 — Supervisor

### 4.1 Alert Validation Inbox
- List of forwarded alerts with snapshot preview, worker info, camera, timestamp

### 4.2 Validation Form
- Status: Valid / Tidak Valid
- Fields: Alasan Keluar, APD manual check, Komentar
- Submit updates alert status to resolved

### 4.3 Exit Permit Approval
- Pending permit requests list
- Approve/Reject with time window (valid_from, valid_until)
- Active permits overview

## Phase 5: Role 4 — Safety Manager / HR (Reporting)

### 5.1 Weekly Compliance Dashboard
- Charts: violations per day/week, breakdown by type (Unauthorized Exit vs APD Violation)
- Worker violation ranking
- PPE compliance per item (which PPE is most often missing)

### 5.2 Worker Violation Recap
- Drill-down per worker: full violation history with filters
- Shows violation type, zone, confidence score, supervisor validation status

### 5.3 Weekly Report Export
- Generate PDF/Excel for selected period
- Summary + detail per worker + trend charts
- Export history tracking

## Phase 6: Edge Functions & AWS Integration
- Edge Function `enroll-worker`: sends photos to AWS Rekognition Face Collection
- Edge Function `detect-event`: processes camera frames for face recognition + PPE detection, creates events & alerts
- Secrets management for AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)

---

**Design:** Light & clean theme, professional blue accents, Indonesian language labels where appropriate, responsive layout optimized for control room monitors and desktop use.

**Dummy Data:** 5 realistic records per entity based on PT Bukit Makmur Mandiri Utama coal mining operations in Berau, Kalimantan Timur.

