import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getProfileByUserId } from '@/lib/auth';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const PLANS = {
  plus: { price: 1000, seats: 3, priceIdEnv: 'STRIPE_PRICE_ID_PLUS' },
  pro: { price: 2000, seats: 10, priceIdEnv: 'STRIPE_PRICE_ID_PRO' },
  enterprise: { price: 10000, seats: 100, priceIdEnv: 'STRIPE_PRICE_ID_ENTERPRISE' },
} as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const profile = await getProfileByUserId(user.id);
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { plan } = body as { plan: 'plus' | 'pro' | 'enterprise' };

  if (!plan || !PLANS[plan]) {
    return NextResponse.json({ message: 'Invalid plan' }, { status: 400 });
  }

  const priceId = process.env[PLANS[plan].priceIdEnv];
  if (!priceId) {
    return NextResponse.json({ message: 'Stripe not configured for this plan' }, { status: 500 });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({ message: 'Stripe not configured' }, { status: 500 });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createServiceClient(serviceUrl, serviceKey);

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('business_id', profile.business_id)
    .single();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const stripe = new Stripe(stripeSecret);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      business_id: profile.business_id,
      plan,
    },
    subscription_data: {
      metadata: { business_id: profile.business_id, plan },
    },
    success_url: `${baseUrl}/billing?success=1`,
    cancel_url: `${baseUrl}/billing?canceled=1`,
  };

  if (sub?.stripe_customer_id) {
    sessionParams.customer = sub.stripe_customer_id;
  } else {
    sessionParams.customer_email = user.email ?? undefined;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return NextResponse.json({ url: session.url });
}
