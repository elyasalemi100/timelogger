import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/audit';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { shiftId, reason } = body;

  if (!shiftId || !reason?.trim()) {
    return NextResponse.json({ message: 'shiftId and reason required' }, { status: 400 });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createServiceClient(serviceUrl, serviceKey);

  const { data: shift } = await admin.from('shifts').select('business_id').eq('id', shiftId).single();
  if (!shift) return NextResponse.json({ message: 'Shift not found' }, { status: 404 });

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .eq('business_id', shift.business_id)
    .single();

  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from('shifts')
    .update({ ended_at: now, status: 'submitted' })
    .eq('id', shiftId);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  await logAudit(shift.business_id, user.id, 'shift_force_end', 'shift', shiftId, { reason });

  return NextResponse.json({ ok: true });
}
