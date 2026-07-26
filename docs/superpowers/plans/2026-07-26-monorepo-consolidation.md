# Monorepo Consolidation Implementation Plan (Phase 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the `money-manage-api` repository into `money-manage` as a single monorepo with one deploy workflow, without changing the database.

**Architecture:** `money-manage` is reused as the monorepo root. Frontend files move to `apps/web/` via `git mv` (no SHA rewrite, no force-push). The Go API is imported into `apps/api/` via `git filter-repo` on a throwaway clone, so its history arrives with rewritten paths. Docker Compose and the deploy workflow move to the root and lose the cross-repo coordination.

**Tech Stack:** git 2.x + git-filter-repo, Node 22.12.0 / npm 10.9.0, Go 1.26 toolchain (`go.mod` declares 1.25.0), Docker Compose, GitHub Actions on a self-hosted runner.

## Global Constraints

- Repo root for every path in this plan: `/Users/ittaframe/Git-Me/money-manage-all/money-manage`
- Work happens on branch `chore/monorepo`, already created and holding commit `9c2fcaa`
- **Never push `main`.** A push to `main` is a production deploy via the self-hosted runner. Do not push any branch without being asked
- **MySQL stays untouched in this phase.** The `db` service, the `mysql_data` volume, and every `DB_*` variable keep their current values. Database changes belong to Phase 2 (`2026-07-26-supabase-migration.md`)
- Commit messages: conventional commits, English, imperative, subject ≤72 chars
- There is no test framework in either project. Verification uses real commands: `npm run build` (which runs `tsc -b`, a genuine typecheck gate), `go build ./...`, `go vet ./...`, `docker compose config`, and `docker compose build`
- Do not run `docker compose down -v` or pass `--remove-orphans` at any point

## Prerequisite (manual, before Task 2)

`git-filter-repo` is not installed. The user must run:

```bash
brew install git-filter-repo
```

Task 2 verifies this before doing anything else.

## File Structure

Target layout after this phase:

```
money-manage/                        # repo root
├── .claude/                         # STAYS at root — project-level Claude config + skills
├── .github/workflows/deploy.yml     # rewritten: one job, both sides
├── apps/
│   ├── web/                         # everything the frontend needs to build
│   │   ├── .env.production          # tracked (negated in .gitignore)
│   │   ├── CLAUDE.md                # frontend guidance
│   │   ├── README.md
│   │   ├── docs/                    # index.html + 10 Thai CSV reference files
│   │   ├── index.html               # Vite entry — NOT the same file as docs/index.html
│   │   ├── package.json, package-lock.json
│   │   ├── public/, src/
│   │   ├── tsconfig.json, vite.config.ts
│   └── api/                         # arrives via filter-repo, all 19 tracked files
│       ├── CLAUDE.md, README.md, Dockerfile, .env.example
│       └── *.go, go.mod, go.sum
├── docs/superpowers/                # STAYS at root — specs and plans
├── docker-compose.yml               # moved up from apps/api
├── deploy.sh                        # moved up, copy step removed
├── .gitignore                       # merged from both repos
├── CLAUDE.md                        # new root file, points at apps/*/CLAUDE.md
└── README.md                        # new root file
```

Responsibilities:

- Root `.gitignore` is the single ignore file. Slash-free patterns (`node_modules`, `dist`, `.env`) match at any depth, which is what a monorepo wants.
- Root `CLAUDE.md` holds only what spans both apps; per-app detail stays in `apps/web/CLAUDE.md` and `apps/api/CLAUDE.md`.
- `docker-compose.yml` and `deploy.sh` live at the root because they orchestrate both apps.
- `.claude/` stays at the root so Claude Code picks it up as project config. The `ui-ux-pro-max` skill inside it is frontend-specific but costs nothing at the root.

Two files are deleted, not moved:

- `.github/workflows/deploy.yml` (frontend) — 60 lines whose only job was dispatching the API repo's workflow and polling for the run id. Obsolete the moment there is one repo.
- `apps/api/.github/` — arrives under `apps/api/` from the filter-repo import, where GitHub will never read it. Its content becomes the new root workflow.

---

### Task 1: Move the frontend into `apps/web`

