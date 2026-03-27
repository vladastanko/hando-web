-- ============================================================
-- HANDO — 010: Credit orders (bank transfer payment system)
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── 1. credit_orders table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id  UUID REFERENCES public.credit_packages(id),
  credits     INT NOT NULL,
  amount_rsd  INT NOT NULL,
  reference   TEXT NOT NULL UNIQUE,   -- e.g. HANDO-ABC123-PKG1
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  email       TEXT,
  admin_note  TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_orders_user_idx   ON public.credit_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_orders_status_idx ON public.credit_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_orders_ref_idx    ON public.credit_orders(reference);

ALTER TABLE public.credit_orders ENABLE ROW LEVEL SECURITY;

-- Users can see and create their own orders
CREATE POLICY "orders_select" ON public.credit_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders_insert" ON public.credit_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only service role (admin) can update orders
-- Frontend admin panel uses service role key


-- ─── 2. Function: approve_credit_order ───────────────────────
-- Call this from admin panel to approve an order and add credits
CREATE OR REPLACE FUNCTION public.approve_credit_order(order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order   credit_orders%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_new_bal INT;
BEGIN
  SELECT * INTO v_order FROM credit_orders WHERE id = order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order not found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order is not pending');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_order.user_id;

  v_new_bal := COALESCE(v_profile.credits, 0) + v_order.credits;

  -- Add credits
  UPDATE profiles
  SET credits = v_new_bal, updated_at = now()
  WHERE id = v_order.user_id;

  -- Record transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (
    v_order.user_id,
    v_order.credits,
    'purchase',
    'Bank transfer approved — ' || v_order.credits || ' credits (' || v_order.amount_rsd || ' RSD, ref: ' || v_order.reference || ')',
    v_new_bal
  );

  -- Mark order approved
  UPDATE credit_orders
  SET status = 'approved', approved_at = now(), updated_at = now()
  WHERE id = order_id;

  -- Send notification to user
  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    v_order.user_id,
    'job_nearby',
    '🪙 Credits added!',
    v_order.credits || ' credits have been added to your account. Your new balance is ' || v_new_bal || ' credits.'
  );

  RETURN jsonb_build_object('ok', true, 'new_balance', v_new_bal);
END;
$$;


-- ─── 3. Function: reject_credit_order ────────────────────────
CREATE OR REPLACE FUNCTION public.reject_credit_order(order_id UUID, reason TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order credit_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM credit_orders WHERE id = order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order not found');
  END IF;

  UPDATE credit_orders
  SET status = 'rejected', admin_note = reason, updated_at = now()
  WHERE id = order_id;

  -- Notify user
  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    v_order.user_id,
    'job_nearby',
    '❌ Payment not confirmed',
    'Your order for ' || v_order.credits || ' credits (ref: ' || v_order.reference || ') could not be confirmed.' ||
    CASE WHEN reason != '' THEN ' Reason: ' || reason ELSE ' Please contact support.' END
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;


-- ─── 4. Admin view — all pending orders with user info ────────
CREATE OR REPLACE VIEW public.admin_credit_orders AS
SELECT
  o.id,
  o.reference,
  o.credits,
  o.amount_rsd,
  o.status,
  o.email,
  o.admin_note,
  o.created_at,
  o.approved_at,
  p.full_name,
  p.id AS user_id
FROM credit_orders o
JOIN profiles p ON p.id = o.user_id
ORDER BY o.created_at DESC;

-- Note: this view is only accessible via service role key (admin)
-- To approve: SELECT approve_credit_order('ORDER_UUID_HERE');
-- To reject:  SELECT reject_credit_order('ORDER_UUID_HERE', 'Payment not received');

SELECT '010_credit_orders applied successfully' AS result;
