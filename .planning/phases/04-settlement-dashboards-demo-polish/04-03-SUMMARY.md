---
phase: 04-settlement-dashboards-demo-polish
plan: 03
subsystem: ui
tags: [react, nextjs, settlement, invoice-detail, timeline, dashboard]
requires:
  - phase: 04-settlement-dashboards-demo-polish
    provides: Typed settlement dashboard/detail queries and normalized timeline data
provides:
  - Shared invoice-detail timeline, settlement summary, and settlement action components
  - Cedente detail views with settlement CTA, audit history, and financial summary
  - Investor detail views that remain useful after purchase and after settlement
affects: [phase-4-plan-04, phase-4-plan-05, demo-readiness, verifier]
tech-stack:
  added: [no new dependencies]
  patterns: [server-rendered invoice lifecycle views, shared detail primitives, stable role detail routes]
key-files:
  created: [src/components/invoices/event-timeline.tsx, src/components/invoices/settlement-summary.tsx, src/components/invoices/settlement-action-form.tsx]
  modified: [src/components/invoices/invoice-status-stepper.tsx, src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx, src/app/(inversor)/inversor/invoices/[invoiceId]/page.tsx]
key-decisions:
  - "Kept `/cedente/invoices/[invoiceId]` and `/inversor/invoices/[invoiceId]` as the stable lifecycle surfaces instead of creating new settlement routes."
  - "Rendered the server-provided timeline directly instead of introducing a client fetch loop for historical audit data."
  - "Preserved investor purchase UI while the invoice is still buyable, then layered in holding and settlement state once ownership exists."
patterns-established:
  - "Pattern 1: invoice detail surfaces combine role context, settlement summaries, and the shared audit timeline from one server payload."
  - "Pattern 2: settlement actions stay cedente-only and revalidate both dashboard and detail routes after completion."
requirements-completed: [INV-04, SETT-01, SETT-02, SETT-03, AUDIT-02]
duration: 10min
completed: 2026-03-28
---

# Phase 4 Plan 3: Turn both invoice detail routes into full-lifecycle settlement views rather than funding-only shells Summary

**Cedente and investor invoice pages now show the full funding-to-settlement journey with shared timeline visuals, financial summaries, and role-aware actions/history.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-28T11:37:00Z
- **Completed:** 2026-03-28T11:47:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added shared invoice-detail primitives for settlement timelines, financial summaries, and the cedente settlement CTA.
- Extended the invoice lifecycle stepper through funded, settling, and settled.
- Wired both role-specific invoice pages to the settlement read model while preserving existing route contracts and purchase behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the shared settlement timeline and action components** - `299d9c1` (feat)
2. **Task 2: Wire the cedente and investor invoice detail routes to the settlement read model** - `a14c967` (feat)

## Files Created/Modified
- `src/components/invoices/event-timeline.tsx` - shared chronological lifecycle and financial event renderer
- `src/components/invoices/settlement-summary.tsx` - invoice-level principal/interest/disbursement summary card
- `src/components/invoices/settlement-action-form.tsx` - cedente-only settlement trigger with refresh feedback
- `src/components/invoices/invoice-status-stepper.tsx` - extended lifecycle presentation through settled
- `src/app/(cedente)/cedente/invoices/[invoiceId]/page.tsx` - settlement-aware cedente detail route
- `src/app/(inversor)/inversor/invoices/[invoiceId]/page.tsx` - investor detail route with holdings plus purchase continuity

## Decisions Made
- Left settlement visibility on the existing detail routes to preserve auth redirects and bookmarks.
- Kept the action form client-side only for submit feedback; the lifecycle data itself remains server-rendered.
- Allowed investor detail pages to serve both buyable invoices and owned settled holdings without route churn.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The investor detail route needed to derive a fallback `funding`/`funded` status from the live snapshot because the marketplace snapshot shape intentionally omits raw status.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dashboard pages can now reuse the same KPI/history language users see on detail views.
- The final validation plan can exercise settlement from the cedente detail route and review post-settlement holdings on the investor side.

## Self-Check: PASSED

---
*Phase: 04-settlement-dashboards-demo-polish*
*Completed: 2026-03-28*
