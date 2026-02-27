# ShiftSnap

Simple, robust time tracking for small businesses. Clock in/out with photo + GPS + breaks → clean timesheets.

## Stack

- **Mobile**: Expo React Native (iOS-first)
- **Admin**: Next.js App Router
- **Backend**: Supabase (Auth, Postgres, Storage, Edge Functions)
- **Billing**: Stripe (subscriptions + per-seat overage)
- **Email**: Resend
- **Push**: expo-notifications

## Structure

```
apps/mobile    - Expo employee app
apps/admin     - Next.js admin web
packages/shared - Types, validators, Supabase client
supabase/      - Migrations, Edge Functions, seed
```

## Setup

1. **Supabase**: Create project, run migrations, set env vars
2. **Stripe**: Create products/prices, configure webhook
3. **Admin**: `cd apps/admin && npm install && npm run dev`
4. **Mobile**: `cd apps/mobile && npm install && npx expo start`

## Env Vars

See `.env.example` in each app.
