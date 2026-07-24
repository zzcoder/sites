# Plane Pull Team Healthy Hikers

Vercel-ready website for the Healthy Hikers Plane Pull roster and donation totals.

## Data

The app reads and edits the Supabase table `plane-pull`.

Required columns:

- `Name`
- `Role` (`puller` or `backup`)
- `Donation`
- `Comment`

The API also creates `id`, `created_at`, and `updated_at` fields so the admin UI can edit rows safely.

## Vercel environment variables

Set these in Vercel Project Settings > Environment Variables:

```text
DATABASE_URL=postgresql://postgres.pgughtrigtsinddhbtoe:<PASSWORD>@aws-1-us-east-1.pooler.supabase.com:6543/postgres
ADMIN_PASSWORD=<ADMIN_PASSWORD>
```

Use the Supabase **Transaction pooler** connection string from the Supabase dashboard. The direct URL
`db.pgughtrigtsinddhbtoe.supabase.co:5432` is IPv6-only unless the paid Supabase IPv4 add-on is enabled, and Vercel functions are IPv4-only for outbound database connections.

## Local development

Install dependencies:

```bash
npm ci
```

Run with mocked data for UI testing:

```bash
USE_MOCK_DATA=1 npm run local
```

Open:

```text
http://localhost:3100
```

The real database path will work locally only on an IPv6-capable network or if `DATABASE_URL` is set to the Supavisor pooler URL.

## Admin

Open the page, click `Admin`, and unlock with the configured `ADMIN_PASSWORD`.

## Restore or redeploy

1. Clone the repository and enter `plane_pull/`.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and configure `DATABASE_URL` and
   `ADMIN_PASSWORD`.
4. Run `npm run check`.
5. Run `npm run local` for the local server, or import this directory into
   Vercel for production.

The API creates the required application tables when needed. Existing roster,
donation, and vote records remain in Supabase and are not stored in this
repository; retaining those records requires preserving the Supabase project
or maintaining a separate database backup.

## Shirt vote report

Print each person's shirt color and size, followed by color rankings, the winning
color or tied colors, and shirt counts for each size:

```bash
npm run vote-results
```

The command reads `DATABASE_URL` from `.env.local` or the shell environment. It is
read-only and does not create or update votes.

## Shirt design vote

Open `/design-vote.html` to compare the front and back of Options A-D and save one
current vote per roster member. The API creates and uses the separate Supabase table
`plane_pull_design_votes`; saving a new choice replaces that member's earlier design
vote without changing the existing color and size vote.
