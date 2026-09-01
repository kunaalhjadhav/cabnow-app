# Architecture

## System map

```
Customer App (Flutter)  ─┐
Driver App (Flutter)     ─┼─▶  Backend API (NestJS)  ──▶  PostgreSQL (Prisma)
Admin Dashboard (Next.js)─┤         │        │
Corporate Portal (Next.js)┘         │        └──▶ Redis (cache / rate-limit / job state)
                                     │
                                     ├──▶ Socket.IO /tracking namespace (live GPS, trip-status, route-change push)
                                     ├──▶ SMS/OTP provider (Twilio or MSG91, swappable)
                                     ├──▶ Maps provider (Google Distance Matrix, swappable; haversine fallback)
                                     └──▶ Razorpay (orders, webhook-verified capture, refunds)
```

Every client (both Flutter apps, both Next.js portals) talks to one backend over REST + one Socket.IO namespace.
None of them touch the database directly.

## Backend module map (`backend/src/`)

| Module | Responsibility |
|---|---|
| `auth` | OTP request/verify, JWT access+refresh issuance/rotation, RBAC payload (role + companyId/vendorId/driverId scoping) |
| `users`, `customers`, `drivers`, `vendors`, `vehicles`, `vehicle-categories`, `corporate`, `employees`, `packages` | Core entity CRUD + the domain-specific actions each needs (driver KYC review, vehicle approval, corporate route-edit config, package templates) |
| `bookings` | Booking creation (immediate/scheduled/corporate-package), approval workflow, cancellation, hands off to dispatch |
| `trips` | Trip lifecycle state machine (ASSIGNED → ... → COMPLETED), stop arrival/departure, OTP verification, final-fare calculation, triggers commission + driver earnings |
| `route-changes` | Reads the admin-configured `CorporateRouteEditConfig`, prices a proposed change with the same pricing engine, routes to an approver when required, records the full audit trail (spec §4) |
| `dispatch` | Nearest-available-driver matching — the seam for a real geo-index / scoring function later |
| `tracking` | Socket.IO gateway: driver GPS ingestion + fan-out to trip watchers, driver watchers, and the admin live map |
| `pricing` | Configurable pricing engine — every fare component is a `PricingRule` row, not a code constant (spec §10/§14) |
| `commission` | Configurable commission engine — percentage or fixed, scoped to any combination of vendor/driver/category/company/city/zone/package (spec §5) |
| `payments` | Razorpay order creation, signature-verified capture, webhook handling, refunds |
| `invoices` | Batches a corporate company's completed trips into a billing-period invoice |
| `settlements` | Batches a vendor's completed trips into a payable settlement, tracks driver earnings/payouts |
| `notifications` | SMS abstraction (swap provider via `SMS_PROVIDER` env var) + in-app notification records |
| `ratings`, `support`, `audit` | Ratings query API (writes happen via `trips.rate`), support tickets, and a global audit-log interceptor that records every mutating request |

## The "don't hard-code business rules" principle in practice

Spec §14 asks for pricing, commissions, corporate permissions, route-editing limits, vehicle categories,
cancellation rules and package definitions to all be admin-configurable. Concretely, in this codebase that means:

- **Pricing**: `PricingRule` rows (`pricing_rules` table) — one row per fare component per scope (category/company/
  city/zone/package-type), resolved at calculation time by `PricingService.findBestRule` picking the most specific
  active match. Nothing in `PricingService.calculateFare` contains a currency amount.
- **Commission**: same pattern via `CommissionRule` / `CommissionService`.
- **Route editing**: `CorporateRouteEditConfig` — one row per company (or a `companyId: null` platform default) —
  read by `RouteChangesService` before it will accept any change.
- **Vehicle categories, packages**: plain tables (`VehicleCategory`, `Package`) managed from the Admin Dashboard /
  Corporate Portal, not enums baked into the schema (the *type discriminators* like `PricingRuleType` are enums
  because they're a fixed vocabulary of fare-component kinds; the *values* attached to them are all data).

## Data isolation

JWT payloads carry `companyId` (corporate roles) or `vendorId` (vendor roles) resolved at login
(`AuthService.resolveScopedIds`). `BookingsService.assertCompanyAccess` and the equivalent checks elsewhere use
that to stop one corporate account from reading another's bookings/invoices even though they hit the same REST
endpoints — extend this pattern (not per-table row-level security) if you add new company-scoped resources.

## Real-time layer

One Socket.IO namespace (`/tracking`), three room types:

- `trip:{tripId}` — customer app + admin dashboard watching one trip
- `driver:{driverId}` — anyone watching one driver directly
- `ops:live-map` — the admin dashboard's live operational map, gets every location update platform-wide

`TrackingGateway.emitTripEvent` is also called from `TripsService` and `RouteChangesService` so trip-status and
route-change events reach watchers immediately, not just GPS pings.