**Files:**
- Create: `apps/web/` (directory)
- Move: `.env.production`, `CLAUDE.md`, `README.md`, `index.html`, `package.json`, `package-lock.json`, `public/`, `src/`, `tsconfig.json`, `vite.config.ts` → `apps/web/`
- Move: every entry in `docs/` **except** `docs/superpowers/` → `apps/web/docs/`
- Delete: `.github/workflows/deploy.yml`, `.github/` (frontend dispatch workflow)
- Leave in place: `.claude/`, `docs/superpowers/`, `.gitignore`

**Interfaces:**
- Produces: the path `apps/web` with a working Vite project — `apps/web/package.json` is the only `package.json` in the repo, and `apps/web/dist` is where the build output lands. Task 4's Compose file mounts `./apps/web/dist` and the workflow runs `npm ci && npm run build` in `apps/web`.

- [ ] **Step 1: Confirm the starting state**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
git branch --show-current    # expect: chore/monorepo
git status --short           # expect: no output (clean)
```

Expected: branch is `chore/monorepo`, working tree clean. If `main`, stop — this plan must not run on `main`.

- [ ] **Step 2: Move the top-level frontend files**

```bash
mkdir -p apps/web
git mv .env.production CLAUDE.md README.md index.html \
       package.json package-lock.json public src \
       tsconfig.json vite.config.ts apps/web/
