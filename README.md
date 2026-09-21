# Travel Planner v2

Kimber and Siona's private travel planner: visa and residency day counts,
past travels, what needs booking, and future scenarios. React + Vite +
Supabase, deployed on Cloudflare Pages, with the daily travel log kept in a
Google Sheet.

- **Live site:** https://travelplanner-ks.pages.dev
- **Repo:** https://github.com/kimbersykes87-source/TravelPlanner (production branch `feat/globe-loader`)
- **Project folder:** `C:\dev\TravelPlanner_v2` (source of truth)

## For future you / agents

- **Deploy:** when asked to "deploy", follow [docs/deployment/DEPLOY_INSTRUCTIONS.md](docs/deployment/DEPLOY_INSTRUCTIONS.md).
- **How it fits together:** [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md).
- **Visa maths:** [docs/specs/VISA_RULES.md](docs/specs/VISA_RULES.md). Change rules only in `src/lib/visa/` and keep `npm test` green.
- **Sheet sync:** [docs/setup/GOOGLE_SETUP.md](docs/setup/GOOGLE_SETUP.md).
- **Sign-in and database security:** [docs/setup/AUTH_SETUP.md](docs/setup/AUTH_SETUP.md) (live since 21 Sep 2026).
- **What the September 2026 update shipped:** [docs/deployment/GO_LIVE_2026-09.md](docs/deployment/GO_LIVE_2026-09.md).
- All docs: [docs/README.md](docs/README.md).

## Quick start

```powershell
cd C:\dev\TravelPlanner_v2
copy .env.example .env.local   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev                    # http://localhost:5173, sign in with your normal account
```

| Command | What it does |
|---------|--------------|
| `npm test` | Visa engine unit tests |
| `npm run lint` | ESLint |
| `npm run build` | Production build into `dist/` |

## Environment

- **Local:** `.env.local` (gitignored) with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optionally `VITE_VAPID_PUBLIC_KEY`.
- **Cloudflare Pages:** the same `VITE_*` variables under Settings > Environment variables, then redeploy.
- Anything starting with `VITE_` ends up in the browser. The service role key belongs only in Apps Script properties and Supabase function secrets.
