import { createClient } from '@supabase/supabase-js';
import { format, formatDistanceToNow } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import Link from 'next/link';
import { getProfileByUserId } from '@/lib/auth';
import { createClient as createServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.id);
  if (!profile) return null;

  const businessId = profile.business_id;
  const timezone = (profile.businesses as { timezone?: string })?.timezone ?? 'Australia/Melbourne';

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(serviceUrl, serviceKey);

  const now = new Date();
  const todayStart = utcToZonedTime(new Date(now.getFullYear(), now.getMonth(), now.getDate()), timezone);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const { data: openShiftsRaw } = await admin
    .from('shifts')
    .select('id, user_id, started_at')
    .eq('business_id', businessId)
    .eq('status', 'open')
    .is('ended_at', null);

  const { data: todayShiftsRaw } = await admin
    .from('shifts')
    .select('id, user_id, started_at, ended_at, status')
    .eq('business_id', businessId)
    .gte('started_at', todayStart.toISOString())
    .lt('started_at', todayEnd.toISOString());

  const userIds = Array.from(new Set([
    ...(openShiftsRaw ?? []).map((s) => s.user_id),
    ...(todayShiftsRaw ?? []).map((s) => s.user_id),
  ]));

  const { data: profilesData } = userIds.length > 0
    ? await admin.from('profiles').select('user_id, name').eq('business_id', businessId).in('user_id', userIds)
    : { data: [] };

  const nameMap = new Map((profilesData ?? []).map((p) => [p.user_id, p.name]));

  const openShifts = (openShiftsRaw ?? []).map((s) => ({ ...s, employeeName: nameMap.get(s.user_id) ?? 'Unknown' }));
  const todayShifts = (todayShiftsRaw ?? []).map((s) => ({ ...s, employeeName: nameMap.get(s.user_id) ?? '—' }));

  const totalMinutes = (todayShifts ?? []).reduce((acc, s) => {
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    return acc + (end - start) / 60000;
  }, 0);

  const { data: alertsRaw } = await admin
    .from('shifts')
    .select('id, user_id, started_at')
    .eq('business_id', businessId)
    .eq('status', 'open')
    .is('ended_at', null)
    .lt('started_at', new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString());

  const alerts = (alertsRaw ?? []).map((s) => ({ ...s, employeeName: nameMap.get(s.user_id) ?? 'Unknown' }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of today&apos;s activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Clocked in now</h2>
          {openShifts.length > 0 ? (
            <ul className="space-y-3">
              {openShifts.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-100" />
                  <span className="font-medium text-slate-800">{s.employeeName}</span>
                  <span className="text-slate-400 text-sm">
                    {formatDistanceToNow(new Date(s.started_at), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">No one clocked in</p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Hours today</h2>
          <p className="text-3xl font-bold text-slate-800">
            {(totalMinutes / 60).toFixed(1)}<span className="text-lg font-normal text-slate-500 ml-0.5">h</span>
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Alerts</h2>
          {alerts.length > 0 ? (
            <ul className="space-y-2">
              {alerts.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/timesheets?shift=${s.id}`}
                    className="text-amber-700 hover:text-amber-800 text-sm font-medium"
                  >
                    {s.employeeName} — shift &gt; 10h
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">All good</p>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Today&apos;s shifts</h2>
        </div>
        {todayShifts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50/50">
                  <th className="px-6 py-3 font-medium">Employee</th>
                  <th className="px-6 py-3 font-medium">Started</th>
                  <th className="px-6 py-3 font-medium">Ended</th>
                  <th className="px-6 py-3 font-medium">Duration</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayShifts.map((s) => {
                  const start = new Date(s.started_at);
                  const end = s.ended_at ? new Date(s.ended_at) : new Date();
                  const mins = (end.getTime() - start.getTime()) / 60000;
                  return (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-slate-800">{s.employeeName}</td>
                      <td className="px-6 py-4 text-slate-600">{format(utcToZonedTime(start, timezone), 'HH:mm')}</td>
                      <td className="px-6 py-4 text-slate-600">{s.ended_at ? format(utcToZonedTime(new Date(s.ended_at), timezone), 'HH:mm') : '—'}</td>
                      <td className="px-6 py-4 text-slate-600">{(mins / 60).toFixed(1)}h</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${s.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-slate-500">No shifts today</p>
            <p className="text-slate-400 text-sm mt-1">Shifts will appear here when employees clock in</p>
          </div>
        )}
      </div>
    </div>
  );
}
