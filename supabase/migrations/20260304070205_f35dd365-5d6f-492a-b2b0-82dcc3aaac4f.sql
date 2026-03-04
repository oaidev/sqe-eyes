
-- 1. Add shift, shift_start, shift_end to zones
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS shift text DEFAULT 'day';
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS shift_start time DEFAULT '07:00';
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS shift_end time DEFAULT '17:00';

-- 2. Add SAFETY_GLASSES to ppe_item enum
ALTER TYPE public.ppe_item ADD VALUE IF NOT EXISTS 'SAFETY_GLASSES';

-- 3. Create alasan_type enum
DO $$ BEGIN
  CREATE TYPE public.alasan_type AS ENUM ('APD_TIDAK_LENGKAP', 'SUDAH_IZIN', 'LAINNYA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  page_key text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, page_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role_permissions"
  ON public.role_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view role_permissions"
  ON public.role_permissions FOR SELECT
  USING (true);

-- 5. Update supervisor_validations: add validation_level, alasan_type, operator support
ALTER TABLE public.supervisor_validations ADD COLUMN IF NOT EXISTS validation_level text DEFAULT 'operator';
ALTER TABLE public.supervisor_validations ADD COLUMN IF NOT EXISTS alasan_type public.alasan_type;
ALTER TABLE public.supervisor_validations ADD COLUMN IF NOT EXISTS alasan_text text;

-- Allow operators to insert validations too
DROP POLICY IF EXISTS "Supervisors can insert validations" ON public.supervisor_validations;
CREATE POLICY "Operators and supervisors can insert validations"
  ON public.supervisor_validations FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'operator'::app_role) OR 
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow update for supervisors to override
CREATE POLICY "Supervisors can update validations"
  ON public.supervisor_validations FOR UPDATE
  USING (
    has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 6. Link ppe rules to camera_id as well (currently only zone_id)
ALTER TABLE public.zone_ppe_rules ADD COLUMN IF NOT EXISTS camera_id uuid REFERENCES public.cameras(id) ON DELETE CASCADE;

-- 7. Seed default role_permissions for admin, operator, supervisor
INSERT INTO public.role_permissions (role, page_key, can_view, can_edit, can_delete) VALUES
  ('admin', 'dashboard', true, false, false),
  ('admin', 'workers', true, true, true),
  ('admin', 'zones', true, true, true),
  ('admin', 'users', true, true, true),
  ('admin', 'roles', true, true, true),
  ('admin', 'simulate', true, true, false),
  ('admin', 'operator-validation', true, true, true),
  ('admin', 'supervisor-validation', true, true, true),
  ('operator', 'dashboard', true, false, false),
  ('operator', 'operator-validation', true, true, false),
  ('supervisor', 'dashboard', true, false, false),
  ('supervisor', 'supervisor-validation', true, true, false)
ON CONFLICT (role, page_key) DO NOTHING;
