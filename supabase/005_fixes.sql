-- ============================================================
-- HANDO — Critical Fixes Migration v2
-- Run this in Supabase SQL Editor to fix all known issues
-- ============================================================

-- ─── 1. PROFILES auto-create trigger ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, credits, role,
    rating_as_worker, rating_as_poster,
    total_ratings_worker, total_ratings_poster,
    completed_jobs_worker, completed_jobs_poster,
    verification_status, is_email_verified, is_phone_verified,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    20, 'both', 0, 0, 0, 0, 0, 0,
    'unverified', false, false,
    now(), now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ─── 2. JOBS VIEW with extracted PostGIS coordinates ──────────
-- The jobs table stores location as PostGIS geometry (ST_MakePoint)
-- This view extracts lat/lng as plain floats for the frontend

CREATE OR REPLACE VIEW public.jobs_with_coords AS
SELECT
  j.*,
  ST_Y(j.location::geometry) AS lat,
  ST_X(j.location::geometry) AS lng
FROM public.jobs j;

-- Grant access to the view
GRANT SELECT ON public.jobs_with_coords TO anon, authenticated;


-- ─── 3. get_nearby_jobs — rewritten to use PostGIS properly ───
CREATE OR REPLACE FUNCTION public.get_nearby_jobs(
  lat FLOAT8,
  lng FLOAT8,
  radius_km FLOAT8 DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  poster_id UUID,
  title TEXT,
  description TEXT,
  category_id UUID,
  address TEXT,
  city TEXT,
  lat FLOAT8,
  lng FLOAT8,
  scheduled_date TIMESTAMPTZ,
  duration_hours INT,
  pay_per_worker INT,
  crew_size INT,
  accepted_workers INT,
  status TEXT,
  credits_spent INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_km FLOAT8,
  category JSONB,
  poster JSONB
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    j.id,
    j.poster_id,
    j.title,
    j.description,
    j.category_id,
    j.address,
    j.city,
    ST_Y(j.location::geometry)  AS lat,
    ST_X(j.location::geometry)  AS lng,
    j.scheduled_date,
    j.duration_hours,
    j.pay_per_worker,
    j.crew_size,
    j.accepted_workers,
    j.status::TEXT,
    j.credits_spent,
    j.created_at,
    j.updated_at,
    ST_Distance(
      j.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000.0 AS distance_km,
    to_jsonb(c.*) AS category,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'rating_as_poster', p.rating_as_poster,
      'verification_status', p.verification_status,
      'completed_jobs_poster', p.completed_jobs_poster
    ) AS poster
  FROM jobs j
  LEFT JOIN categories c ON c.id = j.category_id
  LEFT JOIN profiles p ON p.id = j.poster_id
  WHERE
    j.status = 'open'
    AND j.location IS NOT NULL
    AND ST_Distance(
      j.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000.0 <= radius_km
  ORDER BY distance_km ASC;
$$;


-- ─── 4. post_job — use PostGIS for location ───────────────────
CREATE OR REPLACE FUNCTION public.post_job(
  p_poster_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_category_id UUID,
  p_address TEXT,
  p_city TEXT,
  p_lat FLOAT8,
  p_lng FLOAT8,
  p_scheduled_date TIMESTAMPTZ,
  p_duration_hours INT,
  p_pay_per_worker INT,
  p_crew_size INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_job_id UUID;
  v_cost INT := 10;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_poster_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;
  IF v_profile.credits < v_cost THEN
    RETURN jsonb_build_object('error', 'Not enough credits. Posting a job costs 10 credits.');
  END IF;

  UPDATE profiles SET credits = credits - v_cost, updated_at = now() WHERE id = p_poster_id;

  INSERT INTO jobs (
    poster_id, title, description, category_id,
    address, city, location,
    scheduled_date, duration_hours, pay_per_worker, crew_size,
    status, accepted_workers, credits_spent
  ) VALUES (
    p_poster_id, p_title, p_description, p_category_id,
    p_address, p_city,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    p_scheduled_date, p_duration_hours, p_pay_per_worker, p_crew_size,
    'open', 0, v_cost
  ) RETURNING id INTO v_job_id;

  INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_poster_id, -v_cost, 'post_job', 'Posted job: ' || p_title, v_profile.credits - v_cost);

  RETURN jsonb_build_object('id', v_job_id);
END;
$$;


-- ─── 5. apply_to_job RPC ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_to_job(
  p_job_id UUID,
  p_worker_id UUID,
  p_message TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job jobs%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_app_id UUID;
  v_cost INT := 3;
BEGIN
  SELECT * INTO v_job FROM jobs WHERE id = p_job_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Job not found'); END IF;
  IF v_job.status != 'open' THEN RETURN jsonb_build_object('error', 'This job is no longer accepting applications'); END IF;
  IF v_job.poster_id = p_worker_id THEN RETURN jsonb_build_object('error', 'You cannot apply to your own job'); END IF;

  IF EXISTS (SELECT 1 FROM applications WHERE job_id = p_job_id AND worker_id = p_worker_id AND status != 'withdrawn') THEN
    RETURN jsonb_build_object('error', 'You have already applied to this job');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = p_worker_id;
  IF v_profile.credits < v_cost THEN
    RETURN jsonb_build_object('error', 'Not enough credits. Applying costs 3 credits.');
  END IF;

  UPDATE profiles SET credits = credits - v_cost, updated_at = now() WHERE id = p_worker_id;

  INSERT INTO applications (job_id, worker_id, message, status, credits_spent)
  VALUES (p_job_id, p_worker_id, p_message, 'pending', v_cost)
  RETURNING id INTO v_app_id;

  INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_worker_id, -v_cost, 'apply_job', 'Applied to: ' || v_job.title, v_profile.credits - v_cost);

  RETURN jsonb_build_object('id', v_app_id, 'status', 'pending');
END;
$$;


-- ─── 6. PROFILES RLS ──────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (true);


-- ─── 7. VERIFICATIONS table + RLS ────────────────────────────
CREATE TABLE IF NOT EXISTS public.verifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  id_document_url TEXT,
  selfie_url    TEXT,
  status        TEXT DEFAULT 'pending',
  submitted_at  TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "verif_select" ON public.verifications;
DROP POLICY IF EXISTS "verif_insert" ON public.verifications;
DROP POLICY IF EXISTS "verif_update" ON public.verifications;
CREATE POLICY "verif_select" ON public.verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "verif_insert" ON public.verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verif_update" ON public.verifications FOR UPDATE USING (auth.uid() = user_id);


-- ─── 8. JOBS RLS ──────────────────────────────────────────────
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jobs_select" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update" ON public.jobs;
CREATE POLICY "jobs_select" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "jobs_insert" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "jobs_update" ON public.jobs FOR UPDATE USING (auth.uid() = poster_id);


-- ─── 9. APPLICATIONS RLS ──────────────────────────────────────
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apps_select" ON public.applications;
DROP POLICY IF EXISTS "apps_insert" ON public.applications;
DROP POLICY IF EXISTS "apps_update" ON public.applications;
CREATE POLICY "apps_select" ON public.applications FOR SELECT USING (
  auth.uid() = worker_id OR
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.poster_id = auth.uid())
);
CREATE POLICY "apps_insert" ON public.applications FOR INSERT WITH CHECK (auth.uid() = worker_id);
CREATE POLICY "apps_update" ON public.applications FOR UPDATE USING (
  auth.uid() = worker_id OR
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.poster_id = auth.uid())
);


-- ─── 10. RATINGS RLS ──────────────────────────────────────────
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ratings_select" ON public.ratings;
DROP POLICY IF EXISTS "ratings_insert" ON public.ratings;
CREATE POLICY "ratings_select" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);


-- ─── 11. CREDIT PACKAGES seed ─────────────────────────────────
INSERT INTO public.credit_packages (name, credits, price_rsd, is_active)
SELECT * FROM (VALUES
  ('Starter', 30, 299, true),
  ('Standard', 100, 799, true),
  ('Pro', 250, 1499, true)
) AS v(name, credits, price_rsd, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.credit_packages LIMIT 1);


-- ─── 12. CREDIT TRANSACTIONS RLS ──────────────────────────────
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tx_select" ON public.credit_transactions;
DROP POLICY IF EXISTS "tx_insert" ON public.credit_transactions;
CREATE POLICY "tx_select" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tx_insert" ON public.credit_transactions FOR INSERT WITH CHECK (true);

SELECT 'Migration 005_fixes v2 applied successfully' AS result;

