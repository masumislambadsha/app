<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project facts (read before changing anything)

### Architecture
- **DB**: MongoDB (default db `attendance`). Typed collections through `src/lib/mongo.ts` — a singleton `db()` + `collections()` helper; never `mongoose`, never raw collection names outside it.
- **Auth**: better-auth (email+password) at `/api/auth/[...all]`. Not Supabase (despite the PRD). Session helpers `requireAdmin`/`requireEmployee` in `src/auth.ts`.
- **Role model** (`src/attend/roles.ts`): roles are derived at runtime from the `employees` collection (active records) plus `ADMIN_EMAIL` env bootstrap — there is no stored user-role column to reconcile.
- **Domain engine** lives in `src/attend/` and is kept **pure** (no Next server/React imports) so it can run under plain Node type-stripping:
  - `status.ts` — day-status resolution. Priority: manual override > holiday > weekly off > approved leave > missing check-in (absent) > timing (present/late/half_day). Boundary tests live in `scripts/test-status.ts`.
  - `service.ts` — `computeDay`/`materializeDay`, effective shift from date-ranged override shifts.
  - `leave.ts`, `payroll.ts` — leave balances/requests; monthly sheet + CSV.
- **Time** (`src/lib/time.ts`): naive UTC-independent Asia/Dhaka helpers; weekday convention **JS 0=Sun..6=Sat** (BD Friday = JS 5); weekly-off arrays use JS numbers.
- **QR check-in** (`src/lib/qr.ts`, check-in at `src/app/api/check-in/route.ts`): single-use HS256 JWT (jose), ~45s expiry, `jti` deduped via `used_tokens` (TTL index). `QR_SECRET_CURRENT`/`QR_SECRET_PREVIOUS` support key rotation. Kiosk mint: `/api/kiosk/token` (HMAC `kiosk_auth` cookie or `x-kiosk-key`); `/api/kiosk/cookie`; scan page `/scan`; device reg `/api/device/register`.
- **Cron**: `/api/cron/daily-status` (Vercel crontab `0 18 * * *` UTC = 00:00 Dhaka) requires `CRON_SECRET` (Bearer or `?cron=`), computes the **previous** Dhaka date, self-heals/backfills up to 31 missing days, idempotent upsert, never overwrites manual rows.
- **Audit** (`src/actions/audit.ts`): append-only; DB-level enforcement via locked app user created by `scripts/setup-app-user.mjs`.

### Routes (App Router under `src/app`)
- `/` → redirects; `/login`; `/me`, `/me/leave`; `/scan`; `/kiosk`; PF `/admin/*` (`close`, `devices`, `employees`, `holidays`, `leaves`, `sheet`, `shifts`); `manifest.ts` PWA.
- API: `/api/auth/[...all]`, `/api/check-in`, `/api/cron/daily-status`, `/api/kiosk/token`, `/api/kiosk/cookie`, `/api/device/register`, `/api/admin/sheet`. Check API routes are `force-dynamic`.

### Bootstrap / scripts
- `.env.example`: canonical env list — `MONGODB_URI`/`MONGODB_DB`, `BETTER_AUTH_SECRET`, QR/kiosk keys, `CRON_SECRET`, `ADMIN_EMAIL`, `TIMEZONE=Asia/Dhaka`, office geofence coords/radius, QR/rate-limit tunables.
- `scripts/init-db.mjs` (indexes + seed config), `scripts/seed-demo.mjs` (demo users; dev OTP is deterministic per email), `scripts/seed-passwords.mjs` (better-auth scrypt hashes: N=16384, r=16, p=1, dkLen=64), `scripts/setup-app-user.mjs` (least-privilege app user), `scripts/test-status.ts`.

### Gotchas
- repo git root is `app/`; keep `next dev`-managed AGENTS.md block above (it is regenerated — do not try to delete it).
- No npm `test`/`typecheck` scripts — verify with `node scripts/test-status.ts` + `npx tsc --noEmit`.
- `.env.example` used to contain a real-looking Atlas URI — treat any committed Mongo credentials as suspect; rely on `.env.local`.
- All dates/time are Dhaka-local strings; never convert with `Date` toISOString then back for business logic.
