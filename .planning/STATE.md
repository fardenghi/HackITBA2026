# Project State: Karaí

## Project Reference
See: .planning/PROJECT.md (updated 2026-03-28)
**Core value:** El happy path completo funciona de punta a punta en la demo: PyME sube factura → se evalúa riesgo con BCRA + IA → inversores fondean fracciones → plataforma liquida y distribuye capital + intereses.
**Current focus:** Phase 3

## Current Status
- **Phase:** 3 — Marketplace & Funding
- **Status:** Ready to start
- **Milestone:** v1

## Phase Progress
| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation & Auth | Completed |
| 2 | Invoice Origination & Risk Engine | Completed |
| 3 | Marketplace & Funding | Not started |
| 4 | Settlement, Dashboards & Demo Polish | Not started |

## Recent Activity
- 2026-03-28 Project initialized
- 2026-03-28 Requirements defined (25 v1 across 6 categories)
- 2026-03-28 Research completed (stack, features, architecture, pitfalls)
- 2026-03-28 Roadmap created (4 phases, coarse granularity)
- 2026-03-28 Phase 1 implementation completed (auth, RBAC, schema, validation)
- 2026-03-28 Phase 2 implementation completed (invoice origination, risk engine, tokenization, desktop/mobile verification)

## Current Readiness
- Phase 2 validation artifact: `.planning/phases/02-invoice-origination-risk-engine/02-VALIDATION.md`
- Phase 3 can start without human input: Phase 2 invoices now end in `funding` with fractions and token hashes persisted.
- Known external caveat: live BCRA probe paths still return 404 from this environment, so the happy path intentionally uses the pre-warmed cache + deterministic engine.

---
*Last updated: 2026-03-28 after Phase 2 execution*
