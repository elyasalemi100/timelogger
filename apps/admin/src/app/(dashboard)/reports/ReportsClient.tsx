'use client';

import { useState } from 'react';
import { format } from 'date-fns';

type Row = {
  userId: string;
  name: string;
  wage: number | null;
  hours: number;
  grossCents: number;
};

export function ReportsClient({
  byEmployee,
  fromDate,
  toDate,
  timezone,
}: {
  byEmployee: Row[];
  fromDate: string;
  toDate: string;
  timezone: string;
}) {
  const [exporting, setExporting] = useState(false);

  async function handleExportCSV() {
    setExporting(true);
    const res = await fetch(
      `/api/export/csv?from=${new Date(fromDate).toISOString()}&to=${new Date(toDate).toISOString()}`
    );
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm mt-1">
            {format(new Date(fromDate), 'dd MMM yyyy')} – {format(new Date(toDate), 'dd MMM yyyy')}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Wage/hr</th>
              <th className="px-4 py-3">Gross</th>
            </tr>
          </thead>
          <tbody>
            {byEmployee.map((r) => (
              <tr key={r.userId} className="border-t border-slate-100">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">{r.hours.toFixed(1)}</td>
                <td className="px-4 py-3">
                  {r.wage != null ? `$${(r.wage / 100).toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {r.grossCents > 0 ? `$${(r.grossCents / 100).toFixed(2)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {byEmployee.length === 0 && (
          <div className="p-12 text-center text-slate-500">No data in this period</div>
        )}
      </div>
    </div>
  );
}
