# ShiftSnap Deployment Guide

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations:
   ```bash
   supabase link --project-ref YOUR_REF
   supabase db push
   ```
3. Set environment variables in Supabase Dashboard → Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret)

4. Create storage bucket `shift-photos` (or run migrations which create it)

5. Configure Auth:
   - Enable Email provider
   - Set Site URL and Redirect URLs for your domains

## Stripe Setup

1. Create products and prices in Stripe Dashboard:
   - **Plus**: $10/mo recurring, 3 seats included
   - **Pro**: $20/mo recurring, 10 seats included
   - **Enterprise**: $100/mo recurring, 100 seats included
   - Overage is calculated in-app ($2/seat); can add metered price later

2. Copy Price IDs (e.g. `price_xxx`) and set env vars:
   - `STRIPE_PRICE_ID_PLUS`
   - `STRIPE_PRICE_ID_PRO`
   - `STRIPE_PRICE_ID_ENTERPRISE`

3. Create webhook endpoint (use one):
   - **Next.js** (Vercel): `https://your-domain.com/api/billing/webhook`
   - **Supabase Edge**: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

4. Deploy Edge Function (if using Supabase):
   ```bash
   supabase functions deploy stripe-webhook --env-file .env
   ```

5. Set secrets:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Admin Web (Vercel)

1. Connect repo to Vercel
2. Set root directory to `apps/admin`
3. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (e.g. https://admin.shiftsnap.com)
   - `STRIPE_SECRET_KEY` (for billing portal)

## Mobile App (EAS Build)

1. Install EAS CLI: `npm i -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Build iOS:
   ```bash
   cd apps/mobile
   eas build --platform ios --profile production
   ```
5. Submit to App Store: `eas submit --platform ios --latest`

6. Environment: Create `apps/mobile/.env` with:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Invite Links

For deep links with invite tokens, use:
`shiftsnap://join?token=ABC123`

Configure in app.json for Expo.
