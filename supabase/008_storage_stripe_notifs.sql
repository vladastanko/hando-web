-- ============================================================
-- HANDO — 008: Storage RLS + Notifications triggers
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── 1. Storage bucket policies ───────────────────────────────
-- Fix "new row violates row-level security policy" for avatar + verification uploads

-- Create bucket if missing
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-media', 'user-media', false)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar read" ON storage.objects;
DROP POLICY IF EXISTS "Verification upload" ON storage.objects;
DROP POLICY IF EXISTS "Verification read" ON storage.objects;
DROP POLICY IF EXISTS "user_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "user_media_select" ON storage.objects;
DROP POLICY IF EXISTS "user_media_update" ON storage.objects;
DROP POLICY IF EXISTS "user_media_delete" ON storage.objects;

-- Anyone authenticated can upload their own avatar (path: avatars/{user_id}.*)
CREATE POLICY "user_media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-media');

-- Anyone can read (avatars are displayed to all users)
CREATE POLICY "user_media_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-media');

-- Users can update/replace their own files
CREATE POLICY "user_media_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'user-media');

-- Users can delete their own files
CREATE POLICY "user_media_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[2]);


-- ─── 2. Notifications table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  data       JSONB,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_user_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_unread_idx ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;

CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
-- Allow server-side inserts (SECURITY DEFINER functions)
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (true);


-- ─── 3. Trigger: notify worker on application accepted ────────
CREATE OR REPLACE FUNCTION public.notify_on_application_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job   jobs%ROWTYPE;
  v_poster profiles%ROWTYPE;
BEGIN
  -- Only on status change
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  SELECT * INTO v_job FROM jobs WHERE id = NEW.job_id;
  SELECT * INTO v_poster FROM profiles WHERE id = v_job.poster_id;

  IF NEW.status = 'accepted' THEN
    -- Notify worker
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.worker_id,
      'application_accepted',
      '🎉 Application accepted!',
      'Your application for "' || v_job.title || '" was accepted by ' || v_poster.full_name || '. Check your inbox to coordinate.'
    );

  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.worker_id,
      'application_rejected',
      'Application not selected',
      'Your application for "' || v_job.title || '" was not selected this time.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_change ON public.applications;
CREATE TRIGGER on_application_change
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_application_change();


-- ─── 4. Trigger: notify poster on new application ─────────────
CREATE OR REPLACE FUNCTION public.notify_on_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job    jobs%ROWTYPE;
  v_worker profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_job FROM jobs WHERE id = NEW.job_id;
  SELECT * INTO v_worker FROM profiles WHERE id = NEW.worker_id;

  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    v_job.poster_id,
    'job_nearby',
    '📋 New application',
    v_worker.full_name || ' applied for "' || v_job.title || '"'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_application ON public.applications;
CREATE TRIGGER on_new_application
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_new_application();


-- ─── 5. Trigger: notify on new rating ─────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_new_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rater profiles%ROWTYPE;
  v_job   jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_rater FROM profiles WHERE id = NEW.rater_id;
  SELECT * INTO v_job   FROM jobs    WHERE id = NEW.job_id;

  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    NEW.ratee_id,
    'new_rating',
    '⭐ New rating received',
    v_rater.full_name || ' gave you ' || NEW.score || '/5 stars for "' || v_job.title || '"'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_rating ON public.ratings;
CREATE TRIGGER on_new_rating
  AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_new_rating();


-- ─── 6. Trigger: notify on job completed ──────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_job_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Notify all accepted workers
    INSERT INTO notifications (user_id, type, title, body)
    SELECT
      a.worker_id,
      'job_completed',
      '🏁 Job completed!',
      '"' || NEW.title || '" has been marked as complete. Please rate your employer.'
    FROM applications a
    WHERE a.job_id = NEW.id AND a.status = 'accepted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_job_completed ON public.jobs;
CREATE TRIGGER on_job_completed
  AFTER UPDATE ON public.jobs
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_job_completed();


-- ─── 7. Stripe payment_intents table (for future Stripe integration) ───
-- This table tracks pending and completed Stripe payments
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_pi_id     TEXT UNIQUE,
  package_id       UUID REFERENCES public.credit_packages(id),
  amount_rsd       INT NOT NULL,
  credits          INT NOT NULL,
  status           TEXT DEFAULT 'pending',  -- pending | succeeded | failed
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pi_select" ON public.payment_intents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pi_insert" ON public.payment_intents FOR INSERT WITH CHECK (auth.uid() = user_id);

SELECT '008_storage_stripe_notifs applied successfully' AS result;
