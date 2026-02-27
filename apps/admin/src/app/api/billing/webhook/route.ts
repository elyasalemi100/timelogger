import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const PLAN_SEATS: Record<string, number> = {
  plus: 3,
  pro: 10,
  enterprise: 100,
};

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ message: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ message: `Webhook error: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const businessId = session.metadata?.business_id;
    const plan = (session.metadata?.plan as string) ?? 'plus';

    if (!businessId) return NextResponse.json({ received: true });

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    if (customerId && subscriptionId) {
      await supabase
        .from('subscriptions')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          status: 'active',
          included_seats: PLAN_SEATS[plan] ?? 3,
          trial_ends_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId);
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const plan = (sub.metadata?.plan as string) ?? 'plus';

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('business_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (existing) {
      await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_id: sub.id,
          status: sub.status,
          plan,
          included_seats: PLAN_SEATS[plan] ?? 3,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', existing.business_id);
    } else {
      const businessId = sub.metadata?.business_id;
      if (businessId) {
        await supabase
          .from('subscriptions')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            status: sub.status,
            plan,
            included_seats: PLAN_SEATS[plan] ?? 3,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('business_id', businessId);
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId);
  }

  return NextResponse.json({ received: true });
}
