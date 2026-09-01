# Deployment Guide

This covers: running the stack locally, generating the first database migration, where every third-party key
goes, staging vs production environments, and CI/CD.

## 0. What you need before you start

- Docker + Docker Compose (v2) on your machine or build server.
- A Postgres 16 instance (the included `docker-compose.yml` runs one for you locally; use a managed instance —
  RDS, Cloud SQL, Neon, Supabase, etc. — for staging/production).
- Accounts/keys for: Google Maps (or another provider), an SMS/OTP provider (Twilio or MSG91), Razorpay, and
  optionally Firebase (push notifications).
- Flutter SDK locally if you're building the mobile apps (not needed for the backend/web portals).

## 1. Local development

```bash
git clone <this repo> cab-platform && cd cab-platform

cp backend/.env.example backend/.env
cp admin-dashboard/.env.example admin-dashboard/.env.local
cp corporate-portal/.env.example corporate-portal/.env.local
# edit backend/.env — at minimum set JWT_ACCESS_SECRET / JWT_REFRESH_SECRET to random strings.
# Every other key (Maps, SMS, Razorpay) has a safe dev fallback — see the table in §3.

docker compose up --build
```

First run only — generate and apply the initial migration, then seed reference data:

```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npm run prisma:seed
```

(`migrate dev` is used here, not `migrate deploy`, because no migration history exists yet in this repo — it
was authored without a live database connection. `migrate dev` creates `backend/prisma/migrations/<timestamp>_init/`
the first time; commit that folder. Every subsequent environment — staging, production, CI — then uses
`prisma migrate deploy`, which only applies migrations that already exist in that folder.)

Now:
- Backend + Swagger docs: http://localhost:3000/api/v1/docs
- Admin Dashboard: http://localhost:3001 (sign in with the seeded admin phone `+910000000001` — the OTP prints to
  `docker compose logs backend` since no real SMS provider is configured by default)
- Corporate Portal: http://localhost:3002
- Mobile apps: run separately with Flutter, pointing `API_BASE_URL` at `http://10.0.2.2:3000/api/v1` (Android
  emulator) or your machine's LAN IP (physical device) — see `mobile/*/README.md`.

## 2. Running without Docker (bare metal / for active development)

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init   # first time only
npm run prisma:seed
npm run start:dev                    # http://localhost:3000

# in another terminal
cd admin-dashboard && npm install && npm run dev     # http://localhost:3001
cd corporate-portal && npm install && npm run dev    # http://localhost:3002
```

You'll need Postgres and Redis reachable locally — either `docker compose up postgres redis` from the repo root,
or your own installs, matching `DATABASE_URL` / `REDIS_URL` in `backend/.env`.

## 3. Where every key goes

| Service | Env var(s) | File | Dev fallback if unset |
|---|---|---|---|
| Database | `DATABASE_URL` | `backend/.env` | — required, no fallback |
| Redis | `REDIS_URL` | `backend/.env` | — required, no fallback |
| JWT signing | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | `backend/.env` | — required; generate with `openssl rand -hex 32` |
| SMS/OTP (Twilio) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | `backend/.env` | OTP is logged to the backend console instead of sent |
| SMS/OTP (MSG91) | `MSG91_AUTH_KEY`, `MSG91_SENDER_ID` | `backend/.env` (set `SMS_PROVIDER=msg91`) | same as above |
| Maps (server-side distance/ETA) | `GOOGLE_MAPS_SERVER_KEY` | `backend/.env` | falls back to a haversine-distance estimate — functionally complete but less accurate than real road distance |
| Maps (browser) | `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | `admin-dashboard/.env.local`, `corporate-portal/.env.local` | map views render as plain tables until you wire in `@react-google-maps/api` |
| Maps (mobile) | native config, not an env var | `android/app/src/main/AndroidManifest.xml`, `ios/Runner/AppDelegate.swift` (see `mobile/*/README.md`) | — |
| Payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | `backend/.env` | orders are mocked (`order_mock_...`), signature checks are skipped |
| Push notifications | Firebase project config files | mobile native folders | push is simply not sent; the app still works via in-app polling |

