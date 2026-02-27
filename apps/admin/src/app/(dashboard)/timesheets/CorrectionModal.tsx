'use client';

import { useState } from 'react';
import { format } from 'date-fns';

export function CorrectionModal({
  correction,
  shiftId,
  onClose,
  onResolved,
}: {
  correction: { id: string; reason: string; status: string; admin_comment: string | null };
  shiftId: string;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [action, setAction] = useState<'approve' | 'deny'>('approve');
  const [comment, setComment] = useState(correction.admin_comment ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setLoading(true);
    setError('');

    const res = await fetch('/api/corrections/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correctionId: correction.id,
        shiftId,
        action,
        adminComment: comment,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      setError('Failed to resolve');
      return;
    }
    onResolved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Correction request</h2>
        <p className="text-slate-600 mb-4">{correction.reason}</p>
        <p className="text-xs text-slate-400 mb-4">
          Requested {format(new Date(), 'dd MMM yyyy')}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={action === 'approve'}
                  onChange={() => setAction('approve')}
                />
                Approve
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={action === 'deny'}
                  onChange={() => setAction('deny')}
                />
                Deny
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Optional note to employee"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : action === 'approve' ? 'Approve' : 'Deny'}
          </button>
        </div>
      </div>
    </div>
  );
}
