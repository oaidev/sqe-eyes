
-- Drop unused tables
DROP TABLE IF EXISTS public.compliance_aggregates CASCADE;
DROP TABLE IF EXISTS public.report_exports CASCADE;
DROP TABLE IF EXISTS public.zone_access_rules CASCADE;

-- Drop unused columns from cameras
ALTER TABLE public.cameras DROP COLUMN IF EXISTS detection_models;

-- Drop unused columns from zones
ALTER TABLE public.zones DROP COLUMN IF EXISTS shift;
ALTER TABLE public.zones DROP COLUMN IF EXISTS shift_start;
ALTER TABLE public.zones DROP COLUMN IF EXISTS shift_end;

-- Drop unused columns from events
ALTER TABLE public.events DROP COLUMN IF EXISTS clip_url;
ALTER TABLE public.events DROP COLUMN IF EXISTS confidence_score;

-- Drop workers.shift column then the enum
ALTER TABLE public.workers DROP COLUMN IF EXISTS shift;
DROP TYPE IF EXISTS public.worker_shift;
