
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

ALTER TABLE public.cameras
  ADD COLUMN off_time_start time DEFAULT NULL,
  ADD COLUMN off_time_end time DEFAULT NULL,
  ADD COLUMN detection_models text[] DEFAULT '{}';
