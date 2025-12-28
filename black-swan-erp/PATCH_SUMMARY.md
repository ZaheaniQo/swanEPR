- Documented Supabase Studio enablement for the Custom Access Token Hook in `docs/AUTH_HOOK_ENABLEMENT.md`.
- Hardened `public.custom_access_token_hook` to select tenant_id deterministically from server-side memberships only.
- Updated smoke suite with actionable JWT-claim diagnostics and COA bootstrap for work order posting.
- Fixed work order completion posting flow by deferring journal balance enforcement and aligning journal entry creation.
- Confirmed `npm run verify:wiring` passes with the updated hook + posting flow.

Why
- Enforces tenant_id as a JWT-claim source of truth with zero-trust selection logic.
- Ensures atomic work order posting can create balanced journal entries without premature trigger failures.
- Strengthens verification to catch missing claims, missing COA accounts, and idempotency regressions.

How to verify
- `supabase db push`
- `npm run verify:wiring` (requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `TEST_TENANT_ID`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`; optional `SUPABASE_SERVICE_ROLE_KEY` for setup/cleanup)
- If the suite reports missing `tenant_id` claims, enable the Custom Access Token Hook in Supabase Studio (`public.custom_access_token_hook`), then re-login.

Security Note
- tenant_id is now claim-first only; no fallback is used for business tables, and work order completion is a single, idempotent, server-side transaction.
