# Refactoring Notes

## RLS Assumptions & Security
1. **Security Invoker**: All RPC functions are defined with `SECURITY INVOKER`. This ensures that the Row Level Security (RLS) policies of the authenticated user are respected. The function does not bypass RLS.
2. **Tenant Isolation**: 
   - All `SELECT` queries in `DataService.ts` now explicitly filter by `tenant_id`.
   - RPC functions assume that the underlying tables have RLS policies that enforce `tenant_id` checks on `INSERT`/`UPDATE`.
   - If RLS is not configured to automatically set `tenant_id` on insert (e.g., via default value from `auth.uid()`), the RPCs might need to be updated to explicitly set `tenant_id` from the resolved user context.
3. **Authentication**: The `_getContext()` helper ensures `auth.getUser()` is called once per operation to resolve the current user and tenant, preventing redundant network calls.

## SQL RPC Functions
The required SQL functions to support this refactoring are located in:
`src/database/rpc.sql`

You must execute this SQL script in your Supabase SQL Editor to create the necessary functions.

## Architecture Changes
- **Read/Write Separation**: 
  - Reads are performed via direct Supabase client queries (with `tenant_id` enforcement).
  - Writes (complex transactions) are performed via RPC calls.
- **Transactional Integrity**: Financial and inventory operations are now atomic. Partial failures (e.g., creating an invoice header but failing to create items) are prevented.
- **Dynamic Account Lookup**: Journal entries now look up account IDs dynamically by code inside the database transaction.
