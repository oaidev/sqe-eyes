
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'supervisor', 'safety_manager');
CREATE TYPE public.camera_point_type AS ENUM ('entry', 'exit', 'area');
CREATE TYPE public.worker_shift AS ENUM ('day', 'night', 'rotating');
CREATE TYPE public.event_type AS ENUM ('MASUK', 'KELUAR', 'UNKNOWN');
CREATE TYPE public.ppe_item AS ENUM ('HEAD_COVER', 'HAND_COVER', 'FACE_COVER', 'SAFETY_SHOES', 'REFLECTIVE_VEST');
CREATE TYPE public.alert_type AS ENUM ('UNAUTHORIZED_EXIT', 'APD_VIOLATION', 'UNKNOWN_PERSON');
CREATE TYPE public.alert_status AS ENUM ('BARU', 'DITERUSKAN', 'SELESAI');
CREATE TYPE public.validation_status AS ENUM ('VALID', 'TIDAK_VALID');
CREATE TYPE public.permit_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.enrollment_status AS ENUM ('NOT_ENROLLED', 'ENROLLING', 'ENROLLED', 'FAILED');

-- ============================================
-- PROFILES TABLE (auto-created on signup)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- USER ROLES TABLE
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SITES
-- ============================================
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view sites" ON public.sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sites" ON public.sites FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- ZONES
-- ============================================
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view zones" ON public.zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage zones" ON public.zones FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- CAMERAS
-- ============================================
CREATE TABLE public.cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rtsp_url TEXT,
  point_type camera_point_type NOT NULL DEFAULT 'area',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view cameras" ON public.cameras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage cameras" ON public.cameras FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- WORKERS
-- ============================================
CREATE TABLE public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sid TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  jabatan TEXT NOT NULL,
  departemen TEXT NOT NULL,
  shift worker_shift NOT NULL DEFAULT 'day',
  foto_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  enrollment_status enrollment_status NOT NULL DEFAULT 'NOT_ENROLLED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view workers" ON public.workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage workers" ON public.workers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- WORKER FACE EMBEDDINGS
-- ============================================
CREATE TABLE public.worker_face_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  face_id TEXT,
  quality_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_face_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view embeddings" ON public.worker_face_embeddings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage embeddings" ON public.worker_face_embeddings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- ZONE PPE RULES
-- ============================================
CREATE TABLE public.zone_ppe_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  ppe_item ppe_item NOT NULL,
  jabatan TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(zone_id, ppe_item, jabatan)
);
ALTER TABLE public.zone_ppe_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view ppe rules" ON public.zone_ppe_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ppe rules" ON public.zone_ppe_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- ZONE ACCESS RULES
-- ============================================
CREATE TABLE public.zone_access_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  jabatan TEXT,
  shift worker_shift,
  time_start TIME,
  time_end TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.zone_access_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view access rules" ON public.zone_access_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage access rules" ON public.zone_access_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
  event_type event_type NOT NULL,
  confidence_score REAL,
  snapshot_url TEXT,
  clip_url TEXT,
  ppe_results JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- ALERTS
-- ============================================
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  status alert_status NOT NULL DEFAULT 'BARU',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators and admins can manage alerts" ON public.alerts FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'supervisor')
);
CREATE POLICY "System can insert alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- SUPERVISOR VALIDATIONS
-- ============================================
CREATE TABLE public.supervisor_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES auth.users(id),
  status validation_status NOT NULL,
  alasan_keluar TEXT,
  apd_manual_check JSONB DEFAULT '{}',
  komentar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supervisor_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view validations" ON public.supervisor_validations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Supervisors can insert validations" ON public.supervisor_validations FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- EXIT PERMITS
-- ============================================
CREATE TABLE public.exit_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  status permit_status NOT NULL DEFAULT 'PENDING',
  reason TEXT NOT NULL,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exit_permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view permits" ON public.exit_permits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert permits" ON public.exit_permits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Supervisors can update permits" ON public.exit_permits FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- COMPLIANCE AGGREGATES
-- ============================================
CREATE TABLE public.compliance_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  total_events INT NOT NULL DEFAULT 0,
  total_violations INT NOT NULL DEFAULT 0,
  violation_breakdown JSONB DEFAULT '{}',
  ppe_compliance JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compliance_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view aggregates" ON public.compliance_aggregates FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can manage aggregates" ON public.compliance_aggregates FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'safety_manager')
);

-- ============================================
-- REPORT EXPORTS
-- ============================================
CREATE TABLE public.report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_by UUID NOT NULL REFERENCES auth.users(id),
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_url TEXT,
  format TEXT NOT NULL DEFAULT 'pdf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own exports" ON public.report_exports FOR SELECT TO authenticated USING (auth.uid() = exported_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create exports" ON public.report_exports FOR INSERT TO authenticated WITH CHECK (auth.uid() = exported_by);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON public.zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cameras_updated_at BEFORE UPDATE ON public.cameras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exit_permits_updated_at BEFORE UPDATE ON public.exit_permits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
