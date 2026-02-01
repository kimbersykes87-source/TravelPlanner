# Deploy Instructions — For Cursor / Agents

When the user asks to **deploy**, **redeploy**, or **push changes to production**, follow these steps exactly. This deploys **all current changes** from this project to the live site.

---

## Canonical Paths and Repo

| What | Value |
|-----|------|
| **Project folder** | `c:\dev\TravelPlanner_v2` |
| **Git remote** | `https://github.com/kimbersykes87-source/TravelPlanner.git` |
| **Remote name** | `origin` |
| **Deploy branch** | `feat/globe-loader` |
| **Live site** | https://travelplanner-ks.pages.dev |

This project (**TravelPlanner_v2**) is the **source of truth**. Deployment means: push this folder to the GitHub repo so Cloudflare Pages builds and deploys it.

---

## Steps to Run (in order)

Execute these in the **project folder** `c:\dev\TravelPlanner_v2`. Use PowerShell; use `;` not `&&` between commands if chaining.

### 1. Go to project folder

```powershell
cd c:\dev\TravelPlanner_v2
```

### 2. Ensure Git is set up

- If **no** `.git` folder: run `git init`.
- If **no** remote `origin`: add it:
  ```powershell
  git remote add origin https://github.com/kimbersykes87-source/TravelPlanner.git
  ```
- If remote already exists, skip.

### 3. Stage all changes

```powershell
git add -A
```

### 4. Commit

Use a short, descriptive message (e.g. what was fixed or added):

```powershell
git commit -m "Your commit message here"
```

If there are **no changes** to commit (`nothing to commit`), skip to step 6 and just push the current branch.

### 5. Use the deploy branch

Ensure the current branch is the deploy branch and has a name Cloudflare expects:

```powershell
git branch -M feat/globe-loader
```

### 6. Push to trigger deployment

```powershell
git push -u origin feat/globe-loader --force
```

- `--force` is used because this repo is the single source of truth; the remote branch is updated to match this folder.
- Cloudflare Pages is connected to this repo and branch; it will build and deploy after the push.

### 7. Confirm

- Build typically finishes in 1–3 minutes.
- Live site: https://travelplanner-ks.pages.dev (or custom domain if configured).

---

## One-shot summary (copy-paste)

After making changes, from any directory:

```powershell
cd c:\dev\TravelPlanner_v2
git add -A
git status
git commit -m "Deploy: describe your changes"
git branch -M feat/globe-loader
git push -u origin feat/globe-loader --force
```

If the repo was never initialized or has no remote:

```powershell
cd c:\dev\TravelPlanner_v2
git init
git remote add origin https://github.com/kimbersykes87-source/TravelPlanner.git
git add -A
git commit -m "Deploy: initial or describe changes"
git branch -M feat/globe-loader
git push -u origin feat/globe-loader --force
```

---

## Notes for agents

- **Always** work in `c:\dev\TravelPlanner_v2` when deploying.
- **Always** push to branch `feat/globe-loader` and remote `origin`.
- Use a **clear commit message** (e.g. "Fix normalizeStayDates; add share link" or "Deploy: sync all agent changes").
- If `git commit` says "nothing to commit, working tree clean", the last commit already has the changes; run only the push steps (branch -M, then push).
- Do **not** use the folder `c:\dev\TravelPlanner` for deployment; that is the old v1 repo. The v2 app and all agent work live in **TravelPlanner_v2**.
