---
phase: 02-invoice-origination-risk-engine
plan: 02
subsystem: api
tags: [risk-engine, ai-sdk, fallback, pricing]
requires:
  - phase: 02-invoice-origination-risk-engine
    provides: Normalized BCRA snapshot contract and seeded cache boundary
provides:
  - Deterministic tier and pricing engine for payer risk
  - Optional schema-validated narrative generation layered on deterministic evidence
  - Regression coverage for degraded BCRA and LLM paths
affects: [cedente-flow, marketplace, validation]
tech-stack:
  added: [ai, @ai-sdk/openai, date-fns, lucide-react, sonner]
  patterns: [deterministic-score-authority, timeout-based narrative fallback]
key-files:
  created: [src/lib/risk/deterministic.ts, src/lib/risk/pricing.ts, src/lib/risk/llm.ts]
  modified: [package.json, package-lock.json, tests/risk/deterministic-engine.test.ts, tests/risk/pricing.test.ts, tests/risk/fallbacks.test.ts, tests/risk/llm-narrative.test.ts]
key-decisions:
  - "Kept risk authority entirely inside deterministic code and limited the LLM module to explanation-only output."
  - "Added an explicit narrative timeout path so the happy path never blocks on model latency."
patterns-established:
  - "Pattern 1: pricing is a pure function of tier, maturity, and bounded adverse-signal pressure."
  - "Pattern 2: narrative evidence must be filtered back down to supplied facts before it reaches stored invoice data."
requirements-completed: [RISK-01, RISK-02, RISK-03, RISK-05, RISK-06]
duration: 16min
completed: 2026-03-28
---

# Phase 2 Plan 2: Build deterministic scoring, pricing, fallback handling, and LLM narrative generation Summary

**Phase 2 now computes authoritative payer tiers and discount rates deterministically, then layers an evidence-bounded narrative on top with a strict fallback path.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-28T09:41:00Z
- **Completed:** 2026-03-28T09:57:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Implemented the deterministic tier rubric and pricing utility used by the cedente origination flow.
- Covered stale-cache and no-live-data scenarios so the scorer always returns a tier/rate pair.
- Added schema-validated narrative generation that falls back cleanly when the LLM is unavailable or slow.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build deterministic tier, pricing, and degraded-path fallback coverage** - `f766d5b` (feat)
2. **Task 2: Add schema-validated LLM narrative generation without changing the score authority** - `0d76558` (feat)

## Files Created/Modified
- `src/lib/risk/deterministic.ts` - authoritative deterministic tier/rate engine
- `src/lib/risk/pricing.ts` - bounded pricing utility
- `src/lib/risk/llm.ts` - narrative-only LLM wrapper with fallback behavior
- `tests/risk/deterministic-engine.test.ts` - tier and signal regression coverage
- `tests/risk/pricing.test.ts` - pricing math regression coverage
- `tests/risk/fallbacks.test.ts` - degraded BCRA path coverage
- `tests/risk/llm-narrative.test.ts` - narrative validation and fact-filtering coverage
- `package.json` / `package-lock.json` - AI SDK runtime dependencies

## Decisions Made
- Added the AI SDK packages at the repo level so later phases can reuse the same narrative pattern without reinventing LLM plumbing.
- Used a deterministic fallback explanation string whenever the model layer is absent, invalid, or too slow.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server actions can now score any normalized payer snapshot without depending on live external success.
- Browser pages can render both authoritative pricing outputs and optional narrative copy from stored invoice data.

## Self-Check: PASSED

---
*Phase: 02-invoice-origination-risk-engine*
*Completed: 2026-03-28*
