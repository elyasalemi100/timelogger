import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getProfileByUserId } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const profile = await getProfileByUserId(user.id);
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createServiceClient(serviceUrl, serviceKey);

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('business_id', profile.business_id)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ message: 'No Stripe customer' }, { status: 400 });
  }

  // Stripe Customer Portal - requires Stripe SDK
  // For v1, return a placeholder - implement with stripe.billingPortal.sessions.create
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({
      message: 'Stripe not configured',
      url: `https://billing.stripe.com/p/login/test`, // Placeholder
    });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecret);
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ message: (err as Error).message }, { status: 500 });
  }
}
