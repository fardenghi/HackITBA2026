# Phase 1 Validation: Foundation & Auth

**Status:** In progress (blocked on deployed Vercel auth)
**Phase:** `01-foundation-auth`
**Purpose:** Nyquist + execution validation target for Phase 1 requirements and success criteria.

## Requirement Map

| Requirement | Evidence |
|-------------|------------------|
| INV-02 | ✅ `npx vitest run tests/db/transition-invoice.test.ts` passed against the hosted Supabase project |
| USER-01 | ✅ Local Playwright signup flow passed on desktop and mobile; ⛔ deployed Vercel run blocked by invalid Vercel CLI token |
| USER-04 | ✅ `tests/db/rls-policies.test.ts` passed and local Playwright RBAC redirect flow passed on desktop/mobile |
| AUDIT-01 | ✅ `npx vitest run tests/db/events-append-only.test.ts` passed against the hosted Supabase project |

## Executed Local Checks

- ✅ `npx vitest run`
- ✅ `npx playwright test tests/e2e/auth-signup.spec.ts tests/e2e/rbac.spec.ts --project=chromium`
- ✅ `npx playwright test tests/e2e/auth-signup.spec.ts tests/e2e/rbac.spec.ts --project="Mobile Chrome"`
- ✅ Local health check: `http://127.0.0.1:3003/api/health` → `200 {"ok":true,"checks":{"runtime":true,"supabase":true}}`
- ✅ Playwright MCP manual verification:
  - Desktop: unauthenticated `/cedente/dashboard` redirected to `/login`
  - Desktop: cedente signup landed on `/cedente/dashboard`
  - Mobile: inversor signup landed on `/inversor/dashboard`
  - Mobile: cedente visiting `/inversor/dashboard` was redirected back to `/cedente/dashboard`

## Deployed Checks

- ⛔ `vercel deploy --yes` failed with `The specified token is not valid. Use vercel login to generate a new token.`
- ⛔ No deployed URL was produced, so `/api/health` and deployed Playwright checks could not be executed yet.

## Notes

- Phase 1 execution default is **email confirmation disabled** in Supabase Auth so signup can land immediately on the dashboard per roadmap success criteria.
- `/auth/confirm` remains in-app as a recovery path, not the primary happy path.
- The hosted Supabase project still required confirmed signups, so the server-side signup action now creates confirmed users and signs them in immediately to preserve the same happy path.
- Local validation completed on 2026-03-28T08:27Z.
