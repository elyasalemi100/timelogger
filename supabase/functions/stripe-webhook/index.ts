import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20',
});
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig || !webhookSecret) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    return new Response(`Webhook error: ${(err as Error).message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const businessId = session.metadata?.business_id;
    const plan = (session.metadata?.plan as string) ?? 'plus';
    if (businessId) {
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      const includedSeats = plan === 'plus' ? 3 : plan === 'pro' ? 10 : plan === 'enterprise' ? 100 : 3;
      if (customerId && subscriptionId) {
        await supabase
          .from('subscriptions')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan,
            status: 'active',
            included_seats: includedSeats,
            trial_ends_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('business_id', businessId);
      }
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const plan = (sub.metadata?.plan as string) ?? 'plus';
    const includedSeats = plan === 'plus' ? 3 : plan === 'pro' ? 10 : plan === 'enterprise' ? 100 : 3;

    const { data: biz } = await supabase
      .from('subscriptions')
      .select('business_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (biz) {
      await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_id: sub.id,
          status: sub.status,
          plan,
          included_seats: includedSeats,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          trial_ends_at: sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', biz.business_id);
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
            included_seats: includedSeats,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            trial_ends_at: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
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

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
