import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getProfileByUserId } from '@/lib/auth';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const profile = await getProfileByUserId(user.id);
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return NextResponse.json({ message: 'from and to required' }, { status: 400 });

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createServiceClient(serviceUrl, serviceKey);

  const { data: shifts } = await admin
    .from('shifts')
    .select('id, user_id, started_at, ended_at')
    .eq('business_id', profile.business_id)
    .gte('started_at', from)
    .lte('started_at', to);

  const { data: events } = shifts?.length
    ? await admin.from('shift_events').select('shift_id, type, at').in('shift_id', shifts!.map((s) => s.id))
    : { data: [] };

  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, name, wage_cents_per_hour')
    .eq('business_id', profile.business_id);

  const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, { name: p.name, wage: p.wage_cents_per_hour }]));
  const eventsByShift = new Map<string, { type: string; at: string }[]>();
  (events ?? []).forEach((e) => {
    const list = eventsByShift.get(e.shift_id) ?? [];
    list.push({ type: e.type, at: e.at });
    eventsByShift.set(e.shift_id, list);
  });

  const rows: string[][] = [['Employee', 'Date', 'Start', 'End', 'Hours', 'Wage', 'Gross']];

  for (const s of shifts ?? []) {
    const start = new Date(s.started_at);
    const end = s.ended_at ? new Date(s.ended_at) : new Date();
    const evs = eventsByShift.get(s.id) ?? [];
    const breakMins = evs
      .filter((e, i, arr) => e.type === 'break_start' && arr.some((x, j) => j > i && x.type === 'break_end'))
      .reduce((acc, e, i, arr) => {
        const endEv = arr.find((x, j) => j > i && x.type === 'break_end');
        return endEv ? acc + (new Date(endEv.at).getTime() - new Date(e.at).getTime()) / 60000 : acc;
      }, 0);
    const workMins = (end.getTime() - start.getTime()) / 60000 - breakMins;
    const hours = workMins / 60;
    const info = nameMap.get(s.user_id);
    const wage = info?.wage ?? 0;
    const grossCents = hours * wage;

    rows.push([
      info?.name ?? '—',
      start.toISOString().slice(0, 10),
      start.toISOString().slice(11, 16),
      s.ended_at ? end.toISOString().slice(11, 16) : '',
      hours.toFixed(2),
      (wage / 100).toFixed(2),
      (grossCents / 100).toFixed(2),
    ]);
  }

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const bom = '\uFEFF';

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="payroll-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
