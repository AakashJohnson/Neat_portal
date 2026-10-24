# ARCHITECTURE_DECISIONS

Architecture decision records (ADR) of the migration. Each one gives the context, the decision, the alternatives considered and the consequences.

## ADR-01 Plain JavaScript on both sides
- **Context:** the owner requires `.js`/`.jsx` only, with no TypeScript and no NestJS.
- **Decision:** ES modules in Express, `.js`/`.jsx` in Next.js. JSDoc annotates the important contracts. `check:no-ts` runs in CI and in the Docker builds.
- **Consequences:** no compile step for the backend. Type safety comes from zod validation at the edges and from the contract tests.

## ADR-02 Next.js App Router with route groups
- **Context:** 76 Angular routes plus a server-rendered Blade panel, each with a different global stylesheet set.
- **Decision:** two root layouts via route groups, `(site)` (Angular CSS cascade) and `(panel)` (Vanguard CSS), so neither stylesheet set leaks into the other. The panel lives under `/panel` (DEV-F14).
- **Alternatives:** two separate Next.js apps (rejected: duplicate session/BFF code and two deployments); a single layout (rejected: the two CSS sets conflict).

## ADR-03 Express 5 + Knex, mirroring Laravel's structure
- **Context:** about 450 `DB::table()` calls and raw SQL; response shapes and PHP quirks must be identical.
- **Decision:** Knex query builder (closest to Laravel's builder) on mysql2, with one service per original controller and the original method named above each port. No ORM.
- **Alternatives:** Prisma or Sequelize (rejected: they need a schema model or migrations, and their output types differ from PDO's strings).
- **Consequences:** PHP semantics (loose comparison, `empty()`, Carbon parsing, Fractal serialisation) live in small utilities with oracle tests against PHP.

## ADR-04 Same database, no schema change
- **Decision:** Express connects to the existing `neat_portal` with the same `DB_*` keys and issues no DDL. `check:no-ddl` runs in CI, and the schema hash is compared before and after (Gate C).
- **Consequences:** schema defects stay (R-12, R-25) and are documented, with code-level mitigations where possible.

## ADR-05 Token-compatible JWT
- **Decision:** reimplement tymon/jwt-auth exactly (header, claims, order, `prv`, `jti` row). Tokens are valid on both backends.
- **Consequences:** a gradual or instant cut-over is possible with no forced logout at the API level, and rollback needs no token migration.

## ADR-06 BFF with an httpOnly cookie
- **Context:** Angular kept the JWT in `localStorage` (XSS exposure) and sent `?token=`.
- **Decision:** the browser never holds the JWT. A Next.js route handler proxies `/bff/*` and adds the token exactly where Angular did (DEV-F03).
- **Alternatives:** keep `localStorage` (rejected: security); NextAuth (rejected: different session model, and a JWT bridge would be needed anyway).

## ADR-07 Parity first, deviations explicit
- **Decision:** reproduce original behaviour, including defects, unless it is a security vulnerability or the new platform cannot express it. Every intentional difference is a numbered deviation (`DEVIATIONS.md`); every reproduced defect is a risk (`INITIAL_RISK_REGISTER.md`) for the owner to decide on.
- **Consequences:** behaviour can be compared mechanically against the reference apps (contract and parity suites). Fixes to original defects are separate, owner-approved changes.

## ADR-08 Original CSS instead of a redesign
- **Decision:** reuse the original stylesheets (Angular global + component CSS with emulated encapsulation reproduced, Vanguard panel CSS) and Material 7 markup equivalents.
- **Alternatives:** rebuild the UI with MUI theming (rejected: visible differences, and the spec requires the same look).

## ADR-09 TipTap for the rich-text editor
- **Context:** `@kolkov/angular-editor` has no React version; `execCommand` is deprecated.
- **Decision:** TipTap 3 behind the original editor DOM and toolbar, with a schema for the legacy markup; untouched fields are submitted unchanged (DEV-F08).

## ADR-10 No background worker
- **Context:** the original runs everything synchronously (queue misconfigured to `sync`, empty scheduler).
- **Decision:** no worker process. The announcement fan-out runs after the response with `setImmediate` (BACKGROUND_JOBS J-06).
- **Revisit when:** guaranteed delivery or retries are needed; BullMQ/Redis would slot in behind the same service function.

## ADR-11 Separate repositories, one published monorepo
- **Decision:** develop `nextjs-frontend`, `express-backend` and `migration-docs` as independent git repositories, and publish them with history to the GitHub monorepo via `git subtree` (`tools/publish-monorepo.sh`), together with the CI workflow.

## ADR-12 Hardening flags for contract comparison
- **Decision:** the hardened behaviour is the default. `LEGACY_PUBLIC_ENDPOINTS=true` re-opens the original public upload endpoints **only** so the contract suites can compare against Laravel; it must never be set in production (DEPLOYMENT checklist).
