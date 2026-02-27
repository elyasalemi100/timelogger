import { getProfileByUserId } from '@/lib/auth';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.id);
  if (!profile) return null;

  const businessId = profile.business_id;
  const business = profile.businesses as { name?: string; timezone?: string; settings?: Record<string, unknown> } | null;
  const settings = business?.settings ?? {};

  return (
    <SettingsClient
      businessId={businessId}
      businessName={business?.name ?? ''}
      timezone={business?.timezone ?? 'Australia/Melbourne'}
      photoRequiredClockIn={!!(settings as { photo_required_clock_in?: boolean }).photo_required_clock_in}
      photoRequiredClockOut={!!(settings as { photo_required_clock_out?: boolean }).photo_required_clock_out}
      gpsRequired={!!(settings as { gps_required?: boolean }).gps_required}
      gpsMinAccuracy={(settings as { gps_min_accuracy_meters?: number }).gps_min_accuracy_meters ?? 100}
    />
  );
}