```

- [ ] **Step 3: Split `docs/` — frontend reference data down, specs stay at root**

`docs/` currently mixes two unrelated things: the original static `index.html` plus ten Thai-named CSV exports (frontend reference material), and `docs/superpowers/` (project specs and plans). The CSV filenames contain Thai characters and spaces, so loop rather than type them:

```bash
mkdir -p apps/web/docs
for f in docs/*; do
  [ "$f" = "docs/superpowers" ] || git mv "$f" apps/web/docs/
done
```

Verify the split landed correctly:

```bash
ls docs/                    # expect: superpowers  (and nothing else)
ls apps/web/docs/ | wc -l   # expect: 11  (index.html + 10 CSV files)
```

- [ ] **Step 4: Delete the frontend's cross-repo dispatch workflow**

```bash
git rm -r .github
```

Expected: removes `.github/workflows/deploy.yml`. This is the workflow that existed only to `curl` a `workflow_dispatch` at `money-manage-api` and poll until a run appeared. Task 4 writes the single replacement.

- [ ] **Step 5: Clear the stale build artifacts left at the root**

Two untracked things need attention. The local `.env` must follow the frontend: Vite reads `.env` from the directory it runs in, so left at the root it would silently stop supplying `VITE_API_BASE_URL`. It is gitignored, so `git mv` cannot move it.

`node_modules/` and `dist/` at the root are now orphaned — `package.json` moved to `apps/web`. Both are gitignored too, so git does not track their removal:

```bash
[ -f .env ] && mv .env apps/web/.env
rm -rf node_modules dist tsconfig.tsbuildinfo
```

The API's untracked `.env` needs the same treatment in Task 2, but **copy** rather than move it, so `money-manage-api` stays runnable as a fallback until Phase 2 is done:

```bash
cp ../money-manage-api/.env apps/api/.env
```

- [ ] **Step 6: Verify the frontend still builds from its new location**

```bash
cd apps/web
npm ci
npm run build
```

Expected: PASS. `npm run build` is `tsc -b && vite build`, so a clean exit proves TypeScript resolves every import and the `@/` alias in `vite.config.ts` still points at `apps/web/src` (it uses `__dirname`, so the move is transparent). `apps/web/dist/index.html` now exists.

If `tsc -b` reports missing modules, a path was left behind at the root — check `git status` for stragglers before continuing.

- [ ] **Step 7: Commit**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
git add -A
git commit -m "chore: move frontend into apps/web"
```

- [ ] **Step 8: Verify history survived the move**

```bash
git log --oneline -3 -- apps/web/src
```

Expected: commits from before the move (e.g. `e21092f`, `48b6ec3`) appear. `git blame` follows renames on its own, so blame on any `apps/web/src` file still reaches its original author. If only the move commit appears, that is still correct for `git log` without `--follow` — check with `git log --follow --oneline apps/web/vite.config.ts`, which must show older commits.

---

### Task 2: Import the Go API into `apps/api` with its history

**Files:**
- Create: `apps/api/` — 19 tracked files (`*.go`, `go.mod`, `go.sum`, `Dockerfile`, `docker-compose.yml`, `deploy.sh`, `CLAUDE.md`, `README.md`, `.env.example`, `.gitignore`, `.github/`)
- Scratch (deleted at the end): `/private/tmp/claude-501/-Users-ittaframe-Git-Me-money-manage-all/ba1c8239-f936-49e6-9d19-2272c9b1ac85/scratchpad/api-rewrite`

**Interfaces:**
- Consumes: `apps/web` from Task 1, so the repo root is free of frontend files and nothing can collide with the import.
- Produces: `apps/api/` containing the Go module. Later tasks reference `apps/api/Dockerfile` as a Compose build context, `apps/api/docker-compose.yml` as the file to move to the root, and `apps/api/.github/workflows/deploy.yml` as the source of the new root workflow.

- [ ] **Step 1: Verify the prerequisite is installed**

```bash
git filter-repo --version
```

Expected: a version number. If `command not found`, stop and ask the user to run `brew install git-filter-repo` — there is no workaround that avoids force-pushing `main`.

- [ ] **Step 2: Clone the API repo into scratch space**

`filter-repo` rewrites every commit SHA, so it must never run on the real repository. It runs on a throwaway clone whose rewritten commits are then merged in as new history — leaving `money-manage-api` on GitHub untouched.

Shell variables do not persist between steps, so each step below repeats the full path rather than relying on `$SCRATCH` being set earlier.

`--no-local` is required. Cloning a local path hardlinks the object store instead of packing it, and `filter-repo` refuses to run on a repo that does not look freshly packed:

> Aborting: Refusing to destructively overwrite repo history since this does not look like a fresh clone. (expected freshly packed repo)

```bash
rm -rf /private/tmp/claude-501/-Users-ittaframe-Git-Me-money-manage-all/ba1c8239-f936-49e6-9d19-2272c9b1ac85/scratchpad/api-rewrite
git clone --no-local /Users/ittaframe/Git-Me/money-manage-all/money-manage-api \
  /private/tmp/claude-501/-Users-ittaframe-Git-Me-money-manage-all/ba1c8239-f936-49e6-9d19-2272c9b1ac85/scratchpad/api-rewrite
```

Expected: clone succeeds and reports the same commit count as the source (24 at the time of writing).

- [ ] **Step 3: Rewrite every path in the clone's history under `apps/api/`**

```bash
cd /private/tmp/claude-501/-Users-ittaframe-Git-Me-money-manage-all/ba1c8239-f936-49e6-9d19-2272c9b1ac85/scratchpad/api-rewrite
git filter-repo --to-subdirectory-filter apps/api
```

Expected: filter-repo reports the number of commits rewritten and finishes without error. It also removes the `origin` remote, which is intentional.

- [ ] **Step 4: Confirm the rewrite did what it claims**

```bash
git ls-tree -r --name-only HEAD | head
git log --oneline -1 -- apps/api/handler_debt.go
```

Expected: every path is prefixed `apps/api/`, and the log query returns a commit — meaning history now refers to the new path, so `git blame` and `git log` read continuously across the join with no `--follow` needed.

- [ ] **Step 5: Merge the rewritten history into the monorepo**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
git remote add api-import /private/tmp/claude-501/-Users-ittaframe-Git-Me-money-manage-all/ba1c8239-f936-49e6-9d19-2272c9b1ac85/scratchpad/api-rewrite
git fetch api-import
git merge --allow-unrelated-histories --no-edit \
  -m "chore: import money-manage-api into apps/api" api-import/main
```

Expected: a clean merge with no conflicts. There is no common ancestor, so git unions the two trees — and after Task 1 the monorepo has nothing at the paths the import occupies. `--allow-unrelated-histories` is required precisely because the histories are independent.

If git reports conflicts, something from Task 1 was left at a colliding path. Abort with `git merge --abort` and re-check Task 1 Step 6 before retrying.

- [ ] **Step 6: Remove the temporary remote and scratch clone**

```bash
git remote remove api-import
rm -rf /private/tmp/claude-501/-Users-ittaframe-Git-Me-money-manage-all/ba1c8239-f936-49e6-9d19-2272c9b1ac85/scratchpad/api-rewrite
```

Leaving the remote pointed at a deleted directory would make later `git fetch --all` calls fail noisily.

- [ ] **Step 7: Verify the Go module builds from its new location**

```bash
cd apps/api
go build ./...
go vet ./...
```

Expected: both PASS with no output. The module is self-contained (`module money-manage-api`, all files `package main` in one directory), so relocation cannot break imports — this confirms the import copied every file.

- [ ] **Step 8: Verify both histories are now present in one log**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
git log --oneline | wc -l
git log --oneline -3 -- apps/api
git log --oneline -3 -- apps/web
```

Expected: the count is roughly the sum of both repos' commits; each path query returns that side's real commits. This is the payoff — one `git log` covering both halves of every past change.

- [ ] **Step 9: Commit**

The merge in Step 5 already created a commit. Confirm nothing is left staged:

```bash
git status --short    # expect: no output
```

---

### Task 3: Consolidate root-level files

**Files:**
- Create: `.gitignore` (rewrite at root), `CLAUDE.md` (new root file), `README.md` (new root file)
- Delete from the index: `apps/web/.claude/skills/ui-ux-pro-max/scripts/__pycache__/*.pyc` (3 tracked files)

**Interfaces:**
- Consumes: `apps/web` (Task 1) and `apps/api` (Task 2).
- Produces: a root `.gitignore` that every later task relies on — specifically that `.env` is ignored at any depth (which is what makes `git clean -fd` safe in the Task 4 workflow) while `.env.production` and `.env.example` stay tracked.

- [ ] **Step 1: Write the merged root `.gitignore`**

Both repos had their own. Merged, with three corrections called out below:

```gitignore
# Dependencies and build output
node_modules
dist
vendor/
tsconfig.tsbuildinfo
*.local

# Go build artifacts
apps/api/money-manage-api
*.exe
*.exe~
*.dll
*.so
*.dylib
*.test
*.out

# Environment — ignore all, keep the two that are meant to be committed
.env
.env.*
!.env.production
!.env.example

# Tooling
.DS_Store
.superpowers
__pycache__/
*.pyc
```

Three deliberate changes from a naive concatenation:

1. `money-manage-api` becomes `apps/api/money-manage-api`. The original entry ignores the compiled binary, which shares its name with the Go module — but a slash-free pattern matches at any depth, so it would also swallow a directory of that name anywhere in the tree.
2. `!.env.example` is new. The frontend contributed `.env.*`, which would newly ignore `apps/api/.env.example` — a file that is currently tracked and meant to be. Already-tracked files are unaffected by gitignore, so nothing breaks today; the negation stops it from silently disappearing the next time someone recreates it.
3. `__pycache__/` and `*.pyc` are new, to stop the cruft removed in Step 2 from coming back.

- [ ] **Step 2: Untrack the committed Python bytecode**

Three `.pyc` files from the `ui-ux-pro-max` skill are tracked. They are build artifacts of `scripts/*.py` and should never have been committed. Note the path is at the **root** — `.claude/` does not move in Task 1:

```bash
git rm --cached -r .claude/skills/ui-ux-pro-max/scripts/__pycache__
```

Expected: 3 files removed from the index. They remain on disk and are now ignored.

Also remove `apps/api/.gitignore`, which the import brought along. Every pattern in it is now covered by the root file, and leaving a second ignore file contradicts the single-file design:

```bash
git rm apps/api/.gitignore
```

- [ ] **Step 3: Verify the ignore rules behave as intended**

```bash
git check-ignore -v apps/web/.env apps/api/.env apps/web/dist/index.html
git check-ignore -v apps/web/.env.production apps/api/.env.example
```

Expected: the first command names a matching rule for all three paths (they are ignored). The second command prints **nothing** and exits non-zero — those two are *not* ignored, which is correct.

The `.env` result is the one that matters most: it is why `git clean -fd` in the deploy workflow cannot delete the production `.env`. `git clean` skips ignored files unless given `-x`, which the workflow never passes.

- [ ] **Step 4: Write the root `CLAUDE.md`**

Only what spans both apps — per-app detail already lives in `apps/web/CLAUDE.md` and `apps/api/CLAUDE.md` and must not be duplicated here:

```markdown
# CLAUDE.md

Monorepo for the money-manage personal finance app. Thai-language UI, Thai Baht,
Buddhist Era dates.

## Layout

| Path | What |
|------|------|
| `apps/web` | React + TypeScript + Vite SPA. See `apps/web/CLAUDE.md` |
| `apps/api` | Go + Gin REST API, serves the built SPA. See `apps/api/CLAUDE.md` |
| `docs/superpowers` | Specs and implementation plans |

## How to run

```bash
cd apps/web && npm install && npm run dev   # frontend on :5173
cd apps/api && go run .                     # API on :8080

./deploy.sh                                 # build frontend + start containers
```

## Deployment

One workflow, `.github/workflows/deploy.yml`, runs on push to `main` against a
self-hosted runner: pull, build `apps/web`, `docker compose up -d --build`.
Compose mounts `apps/web/dist` into the API container, which serves it as the
SPA. Exposed through a Cloudflare Tunnel.

**A push to `main` is a production deploy.**

## Conventions

- All UI text in Thai; code, comments, and commit messages in English
- Conventional commits, subject ≤72 chars
- Changes spanning both apps belong in one commit — that is the point of the monorepo
```

- [ ] **Step 5: Write the root `README.md`**

```markdown
# money-manage

Personal finance app for tracking income, expenses, installment debts, and
person-to-person debts. Thai UI, Buddhist Era dates, Thai Baht.

## Structure

- `apps/web` — React + TypeScript + Vite SPA
- `apps/api` — Go + Gin REST API, also serves the built SPA

## Quick start

```bash
cd apps/web && npm install && npm run dev
cd apps/api && go run .
```

See `CLAUDE.md` for details and `apps/*/README.md` for each app.
```

