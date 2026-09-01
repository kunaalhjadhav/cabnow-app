# Cab Platform — Corporate Portal

Next.js 14 (App Router) + TypeScript + Tailwind, for corporate admins/bookers/approvers.

## Setup

```bash
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at your backend
npm install
npm run dev                  # http://localhost:3002
```

## Signing in

Only `CORPORATE_ADMIN`, `CORPORATE_BOOKER` and `CORPORATE_APPROVER` accounts can sign in here. To create the first
one for a company: as a platform admin, `POST /corporate/companies/:id/users` (or use the Admin Dashboard →
Corporate Companies flow once it's extended with an invite button), then that phone number can request an OTP here.

## Pages

Dashboard (credit/billing snapshot), Book a Trip (full package form: pickup/drop/stops/waiting time/vehicle/
schedule/passenger/instructions), Bookings, Route Change Approvals, Employees & Bookers, Billing & Invoices.

## How the approval workflow works

A booking made by a `CORPORATE_BOOKER` for a `CORPORATE_PACKAGE` is created as `PENDING_APPROVAL`; a
`CORPORATE_ADMIN` or `CORPORATE_APPROVER` account approves/rejects it from the Bookings API
(`PATCH /bookings/:id/approve|reject`) — wire a button into the Bookings page if your workflow needs that in-app
rather than via Swagger. Mid-trip route changes follow the same idea but scoped per-trip: see
`/route-approvals`, backed by the admin-configurable `CorporateRouteEditConfig` (max stops, max deviation km, max
extra waiting minutes, whether approval is required at all) that Admin sets per company.
