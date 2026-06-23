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
npm install
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
