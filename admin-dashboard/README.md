# Cab Platform — Admin Dashboard

Next.js 14 (App Router) + TypeScript + Tailwind. Talks to the backend REST API only — no server-side database access.

## Setup

```bash
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at your backend
npm install
npm run dev                  # http://localhost:3001
```

## Signing in

This portal only accepts users whose role is one of `SUPER_ADMIN`, `OPS_ADMIN`, `FINANCE_ADMIN`, `SUPPORT_ADMIN`.
The backend seed script (`npm run prisma:seed` in `backend/`) creates a `SUPER_ADMIN` at phone `+910000000001` —
request an OTP for that number to get your first login (the OTP is printed to the backend console in dev, since no
real SMS provider is configured by default).

To add more admin staff, call `POST /users/staff` as a `SUPER_ADMIN` (see the Swagger docs at
`{API_URL}/docs`), or add rows directly via Prisma Studio.

## Pages

Overview, Bookings, Live Trips & Map (Socket.IO), Drivers, Vehicles, Vehicle Categories, Corporate Companies,
Pricing Rules, Commission Rules, Corporate Invoices, Vendor Settlements, Reports.

## Notes / what's intentionally left as a seam

- The live map page renders a raw table of driver GPS pings; swap in `@react-google-maps/api` (or another
  provider) using `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` for an actual map.
- Reports is a thin client-side aggregate — point a BI tool at a read replica of the Postgres database for
  anything more serious.
