import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { TimesheetsClient } from './TimesheetsClient';
import { getProfileByUserId } from '@/lib/auth';
import { createClient as createServerClient } from '@/lib/supabase/server';

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; employee?: string; shift?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.id);
  if (!profile) return null;

  const businessId = profile.business_id;
  const timezone = (profile.businesses as { timezone?: string })?.timezone ?? 'Australia/Melbourne';

  const fromParam = params.from ?? format(new Date(), 'yyyy-MM-dd');
  const toParam = params.to ?? format(new Date(), 'yyyy-MM-dd');
  const fromDate = new Date(fromParam + 'T00:00:00');
  const toDate = new Date(toParam + 'T23:59:59');

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(serviceUrl, serviceKey);

  const { data: shifts } = await admin
    .from('shifts')
    .select('id, user_id, started_at, ended_at, status, start_geo, end_geo, start_photo_path, end_photo_path')
    .eq('business_id', businessId)
    .gte('started_at', fromDate.toISOString())
    .lte('started_at', toDate.toISOString())
    .order('started_at', { ascending: false });

  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, name, wage_cents_per_hour')
    .eq('business_id', businessId)
    .eq('is_active', true);

  const { data: events } = shifts?.length
    ? await admin
        .from('shift_events')
        .select('id, shift_id, type, at')
        .in('shift_id', shifts.map((s) => s.id))
    : { data: [] };

  const { data: corrections } = await admin
    .from('correction_requests')
    .select('id, shift_id, user_id, reason, status, admin_comment, created_at')
    .eq('business_id', businessId)
    .eq('status', 'pending');

  const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, { name: p.name, wage: p.wage_cents_per_hour }]));
  const eventsByShift = new Map<string, { type: string; at: string }[]>();
  (events ?? []).forEach((e) => {
    const list = eventsByShift.get(e.shift_id) ?? [];
    list.push({ type: e.type, at: e.at });
    eventsByShift.set(e.shift_id, list);
  });
  const correctionsByShift = new Map((corrections ?? []).map((c) => [c.shift_id, c]));

  const filteredShifts = params.employee
    ? (shifts ?? []).filter((s) => s.user_id === params.employee)
    : (shifts ?? []);

  return (
    <TimesheetsClient
      shifts={filteredShifts.map((s) => ({
        ...s,
        employeeName: nameMap.get(s.user_id)?.name ?? '—',
        wageCentsPerHour: nameMap.get(s.user_id)?.wage ?? null,
        events: eventsByShift.get(s.id) ?? [],
        correction: correctionsByShift.get(s.id) ?? null,
      }))}
      employees={profiles ?? []}
      timezone={timezone}
      businessId={businessId}
      highlightShiftId={params.shift ?? undefined}
      fromParam={fromParam}
      toParam={toParam}
      employeeParam={params.employee}
    />
  );
}
