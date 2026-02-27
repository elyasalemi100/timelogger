-- RLS Policies for ShiftSnap

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;

-- Helper: user is owner or admin of business
CREATE OR REPLACE FUNCTION is_business_admin(bid UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE business_id = bid AND user_id = uid
    AND role IN ('owner', 'admin') AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: user is employee (or admin) in business
CREATE OR REPLACE FUNCTION is_business_member(bid UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE business_id = bid AND user_id = uid AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Businesses: owner can do everything
CREATE POLICY "Owners manage own business"
  ON businesses FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Profiles: members see profiles in their business; admins manage
CREATE POLICY "Members see business profiles"
  ON profiles FOR SELECT
  USING (is_business_member(business_id, auth.uid()));

CREATE POLICY "Admins insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (is_business_admin(business_id, auth.uid()));

CREATE POLICY "Admins update profiles"
  ON profiles FOR UPDATE
  USING (is_business_admin(business_id, auth.uid()));

-- Users can update own profile (limited: name, wage if permitted - we restrict in app)
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Invites: admins manage; invitees can read by token (handled in app/function)
CREATE POLICY "Admins manage invites"
  ON invites FOR ALL
  USING (is_business_admin(business_id, auth.uid()))
  WITH CHECK (is_business_admin(business_id, auth.uid()));

-- Subscriptions: admins only
CREATE POLICY "Admins manage subscriptions"
  ON subscriptions FOR ALL
  USING (is_business_admin(business_id, auth.uid()))
  WITH CHECK (is_business_admin(business_id, auth.uid()));

-- Shifts: employees CRUD own; admins read all in business
CREATE POLICY "Employees read own shifts"
  ON shifts FOR SELECT
  USING (user_id = auth.uid() OR is_business_admin(business_id, auth.uid()));

CREATE POLICY "Employees insert own shifts"
  ON shifts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_business_member(business_id, auth.uid()));

CREATE POLICY "Employees update own open shifts"
  ON shifts FOR UPDATE
  USING (user_id = auth.uid() OR is_business_admin(business_id, auth.uid()));

-- Shift events: same as shifts
CREATE POLICY "Members read shift events"
  ON shift_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_id
      AND (s.user_id = auth.uid() OR is_business_admin(s.business_id, auth.uid()))
    )
  );

CREATE POLICY "Employees insert own shift events"
  ON shift_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins update shift events"
  ON shift_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_id AND is_business_admin(s.business_id, auth.uid())
    )
  );

-- Correction requests: employees create for own; admins read/update
CREATE POLICY "Members read correction requests"
  ON correction_requests FOR SELECT
  USING (user_id = auth.uid() OR is_business_admin(business_id, auth.uid()));

CREATE POLICY "Employees create correction requests"
  ON correction_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_business_member(business_id, auth.uid()));

CREATE POLICY "Admins update correction requests"
  ON correction_requests FOR UPDATE
  USING (is_business_admin(business_id, auth.uid()));

-- Audit log: admins read
CREATE POLICY "Admins read audit log"
  ON audit_log FOR SELECT
  USING (is_business_admin(business_id, auth.uid()));

CREATE POLICY "System insert audit log"
  ON audit_log FOR INSERT
  WITH CHECK (is_business_member(business_id, auth.uid()));

-- Notification tokens: own only
CREATE POLICY "Users manage own tokens"
  ON notification_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
