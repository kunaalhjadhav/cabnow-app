# Cab Booking & Corporate Transport Platform

A full-stack scaffold covering Phases 1–4 of the platform spec: backend API, admin dashboard, corporate portal,
and both mobile apps' source, wired together with a configurable pricing engine, commission engine, corporate
billing, vendor settlements, and live tracking.

```
cab-platform/
├── backend/                 NestJS + Prisma + PostgreSQL + Redis + Socket.IO — the API everything else talks to
├── admin-dashboard/         Next.js — platform admin: fleet, pricing/commission config, dispatch, billing
├── corporate-portal/        Next.js — corporate companies: package booking, approvals, billing
├── mobile/
│   ├── customer_app/        Flutter source — passenger app
│   └── driver_app/          Flutter source — driver partner app
├── infra/nginx/             Reverse proxy config for the production compose file
├── docs/                    ARCHITECTURE.md, DEPLOYMENT.md
├── docker-compose.yml        Local dev stack
├── docker-compose.prod.yml   Production-shaped stack (built images + Nginx)
└── .github/workflows/       CI/CD pipeline
```

## Start here

1. Read **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — the exact commands to get the backend + both web portals
   running locally, where to put every API key (Maps, SMS/OTP, Razorpay), and how staging/production/CI/CD fit
   together.
2. Read **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how the pieces fit, and specifically how pricing,
   commission and route-editing rules stay data-driven rather than hard-coded (spec §14).
3. For the mobile apps, read `mobile/customer_app/README.md` and `mobile/driver_app/README.md` — they need the
   Flutter SDK locally (not available in the environment this was built in) to generate platform folders and run.

## What's fully built vs. what's a documented seam

**Fully implemented and wired end-to-end:** OTP+JWT auth with RBAC, all 24 core entities from the spec, the full
booking → dispatch → trip lifecycle → completion → payment/commission/settlement pipeline, the configurable
pricing and commission engines, corporate package booking with route editing + approval workflow + full audit
trail, corporate billing/invoicing, vendor settlements, live tracking over Socket.IO, Razorpay integration,
SMS/OTP provider abstraction (Twilio/MSG91), Swagger API docs, Docker images for all three web services, and a
CI pipeline that lints/tests/builds/pushes images on every push.

**Deliberately left as a clearly-marked seam** (per spec's own Phase 5 = "advanced features", and because they
depend on infrastructure only you can provide — a Maps/SMS/payment account, a push-notification project, a
turn-by-turn SDK): a real Google Maps view in place of the admin/portal's live-position table, object-storage
upload for KYC documents (currently posts a local file path — see `mobile/driver_app/README.md`), FCM push
instead of the driver app's 6-second poll for new trip requests, and Phase 5 items (surge-pricing UI polish,
promotions/subscriptions, fraud detection, geofencing, AI-assisted dispatch). Every one of these has a comment
in the relevant source file pointing at exactly where to plug it in.

## A note on how this was built

This was generated in a sandboxed environment with no access to the npm/PyPI registries and no running Docker
daemon, so the code could be written and manually reviewed but not actually `npm install`ed, built, or run.
Treat your first `docker compose up --build` (see DEPLOYMENT.md §1) as the real build check, and expect to fix
the odd dependency-version or type-mismatch issue that only surfaces once real `node_modules` exist — the
architecture and business logic have been reviewed carefully, but this is not a substitute for a real build.
