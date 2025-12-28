// Temporary shim to preserve existing imports while the codebase migrates to src/lib/supabase.
// All new code should import from 'src/lib/supabase'.
export { supabase, getTenantIdFromSession } from '../lib/supabase';