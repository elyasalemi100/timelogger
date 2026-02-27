import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const PLAN_SEATS: Record<string, number> = {
  trial: 3,
  plus: 3,
  pro: 10,
  enterprise: 100,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { businessName, ownerName, plan = 'trial' } = body;

  if (!businessName || !ownerName) {
    return NextResponse.json({ message: 'Business name and owner name required' }, { status: 400 });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createServiceClient(serviceUrl, serviceKey);

  const { data: business, error: bizErr } = await admin
    .from('businesses')
    .insert({
      name: businessName,
      timezone: 'Australia/Melbourne',
      owner_user_id: user.id,
    })
    .select('id')
    .single();

  if (bizErr) {
    return NextResponse.json({ message: bizErr.message }, { status: 500 });
  }

  const { error: profileErr } = await admin.from('profiles').insert({
    user_id: user.id,
    business_id: business.id,
    role: 'owner',
    name: ownerName,
    email: user.email ?? '',
    is_active: true,
  });

  if (profileErr) {
    await admin.from('businesses').delete().eq('id', business.id);
    return NextResponse.json({ message: profileErr.message }, { status: 500 });
  }

  const includedSeats = PLAN_SEATS[plan] ?? 3;
  await admin.from('subscriptions').insert({
    business_id: business.id,
    plan,
    status: 'trialing',
    trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    included_seats: includedSeats,
  });

  return NextResponse.json({ businessId: business.id });
}
