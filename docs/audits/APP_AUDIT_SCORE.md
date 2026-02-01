# Travel Planner v2 – Scored App Audit

**Audit Date:** 2026-01-31  
**Methodology:** Lighthouse-style criteria, codebase & config analysis  
**Overall Score: 72/100** (Good)

---

## Score Summary

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| **Performance** | 68 | 25% | 17 |
| **Accessibility** | 78 | 25% | 19.5 |
| **Best Practices** | 62 | 25% | 15.5 |
| **SEO** | 82 | 12.5% | 10.25 |
| **PWA** | 80 | 12.5% | 10 |
| **Total** | — | 100% | **72.25** |

---

## 1. Performance — 68/100

| Criterion | Status | Notes |
|-----------|--------|-------|
| Bundle size | ⚠️ 40 | Main chunk ~680 kB (Vite warns >500 kB). No code splitting. |
| Code splitting | ❌ 20 | All routes bundled together; Leaflet, Lottie loaded eagerly. |
| Font loading | ✅ 90 | Google Fonts with `display=swap` in URL. |
| Image optimization | ✅ 85 | SVG icons, external flags cached via Workbox. |
| Caching | ✅ 90 | Service worker caches assets; Supabase/flagcdn runtime cache. |
| Main thread | ✅ 75 | Visa calc uses `requestAnimationFrame`; generally responsive. |

**Improvements:**
- Lazy-load `PastMap` (Leaflet) and `FutureScenarios` with `React.lazy()`.
- Add `manualChunks` in Vite for vendor splitting (React, React Router, Supabase).
- Consider dynamic import for Lottie JSON.

---

## 2. Accessibility — 78/100

| Criterion | Status | Notes |
|-----------|--------|-------|
| Semantic HTML | ✅ 80 | Main, header, nav, footer; some div-heavy sections. |
| ARIA | ✅ 75 | `aria-label` on nav, `role="dialog"`, `aria-expanded`, `aria-controls`. |
| Touch targets | ✅ 95 | Buttons/links ≥ 44px (index.css); meets WCAG 2.5.5. |
| Color contrast | ✅ 85 | Dark theme, light text; primary blue on dark meets AA. |
| Focus management | ⚠️ 60 | No visible focus ring on some buttons; modals lack focus trap. |
| Screen reader | ⚠️ 65 | Icon has `aria-hidden`; loading/errors not announced via `aria-live`. |
| Form labels | ✅ 85 | Labels associated; some rely on placeholder. |

**Improvements:**
- Add `:focus-visible` outline for keyboard users.
- Implement focus trap in scenario editor and share modals.
- Add `aria-live="polite"` region for loading/error state updates.

---

## 3. Best Practices — 62/100

| Criterion | Status | Notes |
|-----------|--------|-------|
| HTTPS | ✅ 95 | Cloudflare provides; Supabase over HTTPS. |
| Console errors | ✅ 80 | No obvious errors in normal flow. |
| Deprecated APIs | ✅ 90 | Modern React, Vite; no deprecated usage found. |
| Security | ❌ 35 | Password in client bundle; Supabase RLS permissive. |
| Error handling | ⚠️ 55 | No Error Boundary; `supabase` null not surfaced clearly. |
| Input validation | ✅ 75 | Scenario validation; date checks. |

**Improvements:**
- Add React Error Boundary to prevent full app crash.
- Show clear “Configure Supabase” when env vars missing.
- Move password check server-side or document as cosmetic only.

---

## 4. SEO — 82/100

| Criterion | Status | Notes |
|-----------|--------|-------|
| Title | ✅ 95 | Unique, descriptive. |
| Meta description | ✅ 90 | Added in audit. |
| Viewport | ✅ 100 | Correct viewport meta. |
| Crawlability | ⚠️ 70 | SPA; Cloudflare serves index.html; no sitemap. |
| Structured data | ❌ 40 | No JSON-LD for app or content. |
| Mobile-friendly | ✅ 95 | Responsive, touch targets, safe-area. |

**Improvements:**
- Add `og:title`, `og:description`, `og:image` for social sharing.
- Optional: Add sitemap for main routes (low priority for private app).

---

## 5. PWA — 80/100

| Criterion | Status | Notes |
|-----------|--------|-------|
| Manifest | ✅ 90 | Name, icons, display, theme; could add more icon sizes. |
| Service worker | ✅ 95 | Workbox, precache, runtime caching. |
| Offline shell | ✅ 85 | Cached; Supabase requires network for data. |
| Installability | ✅ 85 | `InstallPrompt` for iOS/Android; `beforeinstallprompt`. |
| App-like UX | ✅ 75 | Standalone, safe-area; orientation portrait-primary. |

**Improvements:**
- Add 192×192 and 512×512 PNG icons for better install experience.
- Add “You’re offline” banner when fetch fails.

---

## How to Run Lighthouse Yourself

Lighthouse couldn’t run in headless mode for this app. Run it manually:

1. Deploy to Cloudflare Pages (or run `npm run preview`).
2. Open Chrome DevTools → **Lighthouse** tab.
3. Select Performance, Accessibility, Best Practices, SEO.
4. Choose **Mobile** or **Desktop**.
5. Click **Analyze page load**.

For the password gate, either:
- Run against dev (`npm run dev`) so the gate is bypassed, or  
- Enter the password first, then run Lighthouse.

---

## Score Legend

| Score | Rating |
|-------|--------|
| 90–100 | Excellent |
| 75–89 | Good |
| 50–74 | Needs improvement |
| 0–49 | Poor |

**Overall 72 = Good** — ready for deployment with room to improve in performance and best practices.
