import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { correctionId, shiftId, action, adminComment } = body;

  if (!correctionId || !action) {
    return NextResponse.json({ message: 'correctionId and action required' }, { status: 400 });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createServiceClient(serviceUrl, serviceKey);

  const { data: correction } = await admin
    .from('correction_requests')
    .select('business_id')
    .eq('id', correctionId)
    .single();

  if (!correction) return NextResponse.json({ message: 'Correction not found' }, { status: 404 });

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .eq('business_id', correction.business_id)
    .single();

  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const status = action === 'approve' ? 'approved' : 'denied';

  const { error: crError } = await admin
    .from('correction_requests')
    .update({ status, admin_comment: adminComment ?? null })
    .eq('id', correctionId);

  if (crError) return NextResponse.json({ message: crError.message }, { status: 500 });

  if (action === 'approve' && shiftId) {
    const { data: req } = await admin
      .from('correction_requests')
      .select('requested_changes')
      .eq('id', correctionId)
      .single();

    if (req?.requested_changes && typeof req.requested_changes === 'object') {
      const changes = req.requested_changes as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      if (changes.started_at) updates.started_at = changes.started_at;
      if (changes.ended_at) updates.ended_at = changes.ended_at;
      if (Object.keys(updates).length > 0) {
        updates.status = 'submitted';
        await admin.from('shifts').update(updates).eq('id', shiftId);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
