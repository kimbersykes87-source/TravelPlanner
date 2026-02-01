# Travel Planner v2

Digital Nomad Travel Planner — visa tracking, past travels, present bookings, future scenarios. React + Vite + Supabase, deployed on Cloudflare Pages.

---

## For future you / agents

- **Project path:** `c:\dev\TravelPlanner_v2` (this repo is the **source of truth**)
- **Deploy:** When the user says "deploy" or "redeploy", follow **[docs/deployment/DEPLOY_INSTRUCTIONS.md](docs/deployment/DEPLOY_INSTRUCTIONS.md)** and run the steps there (add, commit, push to `feat/globe-loader`)
- **Live site:** https://travelplanner-ks.pages.dev  
- **Repo:** https://github.com/kimbersykes87-source/TravelPlanner (branch `feat/globe-loader` for production)
- **Docs:** All documentation is under **`docs/`** and folderised — see [docs/README.md](docs/README.md) for the index

---

## Quick start

```bash
cd c:\dev\TravelPlanner_v2
cp .env.example .env.local   # then fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev                  # http://localhost:5173
```

**Build:** `npm run build` → output in `dist/`

---

## Environment

- **Local:** Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (and optionally `VITE_APP_PASSWORD`, `VITE_VAPID_PUBLIC_KEY`)
- **Cloudflare Pages:** Set the same `VITE_*` vars in Dashboard → Workers & Pages → travelplanner-ks → Settings → Environment variables, then **redeploy** so the build includes them (required for data and edits to work)

---

## Documentation layout

| Folder | Contents |
|--------|----------|
| [docs/deployment/](docs/deployment/) | Deploy steps, Cloudflare settings, before-you-deploy checklist |
| [docs/setup/](docs/setup/) | Google Sheets sync, push notifications, webhooks |
| [docs/specs/](docs/specs/) | Future scenarios spec, visa logic, viewer mode, design system, application summary |
| [docs/architecture/](docs/architecture/) | System architecture and data flow |
| [docs/audits/](docs/audits/) | Audit reports (Cloudflare, Lighthouse, phase) |
| [docs/archive/](docs/archive/) | Historical migration / plan docs |

Full index: **[docs/README.md](docs/README.md)**

---

## Key links

- [Deploy instructions (agents)](docs/deployment/DEPLOY_INSTRUCTIONS.md)
- [Deployment overview](docs/deployment/DEPLOYMENT.md)
- [Google Sheets → Supabase setup](docs/setup/GOOGLE_SETUP.md)
- [Architecture](docs/architecture/ARCHITECTURE.md)
