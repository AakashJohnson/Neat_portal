# NEAT Portal Migration Documentation

This folder records the Laravel/Angular to Express/Next.js migration, intentional
behavioral corrections, test evidence and remaining acceptance work.

## Start here

- [Architecture dashboard](architecture-dashboard/README.md): local-only,
  source-derived interactive graph, API tracing and snapshot-based SQL ER view.
- [Migration tracker](MIGRATION_TRACKER.md): current status and outstanding work.
- [Test plan and results](TEST_PLAN.md): isolated database setup, runnable checks,
  verified journeys and explicitly skipped comparisons.
- [Deviations](DEVIATIONS.md): intentional corrections rather than reproducing
  broken legacy behavior.
- [API mapping](API_MAPPING.md): route implementations and static test references.
- [Authentication](AUTHENTICATION_MIGRATION.md): session handling and coexistence.
- [Deployment](DEPLOYMENT.md) and [rollback](ROLLBACK_PLAN.md): operational guides.
- [Initial risk register](INITIAL_RISK_REGISTER.md): historical findings; consult
  the tracker and deviations for subsequent fixes.

## Acceptance snapshot: 2026-10-25

- 65 backend tests passed; 77 Laravel-reference comparisons were skipped.
- Both expanded browser-to-SQL suites and the frontend production build passed.
- Registration, login, B2B enquiries, core profile and nomination persistence,
  company transaction approvals and free-seat allocation have targeted evidence.
- SQL structure and CREATE-statement fingerprints match the original baseline.

The entire migration is **not yet production-certified**. Company product-editor
workflows, broader admin/report/panel coverage, reference comparisons, external
integrations and staging acceptance remain.

## Repository maintenance

`tools/api-mapping.mjs` regenerates `API_MAPPING.md` from the sibling backend and
route inventory. A static coverage label is not proof that a test passed.
The existing `tools/publish-monorepo.sh` documents how the separate local
repositories are combined under their respective folders in the GitHub monorepo.

Do not commit `.env` files, credentials, production database dumps or unreviewed
runtime/browser captures. Application setup is documented in the
[backend](../express-backend/README.md) and
[frontend](../nextjs-frontend/README.md) READMEs.
