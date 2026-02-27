import { createClient } from '@supabase/supabase-js';

export async function logAudit(
  businessId: string,
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  meta?: Record<string, unknown>
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  await supabase.from('audit_log').insert({
    business_id: businessId,
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    meta: meta ?? null,
  });
}
