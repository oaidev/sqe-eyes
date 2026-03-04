
-- 1. Make events.camera_id nullable for simulation mode
ALTER TABLE public.events ALTER COLUMN camera_id DROP NOT NULL;

-- 2. Add UPDATE RLS policy on events for operators/admins/supervisors
CREATE POLICY "Operators admins supervisors can update events"
ON public.events
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'operator'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
);

-- 3. Add jenis_pelanggaran column to supervisor_validations
ALTER TABLE public.supervisor_validations ADD COLUMN jenis_pelanggaran text;

-- 4. Create event-snapshots storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event-snapshots', 'event-snapshots', true);

-- 5. RLS for event-snapshots bucket - anyone authenticated can read
CREATE POLICY "Anyone can view event snapshots"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'event-snapshots');

-- 6. Service role / admins / operators can upload
CREATE POLICY "Authenticated users can upload event snapshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-snapshots');
