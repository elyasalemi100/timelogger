# ShiftSnap System Architecture

## Monorepo Structure

```
/
├── apps/
│   ├── mobile/          # Expo React Native (iOS-first)
│   └── admin/           # Next.js App Router
├── packages/
│   └── shared/          # Types, validators, Supabase client
├── supabase/
│   ├── migrations/      # SQL migrations
│   ├── functions/       # Edge Functions (Stripe webhooks, etc.)
│   └── seed.sql
└── docs/
```

## Auth Strategy (Supabase)

- **Auth**: Supabase Auth (email/password)
- **Roles**: Stored in `profiles` table: `owner`, `admin`, `employee`
- **Enforcement**: RLS policies + server-side checks in Edge Functions
- **Session**: JWT from Supabase; admin uses `createClient` with service role for admin operations where needed

## Offline Strategy (Mobile)

1. **Local storage**: AsyncStorage for pending events
2. **Sync queue**: Array of `{ type, payload, timestamp, id }`
3. **On clock-in/out/break**: Write to queue, attempt sync
4. **On app foreground**: Process queue, retry failed items
5. **Conflict**: Server timestamp wins; large drift (>5 min) flagged

## Data Flow

```
Mobile App ──► Supabase (Auth, DB, Storage)
                    │
                    ├── Edge Functions (webhooks, sync jobs)
                    │
Admin Web ──► Supabase (same)
```

## Key Integrations

- **Stripe**: Webhooks for subscription events; customer portal for management
- **Resend**: Invite emails, receipts
- **Expo Push**: Notification tokens stored in `notification_tokens`; reminders sent via Expo push API
