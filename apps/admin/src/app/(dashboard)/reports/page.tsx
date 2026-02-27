import { createClient } from '@supabase/supabase-js';
import { format, subDays } from 'date-fns';
import { ReportsClient } from './ReportsClient';
import { getProfileByUserId } from '@/lib/auth';
import { createClient as createServerClient } from '@/lib/supabase/server';

export default async function ReportsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.id);
  if (!profile) return null;

  const businessId = profile.business_id;
  const timezone = (profile.businesses as { timezone?: string })?.timezone ?? 'Australia/Melbourne';

  const fromDate = subDays(new Date(), 14);
  const toDate = new Date();

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(serviceUrl, serviceKey);

  const { data: shifts } = await admin
    .from('shifts')
    .select('id, user_id, started_at, ended_at, status')
    .eq('business_id', businessId)
    .gte('started_at', fromDate.toISOString())
    .lte('started_at', toDate.toISOString());

  const { data: events } = shifts?.length
    ? await admin.from('shift_events').select('shift_id, type, at').in('shift_id', shifts.map((s) => s.id))
    : { data: [] };

  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, name, wage_cents_per_hour')
    .eq('business_id', businessId)
    .eq('is_active', true);

  const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, { name: p.name, wage: p.wage_cents_per_hour }]));
  const eventsByShift = new Map<string, { type: string; at: string }[]>();
  (events ?? []).forEach((e) => {
    const list = eventsByShift.get(e.shift_id) ?? [];
    list.push({ type: e.type, at: e.at });
    eventsByShift.set(e.shift_id, list);
  });

  const summary = (shifts ?? []).map((s) => {
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    const evs = eventsByShift.get(s.id) ?? [];
    const breakMins = evs
      .filter((e, i, arr) => e.type === 'break_start' && arr.some((x, j) => j > i && x.type === 'break_end'))
      .reduce((acc, e, i, arr) => {
        const endEv = arr.find((x, j) => j > i && x.type === 'break_end');
        return endEv ? acc + (new Date(endEv.at).getTime() - new Date(e.at).getTime()) / 60000 : acc;
      }, 0);
    const workMins = (end - start) / 60000 - breakMins;
    const info = nameMap.get(s.user_id);
    return {
      userId: s.user_id,
      name: info?.name ?? '—',
      wage: info?.wage ?? null,
      hours: workMins / 60,
      grossCents: info?.wage ? Math.round((workMins / 60) * info.wage) : null,
    };
  });

  const byEmployee = new Map<string, { name: string; wage: number | null; hours: number; grossCents: number }>();
  summary.forEach((s) => {
    const existing = byEmployee.get(s.userId);
    if (existing) {
      existing.hours += s.hours;
      existing.grossCents += s.grossCents ?? 0;
    } else {
      byEmployee.set(s.userId, {
        name: s.name,
        wage: s.wage,
        hours: s.hours,
        grossCents: s.grossCents ?? 0,
      });
    }
  });

  return (
    <ReportsClient
      byEmployee={Array.from(byEmployee.entries()).map(([userId, v]) => ({ userId, ...v }))}
      fromDate={fromDate.toISOString()}
      toDate={toDate.toISOString()}
      timezone={timezone}
    />
  );
}
