import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { profileId, wageCentsPerHour } = body;

  if (!profileId) return NextResponse.json({ message: 'profileId required' }, { status: 400 });

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createServiceClient(serviceUrl, serviceKey);

  const { data: profile } = await admin.from('profiles').select('business_id').eq('id', profileId).single();
  if (!profile) return NextResponse.json({ message: 'Profile not found' }, { status: 404 });

  const { data: me } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .eq('business_id', profile.business_id)
    .single();

  if (!me || (me.role !== 'owner' && me.role !== 'admin')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  await admin
    .from('profiles')
    .update({ wage_cents_per_hour: wageCentsPerHour ?? null })
    .eq('id', profileId);

  return NextResponse.json({ ok: true });
}
