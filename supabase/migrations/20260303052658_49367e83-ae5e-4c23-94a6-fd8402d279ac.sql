
-- Create worker-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-photos', 'worker-photos', true);

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload worker photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'worker-photos');

-- Allow authenticated users to view worker photos
CREATE POLICY "Anyone can view worker photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'worker-photos');

-- Allow admins to delete worker photos
CREATE POLICY "Admins can delete worker photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'worker-photos' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update worker photos
CREATE POLICY "Admins can update worker photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'worker-photos' AND public.has_role(auth.uid(), 'admin'));
