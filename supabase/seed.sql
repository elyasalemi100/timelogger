-- Seed: Demo business (run after migrations)
-- Requires at least one user in auth.users (sign up via Supabase Auth first)
DO $$
DECLARE
  demo_owner_id UUID;
  demo_owner_email TEXT;
  demo_business_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM businesses LIMIT 1) THEN
    RETURN; -- Already seeded
  END IF;

  SELECT id, email INTO demo_owner_id, demo_owner_email FROM auth.users LIMIT 1;
  IF demo_owner_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO businesses (id, name, timezone, owner_user_id)
  VALUES (gen_random_uuid(), 'Demo Business', 'Australia/Melbourne', demo_owner_id)
  RETURNING id INTO demo_business_id;

  INSERT INTO profiles (user_id, business_id, role, name, email, is_active)
  VALUES (demo_owner_id, demo_business_id, 'owner', 'Demo Owner', COALESCE(demo_owner_email, 'owner@demo.com'), true)
  ON CONFLICT (user_id, business_id) DO NOTHING;

  INSERT INTO subscriptions (business_id, plan, status, trial_ends_at, included_seats)
  VALUES (demo_business_id, 'plus', 'trialing', now() + interval '7 days', 3)
  ON CONFLICT (business_id) DO NOTHING;
END $$;
