# Cloudflare Deployment Audit – Travel Planner v2

**Date:** 2026-01-31  
**Target:** Cloudflare Pages deployment to `travelplanner.kimbersykes.com`

---

## Executive Summary

The app builds successfully and is suitable for Cloudflare Pages deployment. The audit identified **1 critical security item**, several hardening opportunities, and UX/UI improvements.

---

## 1. Build & Deployment

| Item | Status |
|------|--------|
| `npm run build` | ✅ Succeeds |
| Output directory | `dist/` |
| PWA assets | ✅ Generated (sw.js, manifest, precache) |
| Chunk size | ⚠️ 680 kB main bundle (consider code-splitting) |

### Cloudflare-Specific

- **SPA routing:** Cloudflare Pages auto-detects SPAs and serves `index.html` for unknown routes. A `public/_redirects` with `/*  /index.html  200` has been added as a fallback.
- **Environment variables:** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare Dashboard → Pages → Settings → Environment variables.
- **`.env.example`** created for local setup and deployment reference.

---

## 2. Security Findings

### 🔴 Critical: Hardcoded Password

**File:** `src/components/PasswordGate.jsx`  
**Issue:** The password `betterthanlego2026!` is hardcoded in client-side JavaScript. Anyone can view it in the source.

**Recommendation:**
- **Option A:** Move to `VITE_APP_PASSWORD` env var (still client-visible but not in git).
- **Option B:** Keep as-is if this is only for casual privacy (not real security). Document clearly.
- **Option C:** Implement a simple backend (Cloudflare Worker / Supabase Edge Function) that validates the password server-side and returns a short-lived token.

### Supabase RLS

- All tables use **permissive policies** (`USING (true) WITH CHECK (true)`) for `anon`.
- This is acceptable while the password gate is the only protection.
- Consider tightening RLS if you later add multi-user support or public access.

### Session Storage

- Password gate uses `sessionStorage` – users re-authenticate on new tabs/windows. This is reasonable for a private app.

---

## 3. Hardening Suggestions

| Area | Suggestion |
|------|------------|
| **Error boundary** | Wrap app in a React Error Boundary to prevent full white screen on runtime errors. |
| **Supabase fallback** | When `supabase` is null (missing env), show a clear “Configure Supabase” message instead of silent failure. |
| **Meta tags** | Add `description` and `og:` tags in `index.html` for sharing. |
| **Offline UX** | PWA is configured; consider a “You’re offline” banner when fetch fails. |

---

## 4. UX/UI Improvements

### Loading States
- **Current:** Plain `Loading...` text on most pages.
- **Suggestion:** Use a consistent skeleton or spinner (e.g. re-use the existing `.plane-spin` animation) and a shared `<PageLoader />` component.

### Error Display
- **Current:** `--color-error` was referenced but not defined in `index.css`. **Fixed:** added `--color-error`, `--color-success`, `--color-warning` to design tokens.
- Error messages could include a “Retry” button where `refetch` is available.

### Accessibility
- **Positive:** Touch targets ≥ 44px, `aria-label` on nav, `role="dialog"` on modals.
- **Improvements:** Add `aria-live` for loading/error announcements; ensure focus trap in scenario editor modal; add `lang` on `html` (already present).

### Visual Consistency
- Some inline styles reference `var(--color-error)` without fallback; fallbacks are now consistent via CSS variables.
- Design system tokens (from `DESIGN_SYSTEM.md`) are not all applied in `index.css` – consider syncing.

### Icon Fallback
- `Icon` component has no fallback for missing icon names; unknown names may produce broken mask. Consider a default icon or warning in dev.

---

## 5. Performance

- **Bundle size:** Main chunk ~680 kB (above 500 kB warning). Consider:
  - Dynamic imports for heavy pages (e.g. `PastMap` with Leaflet, `FutureScenarios`).
  - Lazy-load Lottie assets.
- **Fonts:** Google Fonts loaded via `@import`; consider `font-display: swap` if not already applied.
- **Images:** External flag images from `flagcdn.com` are cached by Workbox; good.

---

## 6. PWA & Mobile

- Manifest and service worker configured.
- `InstallPrompt` shows on iOS/Android when not standalone.
- Safe-area insets used for footer/nav.
- Consider testing on real devices (iOS Safari, Android Chrome) for install flow.

---

## 7. Changes Made in This Audit

1. **`src/index.css`:** Added `--color-error`, `--color-success`, `--color-warning` CSS variables.
2. **`public/_redirects`:** Added `/*  /index.html  200` for SPA routing fallback.
3. **`.env.example`:** Created with required and optional env vars.

---

## 8. Pre-Deploy Checklist

- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages env.
- [ ] (Optional) Set `VITE_APP_PASSWORD` and update `PasswordGate` to use it.
- [ ] Test production build locally: `npm run build && npm run preview`.
- [ ] Verify SPA routes (e.g. `/us`, `/past/all-time`, `/future/scenarios`) work after deploy.
- [ ] Ensure Supabase project is active (7-day keep-alive or daily sync).

---

*Generated by Travel Planner v2 Cloudflare audit*
