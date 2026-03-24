-- ============================================================
-- HANDO — Fix Functions v2
-- Run this in Supabase SQL Editor
-- Fixes: duplicate post_job, parameter naming ambiguity in get_nearby_jobs
-- ============================================================

-- ─── 1. DROP all versions of post_job to remove duplicate ────
DROP FUNCTION IF EXISTS public.post_job(uuid,text,text,uuid,text,text,float8,float8,timestamptz,int,int,int);
DROP FUNCTION IF EXISTS public.post_job(uuid,text,text,uuid,text,text,float8,float8,timestamptz,numeric,int,int);
DROP FUNCTION IF EXISTS public.post_job(uuid,text,text,uuid,text,text,double precision,double precision,timestamptz,integer,integer,integer);
DROP FUNCTION IF EXISTS public.post_job(uuid,text,text,uuid,text,text,double precision,double precision,timestamptz,numeric,integer,integer);

-- ─── 2. DROP get_nearby_jobs to fix parameter ambiguity ──────
DROP FUNCTION IF EXISTS public.get_nearby_jobs(float8,float8,float8);
DROP FUNCTION IF EXISTS public.get_nearby_jobs(double precision,double precision,double precision);


-- ─── 3. Recreate get_nearby_jobs with unambiguous param names ─
-- Uses p_lat/p_lng to avoid collision with RETURNS TABLE columns lat/lng
CREATE OR REPLACE FUNCTION public.get_nearby_jobs(
  p_lat      FLOAT8,
  p_lng      FLOAT8,
  radius_km  FLOAT8 DEFAULT 50
)
RETURNS TABLE (
  id               UUID,
  poster_id        UUID,
  title            TEXT,
  description      TEXT,
  category_id      UUID,
  address          TEXT,
  city             TEXT,
  lat              FLOAT8,
  lng              FLOAT8,
  scheduled_date   TIMESTAMPTZ,
  duration_hours   INT,
  pay_per_worker   INT,
  crew_size        INT,
  accepted_workers INT,
  status           TEXT,
  credits_spent    INT,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  distance_km      FLOAT8,
  category         JSONB,
  poster           JSONB
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
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000.0                  AS distance_km,
    to_jsonb(c.*)               AS category,
    jsonb_build_object(
      'id',                    p.id,
      'full_name',             p.full_name,
      'avatar_url',            p.avatar_url,
      'rating_as_poster',      p.rating_as_poster,
      'verification_status',   p.verification_status,
      'completed_jobs_poster', p.completed_jobs_poster
    )                           AS poster
  FROM   jobs j
  LEFT JOIN categories c ON c.id  = j.category_id
  LEFT JOIN profiles   p ON p.id  = j.poster_id
  WHERE
    j.status   = 'open'
    AND j.location IS NOT NULL
    AND ST_Distance(
          j.location::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) / 1000.0 <= radius_km
  ORDER BY distance_km ASC;
$$;


-- ─── 4. Recreate post_job with explicit INT casts ─────────────
CREATE OR REPLACE FUNCTION public.post_job(
  p_poster_id      UUID,
  p_title          TEXT,
  p_description    TEXT,
  p_category_id    UUID,
  p_address        TEXT,
  p_city           TEXT,
  p_lat            FLOAT8,
  p_lng            FLOAT8,
  p_scheduled_date TIMESTAMPTZ,
  p_duration_hours INT,
  p_pay_per_worker INT,
  p_crew_size      INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile  profiles%ROWTYPE;
  v_job_id   UUID;
  v_cost     INT := 10;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_poster_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;
  IF v_profile.credits < v_cost THEN
    RETURN jsonb_build_object('error', 'Not enough credits. Posting a job costs 10 credits.');
  END IF;

  UPDATE profiles
     SET credits    = credits - v_cost,
         updated_at = now()
   WHERE id = p_poster_id;

  INSERT INTO jobs (
    poster_id, title, description, category_id,
    address, city, location,
    scheduled_date, duration_hours, pay_per_worker, crew_size,
    status, accepted_workers, credits_spent
  ) VALUES (
    p_poster_id, p_title, p_description, p_category_id,
    p_address, p_city,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
    p_scheduled_date,
    p_duration_hours::INT,
    p_pay_per_worker::INT,
    p_crew_size::INT,
    'open', 0, v_cost
  ) RETURNING id INTO v_job_id;

  INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (
    p_poster_id, -v_cost, 'post_job',
    'Posted job: ' || p_title,
    v_profile.credits - v_cost
  );

  RETURN jsonb_build_object('id', v_job_id);
END;
$$;


-- ─── 5. Also fix apply_to_job (drop + recreate cleanly) ───────
DROP FUNCTION IF EXISTS public.apply_to_job(uuid,uuid,text);

CREATE OR REPLACE FUNCTION public.apply_to_job(
  p_job_id    UUID,
  p_worker_id UUID,
  p_message   TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job     jobs%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_app_id  UUID;
  v_cost    INT := 3;
BEGIN
  SELECT * INTO v_job FROM jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found');
  END IF;
  IF v_job.status != 'open' THEN
    RETURN jsonb_build_object('error', 'This job is no longer accepting applications');
  END IF;
  IF v_job.poster_id = p_worker_id THEN
    RETURN jsonb_build_object('error', 'You cannot apply to your own job');
  END IF;
  IF EXISTS (
    SELECT 1 FROM applications
     WHERE job_id = p_job_id AND worker_id = p_worker_id AND status != 'withdrawn'
  ) THEN
    RETURN jsonb_build_object('error', 'You have already applied to this job');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = p_worker_id;
  IF v_profile.credits < v_cost THEN
    RETURN jsonb_build_object('error', 'Not enough credits. Applying costs 3 credits.');
  END IF;

  UPDATE profiles
     SET credits = credits - v_cost, updated_at = now()
   WHERE id = p_worker_id;

  INSERT INTO applications (job_id, worker_id, message, status, credits_spent)
  VALUES (p_job_id, p_worker_id, p_message, 'pending', v_cost)
  RETURNING id INTO v_app_id;

  INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_worker_id, -v_cost, 'apply_job', 'Applied to: ' || v_job.title, v_profile.credits - v_cost);

  RETURN jsonb_build_object('id', v_app_id, 'status', 'pending');
END;
$$;


-- ─── 6. Recreate jobs_with_coords view (in case it's stale) ───
CREATE OR REPLACE VIEW public.jobs_with_coords AS
SELECT
  j.*,
  ST_Y(j.location::geometry) AS lat,
  ST_X(j.location::geometry) AS lng
FROM public.jobs j;

GRANT SELECT ON public.jobs_with_coords TO anon, authenticated;


SELECT 'Migration 006_fix_functions applied successfully' AS result;
