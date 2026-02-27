'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SettingsClient({
  businessId,
  businessName,
  timezone,
  photoRequiredClockIn,
  photoRequiredClockOut,
  gpsRequired,
  gpsMinAccuracy,
}: {
  businessId: string;
  businessName: string;
  timezone: string;
  photoRequiredClockIn: boolean;
  photoRequiredClockOut: boolean;
  gpsRequired: boolean;
  gpsMinAccuracy: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(businessName);
  const [tz, setTz] = useState(timezone);
  const [photoIn, setPhotoIn] = useState(photoRequiredClockIn);
  const [photoOut, setPhotoOut] = useState(photoRequiredClockOut);
  const [gps, setGps] = useState(gpsRequired);
  const [gpsAcc, setGpsAcc] = useState(gpsMinAccuracy);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave() {
    setSaving(true);
    setMessage('');

    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId,
        name,
        timezone: tz,
        settings: {
          photo_required_clock_in: photoIn,
          photo_required_clock_out: photoOut,
          gps_required: gps,
          gps_min_accuracy_meters: gpsAcc,
        },
      }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage('Saved');
      router.refresh();
    } else {
      setMessage('Failed to save');
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
          <select
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="Australia/Melbourne">Australia/Melbourne</option>
            <option value="Australia/Sydney">Australia/Sydney</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <hr className="border-slate-200" />

        <h2 className="font-medium text-slate-800">Clock-in/out requirements</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={photoIn} onChange={(e) => setPhotoIn(e.target.checked)} />
            <span>Require photo on clock-in</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={photoOut} onChange={(e) => setPhotoOut(e.target.checked)} />
            <span>Require photo on clock-out</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={gps} onChange={(e) => setGps(e.target.checked)} />
            <span>Require GPS location</span>
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">GPS min accuracy (meters)</label>
            <input
              type="number"
              value={gpsAcc}
              onChange={(e) => setGpsAcc(Number(e.target.value))}
              min={10}
              max={500}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {message && <p className={message === 'Saved' ? 'text-green-600' : 'text-red-600'}>{message}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