- [ ] **Step 6: Verify nothing unexpected is staged**

```bash
git status --short
```

Expected: modifications to `.gitignore`, new `CLAUDE.md` and `README.md`, and the three deleted `.pyc` files. Nothing else. Note `apps/web/CLAUDE.md` and `apps/api/CLAUDE.md` both still exist — the root file is additional, not a replacement.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add root gitignore, CLAUDE.md, and README"
```

---

### Task 4: Move Compose and the deploy workflow to the root

**Files:**
- Move: `apps/api/docker-compose.yml` → `docker-compose.yml`, then modify
- Move: `apps/api/deploy.sh` → `deploy.sh`, then rewrite
- Move: `apps/api/.github/workflows/deploy.yml` → `.github/workflows/deploy.yml`, then rewrite
- Modify: `apps/api/CLAUDE.md` (Deployment section describes the old cross-repo flow)

**Interfaces:**
- Consumes: `apps/web/dist` as the frontend build output (Task 1) and `apps/api/Dockerfile` as the build context (Task 2).
- Produces: a root `docker-compose.yml` whose `api` service reads `DB_*`, `JWT_SECRET`, and `CLOUDFLARE_TUNNEL_TOKEN` from a root `.env`. Phase 2 edits this same file to drop the `db` service.

- [ ] **Step 1: Move the three orchestration files up**

```bash
git mv apps/api/docker-compose.yml docker-compose.yml
git mv apps/api/deploy.sh deploy.sh
mkdir -p .github/workflows
git mv apps/api/.github/workflows/deploy.yml .github/workflows/deploy.yml
git rm -r apps/api/.github
```

The workflow *must* move: GitHub only reads `.github/workflows/` at the repository root, so left under `apps/api/` it would silently never run.

- [ ] **Step 2: Update `docker-compose.yml` for the new paths**

Two changes only. **The `db` service, the `mysql_data` volume, the healthcheck, and every `DB_*` value stay exactly as they are** — this phase does not touch the database.

Change the build context:

```yaml
  api:
    build: ./apps/api        # was: build: .
