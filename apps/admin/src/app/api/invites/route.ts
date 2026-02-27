import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { email, role, businessId } = body;

  if (!email || !businessId) {
    return NextResponse.json({ message: 'email and businessId required' }, { status: 400 });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createServiceClient(serviceUrl, serviceKey);

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .single();

  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { data: sub } = await admin
    .from('subscriptions')
    .select('included_seats, overage_seats, status')
    .eq('business_id', businessId)
    .single();

  const { count } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('is_active', true);
  const maxSeats = (sub?.included_seats ?? 3) + (sub?.overage_seats ?? 0);
  if ((sub?.status !== 'active' && sub?.status !== 'trialing') || (count ?? 0) >= maxSeats) {
    return NextResponse.json({ message: 'Seat limit reached or subscription inactive' }, { status: 400 });
  }

  const token = randomBytes(12).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { error } = await admin.from('invites').insert({
    business_id: businessId,
    email: email.toLowerCase(),
    role: role ?? 'employee',
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  // TODO: Send email via Resend with invite link
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.shiftsnap.com'}/join?token=${token}`;

  return NextResponse.json({
    ok: true,
    inviteLink,
    token,
    message: `Invite sent. Share this link: ${inviteLink}`,
  });
}
