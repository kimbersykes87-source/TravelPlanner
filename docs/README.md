# Documentation index

All project documentation is under `docs/` and organised by topic. Use this index to find the right doc.

---

## docs/deployment/

Deploy, Cloudflare, and pre-deploy checklist.

| File | Description |
|------|-------------|
| [DEPLOY_INSTRUCTIONS.md](deployment/DEPLOY_INSTRUCTIONS.md) | **Canonical deploy steps for Cursor/agents** — when the user says "deploy", follow this |
| [DEPLOYMENT.md](deployment/DEPLOYMENT.md) | Deployment overview: env vars, build settings, Supabase CLI, keep-alive, Sheets sync |
| [BEFORE_YOU_DEPLOY.md](deployment/BEFORE_YOU_DEPLOY.md) | One-time checklist: migrations, Sheets sync, Cloudflare credentials |
| [CLOUDFLARE_AUDIT.md](deployment/CLOUDFLARE_AUDIT.md) | Cloudflare deployment audit (security, build, UX) |

---

## docs/setup/

Setup guides for data sources and push.

| File | Description |
|------|-------------|
| [GOOGLE_SETUP.md](setup/GOOGLE_SETUP.md) | Google Sheets + Apps Script → Supabase sync (checks, deletes, sync history) |
| [AUTH_SETUP.md](setup/AUTH_SETUP.md) | **One-time rollout:** sign-in accounts, database lock-down, share-link function |
| [WEBHOOKS_INSTALL_GUIDE.md](setup/WEBHOOKS_INSTALL_GUIDE.md) | Database webhooks for push notifications (5 webhooks) |
| [PUSH_NOTIFICATIONS_SETUP.md](setup/PUSH_NOTIFICATIONS_SETUP.md) | Full push setup: VAPID, Edge Functions, webhooks, cron |
| [REMAINING_PUSH_STEPS.md](setup/REMAINING_PUSH_STEPS.md) | Short checklist for finishing push setup |

---

## docs/specs/

Feature specs, behaviour, and design.

| File | Description |
|------|-------------|
| [VISA_RULES.md](specs/VISA_RULES.md) | **Current** visa and residency rules (ESTA, B1/B2, Schengen, UK tax year) |
| [FUTURE_SCENARIOS_SPEC.md](specs/FUTURE_SCENARIOS_SPEC.md) | Future scenarios data model (visa section superseded by VISA_RULES.md) |
| [VISA_LOGIC_MIGRATION_DOC.md](specs/VISA_LOGIC_MIGRATION_DOC.md) | Historical: visa logic migration from v1 |
| [VIEWER_MODE.md](specs/VIEWER_MODE.md) | Read-only share link (`/view?k=…`) |
| [DESIGN_SYSTEM.md](specs/DESIGN_SYSTEM.md) | Design tokens, colours, typography |
| [APPLICATION_SUMMARY.md](specs/APPLICATION_SUMMARY.md) | High-level application summary |

---

## docs/architecture/

System and data flow.

| File | Description |
|------|-------------|
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Overview, deployment, data flow, making changes |

---

## docs/audits/

Audit and quality reports.

| File | Description |
|------|-------------|
| [APP_AUDIT_SCORE.md](audits/APP_AUDIT_SCORE.md) | App audit score |
| [LIGHTHOUSE_AUDIT_2026-02.md](audits/LIGHTHOUSE_AUDIT_2026-02.md) | Lighthouse audit Feb 2026 |
| [PHASE_AUDIT.md](audits/PHASE_AUDIT.md) | Phase audit |

---

## docs/archive/

Historical / reference docs.

| File | Description |
|------|-------------|
| [travel_planner_supabase_migration_6a0f0b90.plan.md](archive/travel_planner_supabase_migration_6a0f0b90.plan.md) | Supabase migration plan (reference) |

---

## Reviews

| File | Description |
|------|-------------|
| [SITE_REVIEW_2026-09.md](SITE_REVIEW_2026-09.md) | September 2026 review, findings and the work done |
