import { createClient } from '@supabase/supabase-js';

export type ProfileWithBusiness = {
  id: string;
  user_id: string;
  business_id: string;
  role: 'owner' | 'admin' | 'employee';
  name: string;
  email: string;
  wage_cents_per_hour: number | null;
  is_active: boolean;
  businesses: { id: string; name: string; timezone: string } | null;
};

export async function getProfileByUserId(userId: string): Promise<ProfileWithBusiness | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data } = await supabase
    .from('profiles')
    .select('*, businesses(id, name, timezone)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single();

  return data as ProfileWithBusiness | null;
}

export async function getBusinessProfile(userId: string, businessId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data } = await supabase
    .from('profiles')
    .select('*, businesses(id, name, timezone, settings)')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .single();

  return data;
}

export function isAdmin(role: string) {
  return role === 'owner' || role === 'admin';
}
