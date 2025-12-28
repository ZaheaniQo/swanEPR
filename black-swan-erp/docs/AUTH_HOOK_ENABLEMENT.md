# Supabase Custom Access Token Hook Enablement

Supabase Cloud does not execute custom access token hooks unless they are enabled in the Supabase Studio UI.
This project requires the hook to inject a server-side tenant_id claim into the JWT.

## Enable the Hook (Supabase Studio)

1) Open Supabase Studio for your project.
2) Go to Auth -> Configuration.
3) Find "Custom Access Token Hook".
4) Set the function name to:

   public.custom_access_token_hook

5) Save the configuration.

## Validate the Claim

1) Sign out and sign back in (or refresh the session) to mint a new token.
2) Decode the access token payload and verify a tenant_id claim exists.
   - You can use a JWT decoder or run the smoke test.
3) Run the wiring verification:

   npm run verify:wiring

## Troubleshooting

- Claim missing after enablement:
  - Ensure the hook function exists: public.custom_access_token_hook.
  - Confirm user_tenants has an ACTIVE membership for the user.
  - Re-login after enabling the hook (old tokens will not be updated).

- How to decode the JWT claim:
  - The access token is a JWT. Base64-decode the payload segment.
  - The payload should include tenant_id along with standard claims.

- Common pitfalls:
  - Hook not enabled in Studio (Auth -> Configuration).
  - Using a token minted before the hook was enabled.
  - The user has no ACTIVE tenant membership in user_tenants.
