// Database enums (match Supabase)
export type ProfileRole = 'owner' | 'admin' | 'employee';
export type ShiftStatus = 'open' | 'submitted' | 'approved' | 'locked';
export type ShiftEventType = 'break_start' | 'break_end' | 'note';
export type CorrectionRequestStatus = 'pending' | 'approved' | 'denied';
export type PlanTier = 'trial' | 'plus' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';

export interface GeoStamp {
  lat: number;
  lng: number;
  accuracy?: number; // meters
  status: 'ok' | 'denied' | 'unavailable' | 'timeout';
  captured_at: string; // ISO
}

export interface Business {
  id: string;
  name: string;
  timezone: string;
  owner_user_id: string;
  created_at: string;
  settings?: BusinessSettings;
}

export interface BusinessSettings {
  photo_required_clock_in: boolean;
  photo_required_clock_out: boolean;
  gps_required: boolean;
  gps_min_accuracy_meters?: number;
  reminder_shift_hours?: number;
  reminder_break_minutes?: number;
}

export interface Profile {
  id: string;
  user_id: string;
  business_id: string;
  role: ProfileRole;
  name: string;
  email: string;
  wage_cents_per_hour: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Invite {
  id: string;
  business_id: string;
  email: string;
  role: ProfileRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface Subscription {
  id: string;
  business_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: PlanTier;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  included_seats: number;
  overage_seats: number;
  current_period_end: string | null;
}

export interface Shift {
  id: string;
  business_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  status: ShiftStatus;
  start_photo_path: string | null;
  end_photo_path: string | null;
  start_geo: GeoStamp | null;
  end_geo: GeoStamp | null;
  offline_pending?: boolean;
  created_at: string;
}

export interface ShiftEvent {
  id: string;
  shift_id: string;
  type: ShiftEventType;
  at: string;
  geo: GeoStamp | null;
  photo_path: string | null;
  meta: Record<string, unknown> | null;
}

export interface CorrectionRequest {
  id: string;
  business_id: string;
  shift_id: string;
  user_id: string;
  requested_changes: Record<string, unknown>;
  reason: string;
  status: CorrectionRequestStatus;
  admin_comment: string | null;
  created_at: string;
}

export const PLAN_INCLUDED_SEATS: Record<PlanTier, number> = {
  trial: 3,
  plus: 3,
  pro: 10,
  enterprise: 100,
};

export const PLAN_PRICES: Record<Exclude<PlanTier, 'trial'>, number> = {
  plus: 1000, // cents
  pro: 2000,
  enterprise: 10000,
};
