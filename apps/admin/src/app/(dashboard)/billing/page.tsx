import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { BillingClient } from './BillingClient';
import { getProfileByUserId } from '@/lib/auth';
import { createClient as createServerClient } from '@/lib/supabase/server';

export default async function BillingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.id);
  if (!profile) return null;

  const businessId = profile.business_id;

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(serviceUrl, serviceKey);

  const { data: sub } = await admin
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .single();

  const { count: activeCount } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('is_active', true);

  return (
    <BillingClient
      subscription={sub}
      activeCount={activeCount ?? 0}
    />
  );
}
