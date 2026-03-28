# Phase 3 Validation: Marketplace & Funding

**Validated on:** 2026-03-28
**Phase goal:** Investors browse funding-ready invoices, inspect expected returns, buy fractions through the DB funding boundary, and watch funding progress update live or via the documented fallback path.

## Automated Evidence

- `npx vitest run tests/invoices/fund-invoice.test.ts tests/marketplace/queries.test.ts tests/marketplace/progress.test.ts tests/marketplace/returns.test.ts tests/marketplace/realtime.test.ts`
- `npx playwright test tests/e2e/marketplace-funding.spec.ts --project=chromium`
- `npx playwright test tests/e2e/marketplace-funding.spec.ts --project="Mobile Chrome"`
- `npm run build`

## Playwright MCP Manual Checks

- **Desktop (1440×900):** Signed in as seeded investor `mcp2-desktop2-investor+…`, opened marketplace card `MCP2-DESKTOP2-b12ae261`, confirmed live status on the detail route, changed quantity from 1 to 2, and verified the UI updated to `3 / 4 fracciones fondeadas` after purchase.
- **Mobile (393×851):** Repeated the happy path with seeded investor `mcp2-mobile2-investor+…`, opened `MCP2-MOBILE2-eddccbf2`, confirmed the stacked mobile layout stayed usable, and verified the same purchase flow updated progress to `3 / 4 fracciones fondeadas` without overflow.

## Requirement Traceability

| Requirement | Evidence | Result |
| --- | --- | --- |
| FUND-01 | `tests/marketplace/queries.test.ts`, `tests/e2e/marketplace-funding.spec.ts`, MCP desktop/mobile dashboard checks | PASS |
| FUND-02 | `tests/invoices/fund-invoice.test.ts`, `src/lib/marketplace/actions.ts`, Playwright purchase submission on desktop/mobile | PASS |
| FUND-03 | `tests/marketplace/progress.test.ts`, `tests/e2e/marketplace-funding.spec.ts`, MCP progress update checks after purchase | PASS |
| FUND-04 | `tests/marketplace/returns.test.ts`, expected-return assertions in `tests/e2e/marketplace-funding.spec.ts`, MCP quantity-change preview checks | PASS |
| FUND-05 | `tests/marketplace/realtime.test.ts`, realtime status chip assertions in Playwright, MCP live verification with fallback-safe flow | PASS |

## Notes

- Phase 3 verification surfaced a missing fallback path when subscriptions never reached `SUBSCRIBED`; the hook now auto-degrades to 2-second polling and the detail form memoizes its initial snapshot array to avoid render loops.
- The local dev console still reports a missing `favicon.ico`, but the investor funding flow itself completed successfully on desktop and mobile.
