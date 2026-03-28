---
phase: 02-invoice-origination-risk-engine
plan: 01
subsystem: api
tags: [supabase, zod, bcra, cache, diagnostics]
requires:
  - phase: 01-foundation-auth
    provides: Authenticated Supabase SSR client, invoice lifecycle schema, and RLS foundation
provides:
  - Invoice origination schema contract with description support
  - Cache-first BCRA normalization boundary and contract probe route
  - Early regression coverage for schema drift and BCRA payload handling
affects: [risk-engine, cedente-flow, tokenization]
tech-stack:
  added: [zod invoice contract, BCRA diagnostic script]
  patterns: [cache-first BCRA lookup, normalized external payload boundary]
key-files:
  created: [src/lib/invoices/schemas.ts, src/lib/risk/bcra.ts, src/lib/risk/normalize.ts, src/app/api/bcra/[resource]/route.ts, scripts/bcra/verify-contract.ts]
  modified: [supabase/migrations/0003_phase2_invoice_origination.sql, tests/invoices/create-invoice.test.ts, tests/db/phase2-invoice-schema.test.ts, tests/risk/bcra-client.test.ts]
key-decisions:
  - "Kept CUIT validation demo-safe at the 11-digit contract level so seeded BCRA examples stay usable while malformed inputs still fail fast."
  - "Made the BCRA verification script standalone CommonJS-compatible so `node scripts/bcra/verify-contract.ts` runs in this environment without extra loaders."
patterns-established:
  - "Pattern 1: invoice origination payloads serialize once in a shared schema module before any server action writes."
  - "Pattern 2: BCRA access goes through one normalized cache-first server boundary with a separate contract probe artifact."
requirements-completed: [INV-01, RISK-04]
duration: 18min
completed: 2026-03-28
---

# Phase 2 Plan 1: Close the invoice description schema gap and verify the live BCRA contract early Summary

**Invoice descriptions now persist end-to-end and the repo has a cache-first BCRA contract boundary with a runnable probe for the current environment.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-28T09:23:00Z
- **Completed:** 2026-03-28T09:41:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Added the Phase 2 migration that introduces non-null invoice descriptions and a payer-CUIT lookup index.
- Defined the shared zod origination schema used by later server actions and UI forms.
- Implemented BCRA normalization, contract probing, and regression tests before the full risk pipeline depended on external assumptions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the invoice description contract and schema regression coverage** - `ac0d4e4` (feat)
2. **Task 2: Verify the live BCRA endpoint contract and lock down normalization tests** - `da15ac2` (feat)

## Files Created/Modified
- `supabase/migrations/0003_phase2_invoice_origination.sql` - adds description support and payer-CUIT indexing
- `src/lib/invoices/schemas.ts` - shared origination validation and serializer contract
- `src/lib/risk/bcra.ts` - cache-first server BCRA boundary with contract probing helpers
- `src/lib/risk/normalize.ts` - safe normalization for empty and low-signal BCRA payloads
- `src/app/api/bcra/[resource]/route.ts` - diagnostic surface for snapshot and contract checks
- `scripts/bcra/verify-contract.ts` - executable live-contract probe for this environment
- `tests/invoices/create-invoice.test.ts` - schema-level invoice origination regression coverage
- `tests/db/phase2-invoice-schema.test.ts` - migration regression assertions
- `tests/risk/bcra-client.test.ts` - cache-hit and contract-probe regression coverage

## Decisions Made
- Used the hosted `bcra_cache` table through a server/service-role boundary so later scoring code never depends on browser-visible API calls.
- Captured the live BCRA uncertainty as probe output instead of treating 404s as a human blocker.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworked the contract probe script to run with plain Node in this repo**
- **Found during:** Task 2 (Verify the live BCRA endpoint contract and lock down normalization tests)
- **Issue:** A TypeScript ESM-style probe script would not execute under the plan's required `node scripts/bcra/verify-contract.ts` command.
- **Fix:** Rewrote the script as CommonJS-compatible runtime code while keeping the shared resource map and timeout behavior.
- **Files modified:** `scripts/bcra/verify-contract.ts`
- **Verification:** `node scripts/bcra/verify-contract.ts`
- **Committed in:** `da15ac2`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix preserved the planned verification command and avoided introducing extra runtime tooling.

## Issues Encountered
- Live BCRA probes from this environment still returned 404 responses on the assumed paths, so the phase kept cache-first fallbacks as the correctness boundary.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Deterministic scoring can now build on a stable normalized BCRA snapshot contract.
- Cedente UI work can rely on shared invoice payload validation and the migrated schema.

## Self-Check: PASSED

---
*Phase: 02-invoice-origination-risk-engine*
*Completed: 2026-03-28*
