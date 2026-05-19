# Перална — Car Wash Management (tripdrop.app)

Mobile-first PWA for operating a self-service car wash. Macedonian UI, MKD currency.

## Stack

- Next.js 15 (App Router)
- Neon Postgres + Drizzle ORM
- Tailwind CSS, Recharts
- Serwist PWA

## Local development

1. Copy `.env.example` to `.env` and set `DATABASE_URL` from [Neon](https://neon.tech).
2. Apply schema:

```bash
npm install
npm run db:setup
```

(`db:setup` creates all tables in Neon. Run this once on your PC with `.env` filled in.)

3. Run dev server:

```bash
npm run dev
```

Open http://localhost:3000

## Tests

```bash
npm test
```

## Deploy to tripdrop.app (Vercel)

1. Push this repo to GitHub.
2. Create a Neon project and copy `DATABASE_URL`.
3. In Vercel: **New Project** → import repo → Framework: **Next.js**.
4. Environment variables:
   - `DATABASE_URL` — Neon connection string
   - `NEXT_PUBLIC_APP_URL` — `https://tripdrop.app`
5. Run migrations once (from your machine with production `DATABASE_URL`):

```bash
npm run db:push
```

6. Remove the old TripDrop marketing project from the `tripdrop.app` domain.
7. Attach `tripdrop.app` to this Vercel project.

Legacy URL `/peralna` redirects to `/` via `vercel.json`.

## App tabs

| Tab | Route | Purpose |
|-----|-------|---------|
| Dashboard | `/` | Today’s snapshot |
| Daily Entry | `/daily` | 7-step noon routine |
| History | `/history` | Daily log |
| Analytics | `/analytics` | Charts & comparisons |
| Settings | `/settings` | Rates, chemicals, tokens, expenses |

## Security

No login per product spec. Keep the URL private. Optional `PERALNA_WRITE_SECRET` can be added later for write APIs.
