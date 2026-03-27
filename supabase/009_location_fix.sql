-- ============================================================
-- HANDO — 009: Location accuracy fix + update_user_location RPC
-- ============================================================

-- ─── 1. update_user_location RPC ─────────────────────────────
-- Updates the user's profile location as PostGIS geometry
CREATE OR REPLACE FUNCTION public.update_user_location(
  user_id UUID,
  lat     FLOAT8,
  lng     FLOAT8
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    location   = ST_SetSRID(ST_MakePoint(lng, lat), 4326),
    updated_at = now()
  WHERE id = user_id;
END;
$$;


-- ─── 2. Verify seed data coordinate order ────────────────────
-- PostGIS ST_MakePoint(X, Y) = ST_MakePoint(longitude, latitude)
-- Check that a few seed jobs have correct coords:
-- SELECT id, title, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng FROM jobs LIMIT 3;
-- Novi Sad should be around lat=45.26, lng=19.84
-- Belgrade should be around lat=44.82, lng=20.46


-- ─── 3. Refresh jobs_with_coords view ─────────────────────────
CREATE OR REPLACE VIEW public.jobs_with_coords AS
SELECT
  j.*,
  ST_Y(j.location::geometry) AS lat,
  ST_X(j.location::geometry) AS lng
FROM public.jobs j;

GRANT SELECT ON public.jobs_with_coords TO anon, authenticated;


-- ─── 4. Profile location column (as PostGIS geography) ────────
-- Add profile location column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN location GEOGRAPHY(Point, 4326);
  END IF;
END $$;

SELECT '009_location_fix applied successfully' AS result;
