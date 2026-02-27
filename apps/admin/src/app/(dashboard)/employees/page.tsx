import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { EmployeesClient } from './EmployeesClient';
import { getProfileByUserId } from '@/lib/auth';
import { createClient as createServerClient } from '@/lib/supabase/server';

export default async function EmployeesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.id);
  if (!profile) return null;

  const businessId = profile.business_id;
  const timezone = (profile.businesses as { timezone?: string })?.timezone ?? 'Australia/Melbourne';

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(serviceUrl, serviceKey);

  const { data: employees } = await admin
    .from('profiles')
    .select('id, user_id, name, email, role, wage_cents_per_hour, is_active, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true });

  const { data: sub } = await admin
    .from('subscriptions')
    .select('included_seats, overage_seats, status')
    .eq('business_id', businessId)
    .single();

  const activeCount = (employees ?? []).filter((e) => e.is_active).length;
  const includedSeats = sub?.included_seats ?? 3;
  const canInvite = (sub?.status === 'active' || sub?.status === 'trialing') && activeCount < includedSeats + (sub?.overage_seats ?? 0);

  return (
    <EmployeesClient
      employees={employees ?? []}
      businessId={businessId}
      canInvite={!!canInvite}
      includedSeats={includedSeats}
      activeCount={activeCount}
    />
  );
}