None of these are hard-coded anywhere in the source — every one is read from `process.env` (backend),
`String.fromEnvironment` / `--dart-define` (Flutter), or `NEXT_PUBLIC_*` build-time env vars (Next.js).

## 4. Staging vs Production

Recommended setup: two copies of the same stack, different `.env` files and image tags, ideally two separate
cloud projects/accounts so a staging mistake can't touch production data.

- **Staging**: deploys automatically from the `staging` branch (see `.github/workflows/ci-cd.yml`), smaller
  instance sizes, a separate Razorpay *test* key, a separate Postgres database.
- **Production**: deploys from `main` after the `staging` branch has been validated, real Razorpay *live* keys,
  automated backups turned on (see §6), and the `deploy` job in CI gated behind a GitHub Environment with
  required reviewers.

`docker-compose.prod.yml` at the repo root is a single-box reference for both — point `.env.prod`
(`cp .env.prod.example .env.prod`, then fill in) at whichever environment you're standing up, and give staging
and production their own `.env.prod` + a different `IMAGE_TAG`/`REGISTRY` pair if useful.

For anything beyond a single box, swap `docker-compose.prod.yml` for your target platform's equivalent — an ECS
task definition, a Cloud Run service per container, or a Helm chart for Kubernetes — the `Dockerfile` in each of
`backend/`, `admin-dashboard/`, `corporate-portal/` is the portable unit; `docker-compose.prod.yml` is one
concrete way to run those images, not the only one.

## 5. CI/CD

`.github/workflows/ci-cd.yml` runs on every push/PR to `main`/`staging`:

1. **backend-test** — install, `prisma generate`, lint, run migrations against a throwaway Postgres service
   container, unit tests (`pricing.service.spec.ts`, `commission.service.spec.ts`), build.
2. **admin-dashboard-build** / **corporate-portal-build** — install + `next build`.
3. **build-and-push** (main/staging only, after the above pass) — builds and pushes all three Docker images to
   GHCR, tagged with both the commit SHA and the branch name.
4. **deploy** (main only) — a placeholder step; wire in your actual deploy command (SSH + compose pull/up, ECS
   service update, Cloud Run deploy, or a Helm upgrade) — gated behind a GitHub Environment named `production` so
   you can require manual approval before it runs.

Add these repository secrets before enabling the pipeline for real: none are required beyond the built-in
`GITHUB_TOKEN` for GHCR push; add deploy-target credentials (SSH key, cloud provider credentials) as additional
secrets once you fill in the `deploy` job.

## 6. Database backups & disaster recovery

Not automated by this repo (it depends entirely on where you host Postgres) — the checklist:

- If you use a managed Postgres (RDS/Cloud SQL/Neon/Supabase), turn on automated daily snapshots + point-in-time
  recovery in that provider's console; this is usually a one-toggle setting.
- If you self-host Postgres in a container, add a `pg_dump` cron (or a sidecar like `prodrigestivill/postgres-backup-local`)
  writing to off-box object storage (S3/GCS), and test a restore at least once before go-live.
- `VendorSettlement`, `CorporateInvoice`, `Payment`, and `AuditLog` are the tables you cannot afford to lose —
  they're the financial and compliance record.

## 7. Monitoring & logging

Not bundled (deliberately — this varies a lot by team), but the app is built to slot into standard tooling:

- The backend logs to stdout/stderr (Nest's default `Logger`) — ship it with your platform's log driver
  (CloudWatch, Stackdriver, Loki, ELK) rather than a bespoke agent.
- Add an APM agent (Datadog, New Relic, Sentry) by wrapping `main.ts`'s bootstrap — nothing in the app precludes
  it, none is included by default to avoid forcing a vendor choice.
- The Docker healthchecks in each `Dockerfile`/`docker-compose*.yml` are enough for a load balancer or
  orchestrator to detect an unhealthy container; feed the same endpoints into your uptime monitor.

## 8. Building & releasing the mobile apps

See `mobile/customer_app/README.md` and `mobile/driver_app/README.md` for the Flutter-specific build/release
steps (Play Store / App Store) once you've generated the platform folders with `flutter create`.