```

Change the static-file mount so Compose reads the frontend build directly:

```yaml
    volumes:
      - ./apps/web/dist:/app/dist:ro     # was: ./dist:/app/dist:ro
```

`STATIC_DIR: ./dist` is unchanged — that path is *inside* the container, and the mount target is still `/app/dist`. No Go code changes.

This mount is what deletes the old "Copy dist to backend" step: there is no longer any reason to duplicate the build output into the API directory.

- [ ] **Step 3: Verify Compose resolves correctly**

```bash
docker compose config
```

Expected: parses without error. In the output, confirm `services.api.build.context` ends in `/apps/api`, and the `api` volume source ends in `/apps/web/dist`. Confirm the `db` service and `mysql_data` volume are **still present** — if either is missing, Phase 2 work has leaked into Phase 1.

- [ ] **Step 4: Verify the API image builds from the new context**

```bash
docker compose build api
```

Expected: build succeeds. This proves `apps/api/Dockerfile` works with the relocated context — its `COPY go.mod go.sum ./` and `COPY . .` are relative to the context, so the move is transparent. The image already installs `ca-certificates` and `tzdata`, both of which Phase 2 depends on.

- [ ] **Step 5: Rewrite `deploy.sh`**

The old script computed a sibling `../money-manage` path and copied `dist/` across. Both concerns are gone:

```bash
#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== 1. Build frontend ==="
cd "$ROOT/apps/web"
npm ci
npm run build

