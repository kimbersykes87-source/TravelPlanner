# Lighthouse Audit – Travel Planner v2

**Date:** 2026-02-01  
**URL tested:** http://localhost:5175/ (dev server)  
**Method:** `npx lighthouse` (headless Chrome, mobile emulation)

---

## Score Summary

| Category | Score | Status |
|----------|-------|--------|
| **Performance** | 47 | Needs improvement |
| **Accessibility** | 98 | Good |
| **Best Practices** | 96 | Good |
| **SEO** | 92 | Good |

> **Note:** Performance was measured against the **dev server** (unminified JS, HMR, source maps). Production builds typically score significantly higher.

---

## 1. Performance — 47

### Metrics (dev mode)

| Metric | Value | Target |
|--------|-------|--------|
| First Contentful Paint (FCP) | 11.3 s | < 1.8 s |
| Largest Contentful Paint (LCP) | 26.4 s | < 2.5 s |
| Speed Index | ~5.2 s | < 3.4 s |
| Total Blocking Time (TBT) | 73 | < 200 ms |
| Cumulative Layout Shift (CLS) | 0 | < 0.1 |
| Time to Interactive (TTI) | Poor | < 3.8 s |

### Findings

- **FCP / LCP / Speed Index:** Very slow in dev mode due to unminified bundles, HMR, and source maps. Expected to improve substantially in production.
- **CLS:** 0 – no layout shifts detected.
- **TBT:** Acceptable; main-thread work is reasonable for dev.

### Recommendation

Re-run Lighthouse against a **production build** (`npm run build` then `npm run preview`) for meaningful performance scores. Dev mode results are not representative of deployed performance.

---

## 2. Accessibility — 98

### Failed audits

| Audit | Issue |
|-------|-------|
| **Heading order** | An `h3` appears without a preceding `h2`. Path: `div > div > div > h3` |

### Recommendation

- Ensure headings follow a logical order: h1 → h2 → h3 (no skips).
- Add an `h2` before the `h3` in the affected component, or change the `h3` to `h2` if it is a top-level section.

---

## 3. Best Practices — 96

### Failed audits

| Audit | Issue |
|-------|-------|
| **Browser errors in console** | `"%s cannot contain a nested %s. p <ol>"` – React DOM validation warning about invalid HTML nesting (a `<p>` containing an `<ol>`). Source: React DOM. |

### Recommendation

- Inspect the component that renders a list (`<ol>`) and ensure it is not nested inside a `<p>`.
- Replace the parent `<p>` with a `<div>` or move the list outside the paragraph.

---

## 4. SEO — 92

No failed audits. The page has:

- Document title
- Meta description
- Proper charset
- No blocking from indexing
- Crawlable links

---

## Report Files

- **HTML report:** `lighthouse-report.html` (open in browser for full details)
- **JSON report:** `lighthouse-report.json` (raw data)

Regenerate with:
```bash
npm run dev   # in one terminal
npx lighthouse http://localhost:5175/ --output=html --output-path=./lighthouse-report.html --only-categories=performance,accessibility,best-practices,seo
```

For production-style metrics:
```bash
npm run build && npm run preview   # in one terminal
npx lighthouse http://localhost:4173/ --output=html --output-path=./lighthouse-report.html --only-categories=performance,accessibility,best-practices,seo
```
