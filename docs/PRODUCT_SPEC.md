# ShiftSnap Product Specification

## Overview

**ShiftSnap** is a simple, robust time tracking product for small businesses. Two personas: Business Owners (admin) and Employees. Core value: clock in/out with photo + GPS + breaks → clean timesheets.

---

## Information Architecture

### Web Admin (Next.js)
- **Dashboard** – Who's clocked in now, hours today, alerts
- **Timesheets** – List by date range, employee, status; approve, edit, handle corrections
- **Employees** – Invite, deactivate, assign wage, role, seat usage
- **Reports** – CSV export, summary by employee
- **Settings** – Photo/GPS toggles, notifications, timezone
- **Billing** – Plan status, seat usage, overage, Stripe portal link

### Mobile App (Expo)
- **Home** – Big "+" Start Shift, current shift status
- **History** – Last 14 days of shifts
- **Profile** – Account, wage (read-only), request correction

---

## Screen-by-Screen Flows

### Mobile: Home
- **Empty state**: "Start your shift" with large "+" button
- **On shift**: Show "End Shift", "Start Break" / "End Break", elapsed time
- **Errors**: GPS denied → reason input; Camera denied → skip with reason

### Mobile: Start Shift Flow
1. Tap "+" → Camera opens (front-facing)
2. Capture photo OR "Skip with reason" if denied
3. Capture GPS (lat, lng, accuracy, status)
4. Optional site selection (v1: skip)
5. Submit → shift created, sync if online

### Mobile: History
- List last 14 days with date, duration, status
- Tap row → shift detail with events
- "Request correction" button on open/submitted shifts

### Web: Dashboard
- Cards: Clocked in now (avatars), Hours today, Alerts (missing clock-out, denied permissions)
- Empty state: "No one clocked in"

### Web: Timesheets
- Filters: date range, employee, status (open/locked/needs approval)
- Table: employee, date, in, out, breaks, total, status, actions
- Actions: Approve, Edit (with reason), View correction requests

### Web: Employees
- Table: name, email, role, wage, status, last clock
- Invite button → modal (email, role) → sends invite
- Deactivate toggle

---

## Stack Justification

| Component | Choice | Why |
|-----------|--------|-----|
| Mobile | Expo React Native | iOS-first, OTA updates, expo-camera, expo-location, expo-notifications; Android-compatible |
| Admin | Next.js App Router | Fast tables, server components, API routes, Vercel deploy |
| Backend | Supabase | Auth, Postgres, Storage, Edge Functions in one; RLS for security |
| Billing | Stripe | Subscription quantities for per-seat; webhooks for sync |
| Email | Resend | Simple API, transactional emails |
| Push | expo-notifications | Native integration, reminder scheduling |

---

## Pricing (Locked)

| Plan | Price | Included Seats |
|------|-------|----------------|
| Trial | $0 | 7 days, no card |
| Plus | $10/mo | 3 employees |
| Pro | $20/mo | 10 employees |
| Enterprise | $100/mo | 100 employees |

Overage: $2/employee/month beyond included.

---

## Edge Cases Summary

- **Offline**: Store locally, mark `offline_pending`, sync when online
- **GPS denied**: Require reason if owner setting allows; flag for review
- **Camera denied**: Same; skip with reason
- **Duplicate taps**: Check open shift before clock-in; check break state before break actions
- **Forgot clock-out**: Push reminder after N hours; admin can force end
- **Timezone**: Store UTC; display in business timezone (Australia/Melbourne default)
