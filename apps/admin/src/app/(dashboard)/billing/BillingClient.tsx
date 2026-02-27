'use client';

import { useState } from 'react';
import { format } from 'date-fns';

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  plus: 'Plus ($10/mo)',
  pro: 'Pro ($20/mo)',
  enterprise: 'Enterprise ($100/mo)',
};

export function BillingClient({
  subscription,
  activeCount,
}: {
  subscription: {
    plan: string;
    status: string;
    trial_ends_at: string | null;
    included_seats: number;
    overage_seats: number;
    current_period_end: string | null;
    stripe_customer_id: string | null;
  } | null;
  activeCount: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handleManageSubscription() {
    setLoading(true);
    const res = await fetch('/api/billing/portal', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (data.url) window.location.href = data.url;
    setLoading(false);
  }

  const sub = subscription ?? {
    plan: 'trial',
    status: 'trialing',
    trial_ends_at: null,
    included_seats: 3,
    overage_seats: 0,
    current_period_end: null,
    stripe_customer_id: null,
  };

  const overage = Math.max(0, activeCount - sub.included_seats);
  const overageCost = overage * 2; // $2 per seat

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800">Billing</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="font-medium text-slate-800 mb-2">Current plan</h2>
          <p className="text-slate-600">{PLAN_LABELS[sub.plan] ?? sub.plan}</p>
          <p className="text-sm text-slate-500 mt-1">Status: {sub.status}</p>
          {sub.trial_ends_at && (
            <p className="text-sm text-slate-500">
              Trial ends: {format(new Date(sub.trial_ends_at), 'dd MMM yyyy')}
            </p>
          )}
          {sub.current_period_end && sub.status === 'active' && (
            <p className="text-sm text-slate-500">
              Period ends: {format(new Date(sub.current_period_end), 'dd MMM yyyy')}
            </p>
          )}
        </div>

        <div>
          <h2 className="font-medium text-slate-800 mb-2">Seat usage</h2>
          <p className="text-slate-600">
            {activeCount} active employees · {sub.included_seats} included
          </p>
          {overage > 0 && (
            <p className="text-amber-600 text-sm mt-1">
              +{overage} overage × $2 = ${overageCost}/mo
            </p>
          )}
        </div>

        {sub.stripe_customer_id && (
          <button
            onClick={handleManageSubscription}
            disabled={loading}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Manage subscription'}
          </button>
        )}

        {!sub.stripe_customer_id && (
          <p className="text-slate-500 text-sm">
            Connect Stripe to manage your subscription. Configure webhook and customer portal in your Stripe dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
