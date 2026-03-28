---
phase: 04-settlement-dashboards-demo-polish
plan: 02
subsystem: api
tags: [supabase, settlement, read-models, timeline, dashboard, vitest]
requires:
  - phase: 04-settlement-dashboards-demo-polish
    provides: Settlement RPCs, ledger writes, and typed settlement action contracts
provides:
  - Server-only settlement read models for cedente and investor dashboards
  - Normalized invoice timelines built from events plus transactions
  - Detail-query contracts that keep investor holdings visible through settled status
affects: [phase-4-plan-03, phase-4-plan-04, phase-4-plan-05, dashboards, invoice-detail, verifier]
tech-stack:
  added: [no new dependencies]
  patterns: [dependency-injectable server queries, normalized audit timeline union, server-only ownership checks]
key-files:
  created: [src/lib/settlement/timeline.ts, src/lib/settlement/queries.ts, tests/settlement/timeline.test.ts, tests/dashboard/queries.test.ts]
  modified: [tests/dashboard/queries.test.ts]
key-decisions:
  - "Normalized invoice events, fraction purchase events, and financial transactions into one chronological timeline item shape."
  - "Kept settlement queries dependency-injectable so Vitest can validate metrics and access rules outside a Next request scope."
  - "Extended investor read models across funding, funded, settling, and settled so holdings never disappear after funding closes."
patterns-established:
  - "Pattern 1: settlement dashboard/detail queries should expose UI-ready shapes from the server, not ad hoc client joins."
  - "Pattern 2: audit timelines come from a server-side union of append-only events plus ledger transactions."
requirements-completed: [INV-04, AUDIT-02, SETT-03, USER-02, USER-03]
duration: 8min
completed: 2026-03-28
---

# Phase 4 Plan 2: Build the server-side read layer that powers Phase 4 dashboards, invoice timelines, and transaction history Summary

**Settlement dashboards and detail routes now share one typed server read layer that turns events plus transactions into audited timelines, role metrics, and post-settlement holdings.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-28T11:29:00Z
- **Completed:** 2026-03-28T11:37:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added red-first regression coverage for timeline ordering, cedente KPI math, investor portfolio math, and settled holding visibility.
- Implemented `buildTimeline()` to normalize invoice transitions, fraction purchases, and financial ledger rows into one chronological stream.
- Implemented typed settlement queries for cedente/investor dashboards and invoice detail views with dependency injection for cheap verification.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define timeline and dashboard read-model behavior with regression tests** - `c5d1df2` (test)
2. **Task 2: Implement server-only timeline normalization and dashboard/detail queries** - `382b113` (feat)

## Files Created/Modified
- `tests/settlement/timeline.test.ts` - locks the event-plus-transaction chronology contract
- `tests/dashboard/queries.test.ts` - verifies cedente metrics, investor portfolio math, and settled detail accessibility
- `src/lib/settlement/timeline.ts` - converts events and transactions into one normalized timeline shape
- `src/lib/settlement/queries.ts` - exposes typed dashboard/detail read models for both roles

## Decisions Made
- Used one normalized `TimelineItem` shape so dashboard/detail UI can stay presentation-only.
- Returned dashboard/detail payloads already shaped for React surfaces instead of leaking raw Supabase rows into pages.
- Preserved dependency overrides on settlement queries so later phases can validate business math without a live request scope.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Query code needed to avoid eagerly creating a request-scoped Supabase client during Vitest runs; dependency resolution now falls back to injected seams first.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Invoice detail pages can now render full-lifecycle timeline and settlement summaries from one server read layer.
- Dashboard pages can consume stable KPI/history payloads without additional client shaping.

## Self-Check: PASSED

---
*Phase: 04-settlement-dashboards-demo-polish*
*Completed: 2026-03-28*
