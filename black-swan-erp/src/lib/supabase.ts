import { createClient, Session } from '@supabase/supabase-js';

import { TenantError } from '../utils/tenantGuard';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

/**
 * Resolves tenant_id using server-assigned claims or the server-side mapping.
 */
export const getTenantIdFromSession = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data?.session;
  const tenantId = deriveTenantIdFromSession(session);
  if (tenantId) return tenantId;
  throw new TenantError('Missing tenant_id claim in auth token.');
};

export const deriveTenantIdFromSession = (session: Session | null): string | null => {
  if (!session?.access_token) return null;
  try {
    const [, payloadB64] = session.access_token.split('.');
    if (!payloadB64) return null;
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { tenant_id?: string };
    return payload.tenant_id || null;
  } catch (error) {
    console.warn('Failed to parse tenant_id from JWT', error);
    return null;
  }
};
