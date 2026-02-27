'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

const PLANS = [
  { id: 'plus', name: 'Plus', price: 10, seats: 3, description: 'For small teams' },
  { id: 'pro', name: 'Pro', price: 20, seats: 10, description: 'For growing teams' },
  { id: 'enterprise', name: 'Enterprise', price: 100, seats: 100, description: 'For large organizations' },
] as const;

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  plus: 'Plus',
  pro: 'Pro',
  enterprise: 'Enterprise',
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
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      setToast('Payment successful! Your plan is now active.');
      setTimeout(() => setToast(null), 5000);
      window.history.replaceState({}, '', '/billing');
    }
    if (searchParams.get('canceled') === '1') {
      window.history.replaceState({}, '', '/billing');
    }
  }, [searchParams]);

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
  const overageCost = overage * 2;

  async function handleUpgrade(planId: string) {
    setLoading(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else if (data.message) alert(data.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleManageSubscription() {
    setLoading('manage');
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  const isPaidPlan = ['plus', 'pro', 'enterprise'].includes(sub.plan);
  const currentPlanId = sub.plan;

  return (
    <div className="space-y-8 max-w-4xl">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
          {toast}
        </div>
      )}
      <h1 className="text-2xl font-bold text-slate-800">Billing</h1>

      {/* Current plan & usage */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-medium text-slate-800 mb-4">Current plan</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-lg font-semibold text-slate-700">
            {PLAN_LABELS[sub.plan] ?? sub.plan}
            {sub.plan === 'plus' && ' — $10/mo'}
            {sub.plan === 'pro' && ' — $20/mo'}
            {sub.plan === 'enterprise' && ' — $100/mo'}
          </span>
          <span className={`px-2 py-1 rounded text-sm ${
            sub.status === 'active' ? 'bg-green-100 text-green-800' :
            sub.status === 'trialing' ? 'bg-amber-100 text-amber-800' :
            'bg-slate-100 text-slate-600'
          }`}>
            {sub.status}
          </span>
        </div>
        {sub.trial_ends_at && (
          <p className="text-sm text-slate-500 mt-2">
            Trial ends {format(new Date(sub.trial_ends_at), 'dd MMM yyyy')}
          </p>
        )}
        {sub.current_period_end && sub.status === 'active' && (
          <p className="text-sm text-slate-500 mt-1">
            Next billing: {format(new Date(sub.current_period_end), 'dd MMM yyyy')}
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-slate-600">
            <strong>{activeCount}</strong> active employees · <strong>{sub.included_seats}</strong> included
          </p>
          {overage > 0 && (
            <p className="text-amber-600 text-sm mt-1">
              +{overage} overage × $2/mo = <strong>${overageCost}/mo</strong> extra
            </p>
          )}
        </div>

        {sub.stripe_customer_id && (
          <button
            onClick={handleManageSubscription}
            disabled={!!loading}
            className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50"
          >
            {loading === 'manage' ? 'Loading...' : 'Manage subscription'}
          </button>
        )}
      </div>

      {/* Pricing table */}
      <div>
        <h2 className="font-medium text-slate-800 mb-4">Plans</h2>
        <p className="text-slate-500 text-sm mb-4">
          All plans include unlimited shifts. Overage: $2/employee/month beyond included seats.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isDowngrade = ['plus', 'pro', 'enterprise'].indexOf(plan.id) <
              ['plus', 'pro', 'enterprise'].indexOf(currentPlanId);

            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-6 ${
                  isCurrent ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
                }`}
              >
                <h3 className="font-semibold text-slate-800">{plan.name}</h3>
                <p className="text-slate-500 text-sm mt-1">{plan.description}</p>
                <p className="mt-4">
                  <span className="text-2xl font-bold text-slate-800">${plan.price}</span>
                  <span className="text-slate-500">/mo</span>
                </p>
                <p className="text-sm text-slate-500 mt-1">{plan.seats} employees included</p>
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || !!loading || isDowngrade}
                  className={`mt-4 w-full py-2 rounded-lg font-medium ${
                    isCurrent
                      ? 'bg-slate-200 text-slate-500 cursor-default'
                      : isDowngrade
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  {isCurrent ? 'Current plan' : loading === plan.id ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
