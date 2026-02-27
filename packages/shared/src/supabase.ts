import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  accessToken?: string
): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export type { SupabaseClient };
