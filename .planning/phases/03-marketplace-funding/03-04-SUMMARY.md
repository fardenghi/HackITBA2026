---
phase: 03-marketplace-funding
plan: 04
subsystem: ui
tags: [nextjs, app-router, marketplace, investor, realtime, forms]
requires:
  - phase: 03-marketplace-funding
    provides: Marketplace queries, purchase action, realtime hook, and funding widgets
provides:
  - Investor marketplace landing on `/inversor/dashboard`
  - Investor invoice detail route with purchase form and return preview
  - Shared browser/server read-model mapping for marketplace refreshes
affects: [phase-3-validation, playwright, phase-4-settlement]
tech-stack:
  added: [no new dependencies]
  patterns: [server-rendered marketplace with client live updates, dedicated investor purchase route, shared read-model serialization]
key-files:
  created: [src/components/marketplace/marketplace-grid.tsx, src/components/marketplace/marketplace-card.tsx, src/components/marketplace/purchase-fractions-form.tsx, src/app/(inversor)/inversor/invoices/[invoiceId]/page.tsx, src/lib/marketplace/read-model.ts]
  modified: [src/app/(inversor)/inversor/dashboard/page.tsx, src/lib/marketplace/queries.ts, src/hooks/use-marketplace-realtime.ts]
key-decisions:
  - "Kept `/inversor/dashboard` as the main marketplace landing so existing auth redirects stay unchanged."
  - "Moved marketplace row serialization into a shared read-model helper so server queries and browser polling stay numerically aligned."
  - "Embedded live progress and purchase submission inside the detail form component so the detail route stays server-rendered but responsive."
patterns-established:
  - "Pattern 1: investor marketplace pages should server-render initial data, then hydrate with `useMarketplaceRealtime()` for live progress."
  - "Pattern 2: investor detail routes should show purchase feedback inline while refreshing the page shell after successful buys."
requirements-completed: [FUND-01, FUND-02, FUND-03, FUND-04]
duration: 5min
completed: 2026-03-28
---

# Phase 3 Plan 4: Build the investor marketplace landing, detail route, and fraction purchase UI Summary

**The investor side now has a real marketplace dashboard plus a dedicated invoice detail flow where users can inspect live funding progress, preview returns, and submit purchases through the approved boundary.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T10:38:30Z
- **Completed:** 2026-03-28T10:43:45Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Replaced the placeholder investor dashboard with a funding marketplace fed by `getMarketplaceInvoices()` and hydrated by live browser refreshes.
- Added an investor invoice detail route with shared metrics, live progress, expected-return preview, and a working purchase form.
- Consolidated marketplace row-to-contract mapping in a shared read-model helper used by both server queries and browser fallback refreshes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Turn `/inversor/dashboard` into the marketplace landing** - `8f19c0d` (feat)
2. **Task 2: Build the investor invoice detail route and purchase form** - `4687c30` (feat)

## Files Created/Modified
- `src/app/(inversor)/inversor/dashboard/page.tsx` - marketplace-first investor landing page
- `src/components/marketplace/marketplace-grid.tsx` - client grid with browser polling refresh fallback
- `src/components/marketplace/marketplace-card.tsx` - funding card UI with risk, progress, and CTA
- `src/lib/marketplace/read-model.ts` - shared invoice/fraction serialization helpers
- `src/lib/marketplace/queries.ts` - refactored to reuse the shared read-model mapper
- `src/app/(inversor)/inversor/invoices/[invoiceId]/page.tsx` - investor funding detail route
- `src/components/marketplace/purchase-fractions-form.tsx` - live purchase form with inline result feedback
- `src/hooks/use-marketplace-realtime.ts` - generic realtime hook support for richer detail snapshots

## Decisions Made
- Reused the existing investor dashboard route instead of introducing a second marketplace entrypoint.
- Used inline success/error feedback in the purchase form so browser automation can assert outcomes without needing a toast container.
- Made the realtime hook generic enough to patch both marketplace cards and richer detail snapshots.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extracted a shared marketplace read-model mapper for browser refreshes**
- **Found during:** Task 1 (Turn `/inversor/dashboard` into the marketplace landing)
- **Issue:** The client polling fallback needed the same invoice-to-contract shaping as the server query layer; duplicating that logic would risk drift in progress and return metrics.
- **Fix:** Added `src/lib/marketplace/read-model.ts` and refactored the query layer plus browser refreshes to use it.
- **Files modified:** `src/lib/marketplace/read-model.ts`, `src/lib/marketplace/queries.ts`, `src/components/marketplace/marketplace-grid.tsx`
- **Verification:** `npm run build && npx vitest run tests/marketplace/queries.test.ts tests/marketplace/progress.test.ts tests/marketplace/realtime.test.ts tests/marketplace/returns.test.ts tests/invoices/fund-invoice.test.ts`
- **Committed in:** `8f19c0d`

**2. [Rule 1 - Bug] Generalized the realtime hook for invoice detail snapshots**
- **Found during:** Task 2 (Build the investor invoice detail route and purchase form)
- **Issue:** The first detail-page implementation treated `useMarketplaceRealtime()` as returning only basic marketplace cards, which broke TypeScript for richer snapshot fields like `perFractionNetAmount`.
- **Fix:** Made the hook/controller generic over `MarketplaceInvoiceCard` extensions so the detail screen can stay live without losing typed snapshot fields.
- **Files modified:** `src/hooks/use-marketplace-realtime.ts`, `src/components/marketplace/purchase-fractions-form.tsx`
- **Verification:** `npm run build && npx vitest run tests/marketplace/queries.test.ts tests/marketplace/progress.test.ts tests/marketplace/realtime.test.ts tests/marketplace/returns.test.ts tests/invoices/fund-invoice.test.ts`
- **Committed in:** `4687c30`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes kept the planned UI intact while preventing data-shape drift and type breakage. No scope creep.

## Issues Encountered
- Browser polling needed the same read-model math as server queries to avoid inconsistent dashboard cards.
- The live detail route required richer snapshot typing than the original marketplace-card-only hook signature.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 validation can now exercise the full investor browse → inspect → buy flow on desktop and mobile.
- Playwright only needs seed data plus browser automation; the marketplace UI and detail route are now in place.

## Self-Check: PASSED

---
*Phase: 03-marketplace-funding*
*Completed: 2026-03-28*