echo "=== 2. Start services ==="
cd "$ROOT"
docker compose up -d --build

echo ""
echo "=== Done! ==="
echo "App running at http://localhost:8080"
```

Keep it executable:

```bash
chmod +x deploy.sh
git update-index --chmod=+x deploy.sh
```

- [ ] **Step 6: Rewrite `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: self-hosted
    env:
      APP_DIR: /home/it23-server/money-manage
    steps:
      - name: Pull latest code
        run: |
          cd $APP_DIR
          git checkout -- .
          git clean -fd
          git pull origin main

      - name: Build frontend
        run: |
          cd $APP_DIR/apps/web
          npm ci
          npm run build

      - name: Restart services
        run: |
          cd $APP_DIR
          docker compose up -d --build
```

`APP_DIR` keeps its current value: the runner re-clones the monorepo *at* `/home/it23-server/money-manage`, so that path becomes the repo root instead of a directory holding two clones.

Three things are gone from the old pair of workflows: the second `git pull` (which is what allowed the two sides to deploy at different commits), the `Copy dist to backend` step, and the frontend's entire 60-line dispatch job with its `DEPLOY_TOKEN` secret.

`git clean -fd` is safe here despite running at the repo root: it skips ignored files unless given `-x`, and Task 3 Step 3 verified `.env` is ignored. The production `.env` and both `node_modules` trees survive.

- [ ] **Step 7: Update the Deployment section of `apps/api/CLAUDE.md`**

It currently reads: *"The workflow pulls both this repo and the frontend (`money-manage`), builds the frontend, copies `dist/` here, then runs `docker compose up -d --build`."* That describes a flow that no longer exists. Replace with:

```markdown
## Deployment

Part of the `money-manage` monorepo. A single workflow at the repo root
(`.github/workflows/deploy.yml`) runs on push to `main` against a self-hosted
runner: pull, build `apps/web`, then `docker compose up -d --build` from the
root. Compose mounts `apps/web/dist` into this container, which serves it as
the SPA. Exposed via Cloudflare Tunnel.
```

Also correct the Tech Stack line *"Docker Compose for deployment (API + MySQL + Cloudflare Tunnel)"* — the Compose file is now at the repo root, not in this directory. Note the path.

- [ ] **Step 8: Verify no stale path references remain**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
grep -rn "money-manage-api" --include="*.md" --include="*.yml" --include="*.sh" . \
  | grep -v node_modules | grep -v docs/superpowers
```

Expected: only legitimate mentions — the Go module name in `apps/api/README.md`, or prose naming the archived repo. Any *path* like `$APP_DIR/money-manage-api` or `../money-manage` is a bug from this task. `docs/superpowers` is excluded because the spec and this plan describe the old layout on purpose.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "ci: unify deploy into a single monorepo workflow"
```

---

### Task 5: End-to-end verification of the assembled monorepo

**Files:** none modified — this task is the phase gate.

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: evidence that the monorepo deploys and serves identically on the unchanged MySQL database, isolating this phase's risk from Phase 2's.

- [ ] **Step 1: Build the frontend from a clean slate**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
rm -rf apps/web/node_modules apps/web/dist
cd apps/web && npm ci && npm run build
```

Expected: PASS, and `apps/web/dist/index.html` exists. This mirrors exactly what the workflow does on the runner.

- [ ] **Step 2: Start the API and MySQL locally**

