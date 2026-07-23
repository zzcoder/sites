# Plank Check-in / 平板打卡

A phone-first bilingual plank check-in app for a small group. It includes daily check-ins, approved leave, rankings, personal reports, $5 missed-day penalties, payment clearing, persistent browser login, and admin password resets.

## Local development

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Set `DATABASE_URL` to a PostgreSQL connection string. Tables and the initial `audrey` and `zhihong` admin accounts are created automatically on the first request. A user's first login sets their password; the session remains valid in the same browser for up to one year.

For UI-only local QA without a database:

```bash
DEMO_MODE=1 npm run dev
```

Demo mode is an in-memory development fixture and must not be enabled on Vercel.

## Daily penalties

The exercise day changes at 5:00 a.m. in `APP_TIME_ZONE`. A $5 penalty is materialized for each prior day without a check-in or approved leave. Dashboard requests also run this idempotent update, so a delayed cron cannot miss penalties.

`vercel.json` invokes the protected cron once daily at 10:05 UTC, the Hobby-plan limit. This is 5:05 a.m. Eastern Standard Time and 6:05 a.m. Eastern Daylight Time. Dashboard requests also apply the update as soon as the exercise day changes at 5:00 a.m., so the cron is a fallback rather than the only trigger. Set `CRON_SECRET`; Vercel sends it as `Authorization: Bearer …` to the cron route.

## Admin actions

- Approve or decline leave requests.
- Add members or admins.
- Record payment and clear a member's amount due.
- Clear a password, which also invalidates that user's remembered sessions. On their next visit they select a new password.

## Validation

```bash
npm run lint
npm run build
```

The production UI lives in `src/components/plank-app.tsx`; generated desktop/mobile backgrounds are under `public/images`.

## Restore or redeploy

1. Clone the repository and enter `plank_checkin/`.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and supply the required values.
4. Run `npm run build`, then `npm start`.

For Vercel, import this directory as the project root and configure
`DATABASE_URL`, `APP_TIME_ZONE`, and `CRON_SECRET`. Configure
`WECHAT_APP_ID` and `WECHAT_APP_SECRET` only when deploying the Mini Program
backend. Secrets and `.env.local` must never be committed.

The application creates its database tables automatically. Existing production
records remain in Neon and are not stored in this repository; preserving those
records requires retaining the Neon project or maintaining a separate database
backup.

## WeChat Mini Program

The native Mini Program client lives in `miniprogram/`. It uses automatic
`wx.login`/`openid` identity rather than the website password screen. Returning
users are signed in silently; a new account confirms its display name once
because WeChat does not expose nicknames during silent login.

To connect it:

1. Import `miniprogram/` into WeChat Developer Tools and put the real AppID in
   `miniprogram/project.config.json`.
2. Add `https://plank-checkin.vercel.app` to the Mini Program's request legal
   domains.
3. Set `WECHAT_APP_ID` and `WECHAT_APP_SECRET` in the Vercel Production
   environment, then redeploy. Never put the AppSecret in Mini Program code.

The Mini Program includes Today, Ranking, Report, leave requests, payments,
member administration, and website password resets.
