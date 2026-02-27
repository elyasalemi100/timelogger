'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { createClient } from '@/lib/supabase/client';
import { EditShiftModal } from './EditShiftModal';
import { CorrectionModal } from './CorrectionModal';
import { PhotoViewer } from './PhotoViewer';

const DATE_PRESETS = [
  { label: 'Today', getValue: () => format(new Date(), 'yyyy-MM-dd') },
  { label: 'Yesterday', getValue: () => format(subDays(new Date(), 1), 'yyyy-MM-dd') },
  { label: 'This week', getValue: () => ({ from: format(subDays(new Date(), 7), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
];

type ShiftRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  start_geo: unknown;
  end_geo: unknown;
  start_photo_path: string | null;
  end_photo_path: string | null;
  employeeName: string;
  wageCentsPerHour: number | null;
  events: { type: string; at: string }[];
  correction: { id: string; reason: string; status: string; admin_comment: string | null } | null;
};

export function TimesheetsClient({
  shifts,
  employees,
  timezone,
  businessId,
  highlightShiftId,
  fromParam,
  toParam,
  employeeParam,
}: {
  shifts: ShiftRow[];
  employees: { user_id: string; name: string }[];
  timezone: string;
  businessId: string;
  highlightShiftId?: string;
  fromParam: string;
  toParam: string;
  employeeParam?: string;
}) {
  const router = useRouter();
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);
  const [correctionShift, setCorrectionShift] = useState<ShiftRow | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function calcDuration(s: ShiftRow) {
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    const breakMins = s.events
      .filter((e, i, arr) => {
        if (e.type !== 'break_start') return false;
        const endEv = arr.find((x, j) => j > i && x.type === 'break_end');
        return !!endEv;
      })
      .reduce((acc, e, i, arr) => {
        const endEv = arr.find((x, j) => j > i && x.type === 'break_end');
        if (!endEv) return acc;
        return acc + (new Date(endEv.at).getTime() - new Date(e.at).getTime()) / 60000;
      }, 0);
    return (end - start) / 60000 - breakMins;
  }

  async function handleApprove(shiftId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('shifts')
      .update({ status: 'approved' })
      .eq('id', shiftId);

    if (!error) {
      setToast('Timesheet approved');
      setTimeout(() => setToast(null), 3000);
      router.refresh();
    }
  }

  async function handleForceEnd(shiftId: string, reason: string) {
    const res = await fetch('/api/shifts/force-end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftId, reason }),
    });
    if (res.ok) router.refresh();
  }

  function navigate(params: { from?: string; to?: string; employee?: string }) {
    const from = params.from ?? fromParam;
    const to = params.to ?? toParam;
    const emp = params.employee ?? employeeParam;
    const q = new URLSearchParams();
    q.set('from', from);
    q.set('to', to);
    if (emp) q.set('employee', emp);
    router.push(`/timesheets?${q.toString()}`);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
          {toast}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Timesheets</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {DATE_PRESETS.map((p) => {
              const val = p.getValue();
              const from = typeof val === 'string' ? val : val.from;
              const to = typeof val === 'string' ? val : val.to;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => navigate({ from, to })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    fromParam === from ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <input
            type="date"
            value={fromParam}
            onChange={(e) => navigate({ from: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={toParam}
            onChange={(e) => navigate({ to: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <select
            value={employeeParam ?? ''}
            onChange={(e) => navigate({ employee: e.target.value || undefined })}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All employees</option>
            {employees.map((e) => (
              <option key={e.user_id} value={e.user_id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">In</th>
              <th className="px-4 py-3">Out</th>
              <th className="px-4 py-3">Breaks</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => {
              const mins = calcDuration(s);
              const breaks = s.events.filter((e) => e.type === 'break_start' || e.type === 'break_end').length / 2;
              const rowClass = highlightShiftId === s.id ? 'bg-amber-50' : '';
              return (
                <tr key={s.id} className={`border-t border-slate-100 ${rowClass}`}>
                  <td className="px-4 py-3">{s.employeeName}</td>
                  <td className="px-4 py-3">{format(utcToZonedTime(new Date(s.started_at), timezone), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3">
                    <span>{format(utcToZonedTime(new Date(s.started_at), timezone), 'HH:mm')}</span>
                    {s.start_photo_path && (
                      <button
                        type="button"
                        onClick={() => setPhotoPath(s.start_photo_path)}
                        className="ml-1 text-brand-600 hover:underline"
                      >
                        📷
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.ended_at ? (
                      <>
                        {format(utcToZonedTime(new Date(s.ended_at), timezone), 'HH:mm')}
                        {s.end_photo_path && (
                          <button
                            type="button"
                            onClick={() => setPhotoPath(s.end_photo_path)}
                            className="ml-1 text-brand-600 hover:underline"
                          >
                            📷
                          </button>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">{breaks}</td>
                  <td className="px-4 py-3">{(mins / 60).toFixed(1)}h</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        s.status === 'open' ? 'bg-amber-100 text-amber-800' :
                        s.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.status}
                    </span>
                    {s.correction && (
                      <span className="ml-1 text-amber-600" title="Correction pending">⚠</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {s.status === 'submitted' && (
                        <button
                          onClick={() => handleApprove(s.id)}
                          className="text-brand-600 hover:underline text-xs"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => setEditingShift(s)}
                        className="text-slate-600 hover:underline text-xs"
                      >
                        Edit
                      </button>
                      {s.correction && (
                        <button
                          onClick={() => setCorrectionShift(s)}
                          className="text-amber-600 hover:underline text-xs"
                        >
                          Correction
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shifts.length === 0 && (
          <div className="p-12 text-center text-slate-500">No shifts in this period</div>
        )}
      </div>

      {editingShift && (
        <EditShiftModal
          shift={editingShift}
          onClose={() => setEditingShift(null)}
          onSaved={() => {
            setEditingShift(null);
            router.refresh();
          }}
        />
      )}
      {correctionShift && correctionShift.correction && (
        <CorrectionModal
          correction={correctionShift.correction}
          shiftId={correctionShift.id}
          onClose={() => setCorrectionShift(null)}
          onResolved={() => {
            setCorrectionShift(null);
            router.refresh();
          }}
        />
      )}
      {photoPath && (
        <PhotoViewer path={photoPath} onClose={() => setPhotoPath(null)} />
      )}
    </div>
  );
}
