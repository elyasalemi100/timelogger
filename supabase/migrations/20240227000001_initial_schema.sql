-- ShiftSnap Initial Schema
-- Enums
CREATE TYPE profile_role AS ENUM ('owner', 'admin', 'employee');
CREATE TYPE shift_status AS ENUM ('open', 'submitted', 'approved', 'locked');
CREATE TYPE shift_event_type AS ENUM ('break_start', 'break_end', 'note');
CREATE TYPE correction_status AS ENUM ('pending', 'approved', 'denied');
CREATE TYPE plan_tier AS ENUM ('trial', 'plus', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');

-- Businesses
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Australia/Melbourne',
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{"photo_required_clock_in":true,"photo_required_clock_out":false,"gps_required":true,"gps_min_accuracy_meters":100}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (links auth.users to business + role)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role profile_role NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  wage_cents_per_hour INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_business_id ON profiles(business_id);

-- Invites
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role profile_role NOT NULL DEFAULT 'employee',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_business_id ON invites(business_id);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan plan_tier NOT NULL DEFAULT 'trial',
  status subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  included_seats INTEGER NOT NULL DEFAULT 3,
  overage_seats INTEGER NOT NULL DEFAULT 0,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_business_id ON subscriptions(business_id);

-- Shifts
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status shift_status NOT NULL DEFAULT 'open',
  start_photo_path TEXT,
  end_photo_path TEXT,
  start_geo JSONB,
  end_geo JSONB,
  offline_pending BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shifts_business_id ON shifts(business_id);
CREATE INDEX idx_shifts_user_id ON shifts(user_id);
CREATE INDEX idx_shifts_started_at ON shifts(started_at);
CREATE INDEX idx_shifts_status ON shifts(status);

-- Shift events (breaks, notes)
CREATE TABLE shift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  type shift_event_type NOT NULL,
  at TIMESTAMPTZ NOT NULL,
  geo JSONB,
  photo_path TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_events_shift_id ON shift_events(shift_id);

-- Correction requests
CREATE TABLE correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_changes JSONB NOT NULL,
  reason TEXT NOT NULL,
  status correction_status NOT NULL DEFAULT 'pending',
  admin_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_correction_requests_business_id ON correction_requests(business_id);
CREATE INDEX idx_correction_requests_shift_id ON correction_requests(shift_id);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_business_id ON audit_log(business_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Notification tokens (push)
CREATE TABLE notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_info JSONB,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

CREATE INDEX idx_notification_tokens_user_id ON notification_tokens(user_id);

-- Storage bucket for shift photos
INSERT INTO storage.buckets (id, name, public) VALUES ('shift-photos', 'shift-photos', false);

-- RLS policies for shift-photos
CREATE POLICY "Users can upload own shift photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'shift-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can read own shift photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shift-photos' AND auth.role() = 'authenticated');
