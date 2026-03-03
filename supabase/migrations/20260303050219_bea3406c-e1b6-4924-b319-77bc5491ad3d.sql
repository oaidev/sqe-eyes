
-- Fix overly permissive INSERT policies
DROP POLICY "System can insert events" ON public.events;
CREATE POLICY "System can insert events" ON public.events FOR INSERT TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

DROP POLICY "System can insert alerts" ON public.alerts;
CREATE POLICY "System can insert alerts" ON public.alerts FOR INSERT TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));

DROP POLICY "Authenticated users can insert permits" ON public.exit_permits;
CREATE POLICY "Authenticated users can insert permits" ON public.exit_permits FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = requested_by);
