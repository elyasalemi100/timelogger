'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function EmployeesClient({
  employees,
  businessId,
  canInvite,
  includedSeats,
  activeCount,
}: {
  employees: Array<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    role: string;
    wage_cents_per_hour: number | null;
    is_active: boolean;
  }>;
  businessId: string;
  canInvite: boolean;
  includedSeats: number;
  activeCount: number;
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'employee' | 'admin'>('employee');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    setInviteLoading(true);
    setInviteLink(null);

    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, businessId }),
    });

    const data = await res.json().catch(() => ({}));
    setInviteLoading(false);

    if (!res.ok) {
      setInviteError(data.message ?? 'Failed to send invite');
      return;
    }
    setInviteLink(data.inviteLink ?? null);
    setInviteToken(data.token ?? null);
    setInviteEmail('');
    router.refresh();
  }

  async function copyToClipboard(text: string) {
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
  }

  function closeInviteModal() {
    setInviteOpen(false);
    setInviteLink(null);
    setInviteToken(null);
  }

  async function toggleActive(profileId: string, isActive: boolean) {
    const res = await fetch('/api/employees/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, isActive }),
    });
    if (res.ok) router.refresh();
  }

  async function updateWage(profileId: string, wageCents: number) {
    const res = await fetch('/api/employees/wage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, wageCentsPerHour: wageCents }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeCount} active · {includedSeats} included in plan
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          disabled={!canInvite}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Invite employee
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-slate-500">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Wage/hr</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="px-6 py-4 font-medium text-slate-800">{e.name}</td>
                <td className="px-6 py-4 text-slate-600">{e.email}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{e.role}</span>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {e.wage_cents_per_hour != null
                    ? `$${(e.wage_cents_per_hour / 100).toFixed(2)}`
                    : '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={e.is_active ? 'text-green-600 font-medium' : 'text-slate-400'}>
                    {e.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {e.role !== 'owner' && (
                    <button
                      onClick={() => toggleActive(e.id, !e.is_active)}
                      className="text-slate-600 hover:underline text-xs"
                    >
                      {e.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Invite employee</h2>
            {inviteLink ? (
              <div className="space-y-4">
                <p className="text-green-600 text-sm font-medium">Invite sent! Share with your employee:</p>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Invite code (easy to type in app)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteToken ?? ''}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm bg-slate-50 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inviteToken ?? '')}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    >
                      Copy code
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Or share full link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm bg-slate-50 truncate"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inviteLink)}
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                    >
                      Copy link
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'employee' | 'admin')}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {inviteError && <p className="text-red-600 text-sm">{inviteError}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setInviteOpen(false)} className="px-4 py-2 text-slate-600">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                  >
                    {inviteLoading ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
