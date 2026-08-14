# Interview Lab

An installable, offline-first React PWA for studying 200 full-stack interview concepts and taking secure adaptive mock assessments.

## What is implemented

- Exactly 200 study lessons: JavaScript 55, React 35, Next.js App Router 15, APIs/Node/Express/PostgreSQL 40, full-stack 35, Git/GitHub 20.
- Every lesson has an open prompt, private typed answer, reusable three-state animation, model response, expected concepts, mistake, follow-up, reference, and linked deterministic assessment template.
- IndexedDB study progress, spaced repetition, offline PWA caching, reconnect synchronization, and logout cache clearing.
- Twenty-item Flexible and Strict assessments with four items per topic family, Rasch EAP scoring, server deadlines, idempotent responses, recent-item avoidance, cryptographic randomization, and delayed answer review.
- Google authentication, generated pseudonyms, consent, RLS isolation, real-name opt-in, score hiding, sanitized separate leaderboards, and admin removal audit records.
- No AI API or paid runtime dependency.

The scaled grade is `clamp(0, 100, round(50 + 10 * theta))`; it is not a percentage correct. Results are provisional preparation estimates, not certified psychometrics or hiring decisions.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Without Supabase variables, all 200 lessons and offline study features work. Secure assessments intentionally remain disabled because answer keys must never be put in a local browser fallback.

Run verification:

```bash
npm test
npm run build
npm run verify:bundle
```

The production bundle must not contain `correctOptionIds`, assessment explanations, or the server item bank. The bank lives in `server/` and is imported only by the Edge Function and tests.

## Supabase setup

1. Create a free Supabase project and run `supabase/migrations/0001_interview_lab.sql`.
2. Enable Google under Authentication > Providers and add the local and deployed redirect URLs.
3. Create a free Cloudflare Turnstile widget for the deployed hostname.
4. Set frontend values from `.env.example` in Cloudflare Pages.
5. Set Edge Function secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... TURNSTILE_SECRET_KEY=... ASSESSMENTS_ENABLED=true
supabase functions deploy assessment-api
```

The service-role key is an Edge Function secret only. Never prefix it with `VITE_` or put it in Cloudflare Pages.

For a leaderboard moderator, set `app_metadata.role` to `leaderboard_admin`. This role can remove public entries through the dedicated audited operation; it receives no RLS policy for private study answers or assessment responses.

## Cloudflare Pages deployment

- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback: `public/_redirects` is included.
- Use the free `pages.dev` domain if no custom domain is desired.

Set quota alerts in Supabase and Cloudflare. If a free limit is near, set `ASSESSMENTS_ENABLED=false`; study mode remains available from the PWA cache. Free-tier terms can change, so zero-cost means no paid dependencies while the five-day, roughly 40-candidate event stays inside current provider quotas.

## CAT validation

The application uses a standard-normal prior and a theta grid from -4 to 4 in 0.05 steps. `src/lib/catr-golden.json` contains correct, incorrect, mixed, extreme, and topic-balanced golden vectors. Recreate them from CRAN `catR` with:

```bash
Rscript scripts/generate-catr-golden.R
```

Initial item difficulties are fixed in source for event version `2026-08-event-v1`: levels 1 through 5 map to Rasch difficulties -2 through 2. Freeze the deployed commit for the event so grades do not move retroactively. Anonymous response statistics can be exported later for calibration.

## Security boundaries

- Browser: public item only, current deadline, own profile, own completed result, sanitized leaderboard.
- Edge Function: answer keys, unseen item pool, scoring parameters, selection, timing, and completion.
- Postgres: append-only assessment responses and study attempts, one active session per candidate, ownership RLS, and no direct leaderboard table access.
- Public leaderboard: rank, chosen display label, grade, readiness band, and mode only.

Strict mode discourages outside help; it is not supervised proctoring.

## Live pre-event checks

After linking the project, run the two-account RLS suite with `supabase test db`. With the deployed frontend and Edge Function available, run:

```bash
SITE_URL=https://your-site.pages.dev \
ASSESSMENT_API_URL=https://your-project.supabase.co/functions/v1/assessment-api \
npm run load:test
```

This sends 40 simultaneous frontend reads and 100 concurrent sanitized leaderboard reads. Timer, OAuth, Turnstile, and delayed-delivery checks require the configured live project because the secure assessment path intentionally has no browser-only fallback.
