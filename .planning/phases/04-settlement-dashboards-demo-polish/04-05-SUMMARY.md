---
phase: 04-settlement-dashboards-demo-polish
plan: 05
subsystem: testing
tags: [playwright, vitest, validation, mcp, vercel, settlement]
requires:
  - phase: 04-settlement-dashboards-demo-polish
    provides: Settlement write boundary, lifecycle dashboards, and full invoice-detail views
provides:
  - Deterministic desktop/mobile end-to-end settlement demo automation
  - Requirement-level Phase 4 validation with MCP corroboration and deployed fallback evidence
  - Final bug fixes that make settlement detail reads complete and deterministic
affects: [milestone-v1, demo, verifier]
tech-stack:
  added: [no new dependencies]
  patterns: [desktop-and-mobile happy-path validation, privileged server reads for audited timelines, explicit Vercel fallback recording]
key-files:
  created: [tests/e2e/settlement-demo.spec.ts, .planning/phases/04-settlement-dashboards-demo-polish/04-VALIDATION.md]
  modified: [src/lib/settlement/queries.ts, tests/invoices/settle-invoice.test.ts]
key-decisions:
  - "Covered the full demo path in one deterministic Playwright spec so Phase 4 validation stays stable across desktop and mobile."
  - "Documented Vercel auth/linkage failure explicitly and treated the passed local fallback as sufficient for milestone completion per Plan 04-05."
  - "Moved invoice-detail timeline and settlement-summary reads onto a privileged server client with explicit ownership checks so financial history is complete for authorized users."
patterns-established:
  - "Pattern 1: every major frontend flow change must pass both automated Playwright runs and one MCP desktop/mobile confirmation pass."
  - "Pattern 2: server-only audit views may require privileged reads when RLS hides role-relevant financial rows, but ownership checks must stay explicit in TypeScript."
requirements-completed: [INV-04, SETT-01, SETT-02, SETT-03, USER-02, USER-03, AUDIT-02]
duration: 24min
completed: 2026-03-28
---

# Phase 4 Plan 5: Close Phase 4 with proof that the complete demo journey works on both local and deployed surfaces Summary

**Phase 4 now has desktop/mobile automated proof, MCP corroboration, and requirement-level evidence that the Karaí demo loop works locally from signup through settlement review, with Vercel fallback status documented explicitly.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-03-28T11:55:00Z
- **Completed:** 2026-03-28T12:19:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added one deterministic settlement demo Playwright spec that covers signup, origination, funding, settlement, dashboards, and invoice-detail review on desktop and mobile.
- Re-ran the full Phase 4 Vitest + build + Playwright gate and recorded requirement-level evidence in `04-VALIDATION.md`.
- Performed Playwright MCP verification on desktop and mobile, discovered a settlement-read gap, fixed it, and documented the unavailable Vercel auth/linkage path as an allowed fallback.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the full settlement demo Playwright spec for desktop and mobile** - `ea3f741` (feat)
2. **Task 2: Run the Phase 4 gate locally, repeat with Playwright MCP, and verify deployed/Vercel behavior with fallback rules** - `98a5c07` (fix)

## Files Created/Modified
- `tests/e2e/settlement-demo.spec.ts` - end-to-end settlement demo automation for desktop and mobile
- `.planning/phases/04-settlement-dashboards-demo-polish/04-VALIDATION.md` - Phase 4 requirement-to-evidence record including Vercel fallback status
- `src/lib/settlement/queries.ts` - privileged settlement read path for full invoice financial history
- `tests/invoices/settle-invoice.test.ts` - deterministic invoice-event ordering for the final gate

## Decisions Made
- Seeded the automated happy path entirely through UI signup/origination/funding/settlement so the final spec exercises the real demo loop.
- Accepted local completion as the milestone gate because Plan 04-05 explicitly allows deployed fallback when Vercel auth/linkage is unavailable.
- Treated incomplete financial history on cedente detail pages as a correctness bug, not a documentation caveat, and fixed it before closing the phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Restored full financial history on settlement detail pages**
- **Found during:** Task 2 (Run the Phase 4 gate locally, repeat with Playwright MCP, and verify deployed/Vercel behavior with fallback rules)
- **Issue:** MCP verification showed cedente detail views were still limited by transaction RLS, so settlement principal and interest rows were missing from the summary and timeline.
- **Fix:** Switched invoice-detail event/transaction reads in `src/lib/settlement/queries.ts` to a privileged server-only client while keeping explicit role and ownership checks in the query layer.
- **Files modified:** `src/lib/settlement/queries.ts`
- **Verification:** `npx vitest run tests/invoices/settle-invoice.test.ts tests/settlement/distribution.test.ts tests/settlement/timeline.test.ts tests/dashboard/queries.test.ts && npm run build && npx playwright test tests/e2e/settlement-demo.spec.ts --project=chromium && npx playwright test tests/e2e/settlement-demo.spec.ts --project="Mobile Chrome"`, plus MCP desktop detail replay
- **Committed in:** `98a5c07`

**2. [Rule 3 - Blocking] Made invoice settlement-event assertions deterministic**
- **Found during:** Task 2 (Run the Phase 4 gate locally, repeat with Playwright MCP, and verify deployed/Vercel behavior with fallback rules)
- **Issue:** The final Vitest gate intermittently read `settled` before `settling` because event assertions only ordered by `created_at`, and both events shared the same timestamp.
- **Fix:** Ordered the integration-test event query by both `created_at` and `id` so the final two lifecycle assertions remain deterministic.
- **Files modified:** `tests/invoices/settle-invoice.test.ts`
- **Verification:** Same full Phase 4 gate listed above
- **Committed in:** `98a5c07`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both fixes were required to produce trustworthy validation evidence and did not expand scope beyond Phase 4 readiness.

## Issues Encountered

- Vercel verification could not proceed because the repo has no `.vercel/project.json`, available teams had no Karaí-linked project, and `vercel whoami` failed without credentials.
- MCP verification was the first place the cedente detail read-layer gap became obvious because the UI rendered a partial settlement history despite passing query-unit tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 is complete locally and the milestone is ready for verifier handoff.
- A future deployed rerun only needs Vercel credentials or repo linkage; the product flow itself is already validated locally on desktop and mobile.

## Self-Check: PASSED

---
*Phase: 04-settlement-dashboards-demo-polish*
*Completed: 2026-03-28*