The `tunnel` service needs a `CLOUDFLARE_TUNNEL_TOKEN` that is not present locally, so start only the two services under test:

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
docker compose up -d db api
docker compose ps
```

Expected: both `db` and `api` report running, `db` healthy.

**If `db` fails with `Bind for 0.0.0.0:3306 failed: port is already allocated`,** something unrelated already holds the port on this machine — check with `lsof -nP -iTCP:3306 -sTCP:LISTEN` and `docker ps`. Do not stop it, and do not edit the committed Compose file. The published port is only for host access; `api` reaches `db` over the Compose network via `DB_HOST: db`, so drop the binding with a throwaway override kept outside the repo:

```bash
SCR=/private/tmp/claude-501/-Users-ittaframe-Git-Me-money-manage-all/ba1c8239-f936-49e6-9d19-2272c9b1ac85/scratchpad
printf 'services:\n  db:\n    ports: !reset []\n' > "$SCR/no-db-port.yml"
docker compose -f docker-compose.yml -f "$SCR/no-db-port.yml" up -d db api
```

`!reset` needs Compose 2.24+. Remapping to a spare host port does **not** work here: Compose appends `ports` lists across files rather than replacing them, so the conflicting binding would survive. Delete the override file in Step 5.

If Docker is not available on this machine at all, skip to Step 5 and record that Steps 2–4 were not run — `docker compose config` and `docker compose build api` from Task 4 remain the evidence, and the deploy on the runner is then the first real execution.

- [ ] **Step 3: Verify the API serves the SPA from the mounted build**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8080/
curl -sS http://localhost:8080/ | head -5
```

Expected: `200`, and the body is the built `index.html` (it references hashed asset filenames like `/assets/index-*.js`, not a Vite dev script). This proves the `./apps/web/dist:/app/dist:ro` mount and `STATIC_DIR` line up.

- [ ] **Step 4: Verify the API and database are talking**

Registration exercises the full path — Gin routing, GORM, and the MySQL container that Phase 1 deliberately left alone:

```bash
curl -sS -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"monorepo_check","password":"monorepo_check_pw"}'
```

Expected: a success response containing a token. A connection error means the `api` service cannot reach `db` — check that Task 4 Step 2 left the `DB_*` environment and `depends_on` untouched.

This writes to the *local* MySQL container, not production. Tear it down in Step 5.

- [ ] **Step 5: Stop the local stack without destroying anything**

```bash
docker compose stop db api
```

Do **not** run `docker compose down -v`. The `-v` flag deletes the `mysql_data` volume, which is the Phase 2 rollback path.

- [ ] **Step 6: Confirm the branch is complete and clean**

```bash
git status --short                      # expect: no output
git log --oneline --first-parent main..HEAD
```

Expected, on `--first-parent`, these commits in order: the design spec, the implementation plans, `chore: move frontend into apps/web`, `chore: import money-manage-api into apps/api`, `chore: add root gitignore, CLAUDE.md, and README`, `ci: unify deploy into a single monorepo workflow`.

`--first-parent` matters here. A plain `git log main..HEAD` also lists every commit the API import brought in — hundreds of them, since none are reachable from `main`. That is correct and is the point of the import, but it makes the branch's own work impossible to read.

- [ ] **Step 7: Report to the user and stop**

Do not push. Summarise for the user:

- Branch `chore/monorepo` is ready and not pushed. Report the `--first-parent` list from Step 6 rather than a bare commit count, and note that the branch also carries the API repo's full history from the import
- The two manual steps that must happen **before** merging to `main`:
  1. On the self-hosted runner, re-clone the monorepo at `/home/it23-server/money-manage` so that path is the repo root (it currently holds two separate clones), and copy the existing `.env` to that root — Compose reads `.env` from the directory it runs in, and the file is gitignored so it does not arrive with the clone
  2. Push the branch and merge to `main` when ready — the merge commit carries the new workflow, so the new deploy runs immediately and will fail if the runner has not been re-cloned first
- Phase 2 (`docs/superpowers/plans/2026-07-26-supabase-migration.md`) starts only after this deploy is verified in production

---

## Post-phase manual steps (user, not the implementer)

- Re-clone at `APP_DIR` on the runner and place `.env` at its root — **before** merging to `main`
- Merge to `main`, watch the deploy, confirm the live app behaves as before
- Delete the `DEPLOY_TOKEN` secret from repository settings (nothing reads it now)
- Optionally rename the repo to `money-manage-all` — GitHub redirects the old URL
- Archive `money-manage-api` on GitHub only after Phase 2 is done; the Phase 2 migration reads from the MySQL container, not that repo, but keeping it until then costs nothing
