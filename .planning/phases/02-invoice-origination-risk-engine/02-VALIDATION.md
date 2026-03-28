# Phase 2 Validation: Invoice Origination & Risk Engine

**Validated on:** 2026-03-28
**Phase goal:** Cedente uploads an invoice, Karaí scores payer risk from BCRA data with deterministic fallback, tokenizes the invoice, and leaves it funding-ready for Phase 3.

## Automated Evidence

- `npx vitest run tests/invoices/create-invoice.test.ts tests/invoices/tokenize-invoice.test.ts tests/risk/bcra-client.test.ts tests/risk/deterministic-engine.test.ts tests/risk/pricing.test.ts tests/risk/llm-narrative.test.ts tests/risk/fallbacks.test.ts tests/tokenization/hash.test.ts tests/tokenization/fractions.test.ts`
- `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3003" npx playwright test tests/e2e/invoice-origination.spec.ts --project=chromium`
- `PLAYWRIGHT_BASE_URL="http://127.0.0.1:3003" npx playwright test tests/e2e/invoice-origination.spec.ts --project="Mobile Chrome"`
- `node scripts/bcra/verify-contract.ts`
- `npm run build`

## Playwright MCP Manual Checks

- **Desktop (1280px equivalent local verification):** Signed up as a cedente, opened `/cedente/invoices/new`, submitted invoice `FAC-MCP-2`, verified the detail page rendered Tier A, 14.5% discount rate, token hash preview, 8 fractions, and funding-ready copy.
- **Mobile (393×851):** Repeated the happy path on `/cedente/invoices/new` with invoice `FAC-MCP-MOBILE`, verified the stacked layout remained usable and the tokenization summary/risk evidence rendered without overflow.

## Requirement Traceability

| Requirement | Evidence | Result |
| --- | --- | --- |
| INV-01 | `tests/invoices/create-invoice.test.ts`, `tests/e2e/invoice-origination.spec.ts` | PASS |
| INV-03 | `tests/tokenization/hash.test.ts`, `tests/invoices/tokenize-invoice.test.ts`, Playwright detail assertions | PASS |
| INV-05 | `tests/tokenization/fractions.test.ts`, `tests/invoices/tokenize-invoice.test.ts`, Playwright detail assertions | PASS |
| RISK-01 | `tests/risk/bcra-client.test.ts`, `tests/risk/deterministic-engine.test.ts`, server-action flow in `tests/invoices/create-invoice.test.ts` | PASS |
| RISK-02 | `tests/risk/deterministic-engine.test.ts`, Playwright Tier badge assertion | PASS |
| RISK-03 | `tests/risk/pricing.test.ts`, Playwright discount-rate assertion | PASS |
| RISK-04 | `tests/risk/bcra-client.test.ts`, `node scripts/bcra/verify-contract.ts`, seeded cache lookup in browser flow | PASS |
| RISK-05 | `tests/risk/llm-narrative.test.ts`, Playwright narrative assertion on detail page | PASS |
| RISK-06 | `tests/risk/fallbacks.test.ts`, fallback branch in `tests/invoices/create-invoice.test.ts` | PASS |

## Notes

- Live BCRA probing from this environment still reports 404s on the assumed `centraldedeudores` paths, so the seeded cache + deterministic engine remains the safe happy-path source during the demo.
- The browser flow now uses a hard navigation after the long-running origination action to avoid a client-side transition race discovered during Phase 2 verification.
