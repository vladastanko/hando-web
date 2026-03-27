-- ============================================================
-- HANDO — 012: Auto move job to in_progress on first accept
-- ============================================================

-- Trigger: when application accepted, move job to in_progress
CREATE OR REPLACE FUNCTION public.auto_job_status_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Move job to in_progress when first worker accepted
    UPDATE public.jobs
    SET status = 'in_progress', updated_at = now()
    WHERE id = NEW.job_id
      AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_accept_move_to_progress ON public.applications;
CREATE TRIGGER on_accept_move_to_progress
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE PROCEDURE public.auto_job_status_on_accept();

-- Also update accepted_workers count on jobs
CREATE OR REPLACE FUNCTION public.sync_accepted_workers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.jobs
  SET accepted_workers = (
    SELECT COUNT(*) FROM public.applications
    WHERE job_id = NEW.job_id AND status = 'accepted'
  ), updated_at = now()
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_accepted_workers_trigger ON public.applications;
CREATE TRIGGER sync_accepted_workers_trigger
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE PROCEDURE public.sync_accepted_workers();

SELECT '012_auto_in_progress applied successfully' AS result;
