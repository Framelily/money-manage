# Monorepo consolidation and MySQL to Supabase Postgres migration

Date: 2026-07-26
Status: approved

Merges `money-manage` (frontend) and `money-manage-api` (Go backend) into a
single repository, then moves the database from a self-hosted MySQL container to
Supabase Postgres. The Go API stays.

Lands as two separate deploys, not one. See Execution.

## Problem

The project lives in two repositories that are already coupled at deploy time.
`money-manage-api`'s workflow clones both repos, builds the frontend, copies
`dist/` across, and restarts Docker Compose. `money-manage`'s workflow exists
only to dispatch that one — 60 lines of `curl`, run-id polling, and a
`DEPLOY_TOKEN` secret whose sole job is proving a cross-repo dispatch actually
started.

The split costs correctness, not just ceremony. A change spanning both sides —
`feat!: remove the daily entries feature`, most recently — cannot be one atomic
commit, so there is a window where `main` on one repo expects an API the other
has not shipped. The deploy pulls each repo independently and cannot tell that
it has assembled two halves of different versions.

Separately, the database is a `mysql:8.0` container on a self-hosted runner: no
managed backups, no query console, and one more service to keep healthy.

## Goal

One repository, one workflow, one atomic commit per change. Postgres hosted by
Supabase instead of a MySQL container maintained by hand.

## Scope

In scope: repository merge preserving both histories, `apps/web` + `apps/api`
layout, unified deploy workflow, Compose file reduced to `api` + `tunnel`, GORM
switched to the Postgres driver, a one-shot data migration command, and
verification of the migrated data.

Out of scope, deliberately: authentication stays on the existing JWT
implementation (Supabase Auth is not adopted), no row-level security, no
Realtime, no PostgREST, no handler refactoring, and no new tests. The API keeps
serving the SPA and owning all business logic.

### Why the Go API stays

"Move to Supabase" admits three depths. Only the shallowest is in scope:

1. Supabase as the database. Swap the GORM driver; everything else stands.
2. Supabase Auth as well. Drop `auth.go`, verify Supabase-issued JWTs, gain
   Google and magic-link sign-in.
3. No backend. The SPA talks to Supabase directly through RLS policies, and
   transactional logic moves into Postgres functions or Edge Functions.

The stated motivation is wanting to try Supabase and to leave MySQL — which
level 1 satisfies in full. Levels 2 and 3 remain available later and are not
foreclosed by anything here. Level 3 is also the only one that would force Go
out, since Edge Functions are Deno/TypeScript only.

## Target layout

```
money-manage/                      # existing repo, reused as the monorepo root
├── .github/workflows/deploy.yml   # one workflow, replacing two
├── apps/
│   ├── web/                       # former money-manage/ contents
│   │   └── docs/                  # index.html + CSV reference data
│   └── api/                       # former money-manage-api/, Dockerfile here
├── docs/superpowers/              # project-level specs and plans, stays at root
├── docker-compose.yml
├── CLAUDE.md
└── README.md
```

No npm workspaces, Turborepo, or Nx. There is one JavaScript package and one Go
module, sharing no dependencies; the tooling would add configuration to maintain
and buy nothing. Should a `packages/shared-types` appear later, revisit then.

`docs/superpowers/` stays at the root because specs and plans describe the
project, not the frontend. The frontend's own reference material — `index.html`
and the ten CSV exports — moves with it into `apps/web/docs/`.

## Repository merge

`money-manage` is the base repo, so GitHub settings, secrets, and the existing
URL carry over untouched. Each side is merged by a different method, and the
asymmetry is deliberate:

| Side | Method | Effect on history |
|------|--------|-------------------|
| Frontend | `git mv` into `apps/web/` as an ordinary commit | SHAs unchanged, no force-push; `git blame` follows the rename on its own |
| API | `git filter-repo --to-subdirectory-filter apps/api` on a throwaway clone, then merge | Paths rewritten throughout history, so blame and log read continuously across the join |

`filter-repo` gives the cleaner result but rewrites every SHA. Applying it to
the frontend would mean force-pushing `main` — which is a production deploy on
this project. Applying it to the API is free: the rewrite happens on a temporary
clone and arrives as new commits, leaving the real `money-manage-api` untouched.

Renaming the repo to `money-manage-all` afterwards is optional; GitHub redirects
the old URL. It blocks nothing and can wait.

## Database migration

`models.go` needs no changes. The models use only portable constructs —
`varchar(n)`, `text`, `float64`, `bool`, `int`, `time.Time` — with no
MySQL-specific tags. Nor do the handlers: there is no raw SQL (`Raw`/`Exec`
appear nowhere), no `OnConflict` or upsert clause, exactly one transaction
(`handler_debt.go:154`, which behaves identically on Postgres), and soft delete
on `User` alone.

Four files change:

| File | Change |
|------|--------|
| `go.mod` | `gorm.io/driver/mysql` → `gorm.io/driver/postgres` |
| `database.go` | Postgres DSN, driver, connection pool limits |
| `config.go` | add `DBSSLMode`; defaults become port `5432`, dbname `postgres` |
| `.env.example` | new variables |

```go
dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Bangkok",
    AppConfig.DBHost, AppConfig.DBUser, AppConfig.DBPass,
    AppConfig.DBName, AppConfig.DBPort, AppConfig.DBSSLMode)
db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

sqlDB, _ := db.DB()
sqlDB.SetMaxOpenConns(10)
sqlDB.SetMaxIdleConns(2)
sqlDB.SetConnMaxLifetime(5 * time.Minute)
```

The pool limits are not optional. GORM leaves `MaxOpenConns` unbounded, which
will exhaust a free-tier connection quota, and Supavisor drops idle connections
so long-lived ones must be recycled.

### Connection endpoint

Supabase offers three, and the choice is the easiest thing to get wrong:

| Endpoint | Port | Problem |
|----------|------|---------|
| Direct, `db.<ref>.supabase.co` | 5432 | IPv6 only; IPv4 is a paid add-on, so a self-hosted server without IPv6 cannot connect |
| **Session pooler**, `aws-x-<region>.pooler.supabase.com` | 5432 | None: IPv4 works, prepared statements work |
| Transaction pooler | 6543 | Prepared statements unavailable; needs `PreferSimpleProtocol: true` |

Use the session pooler. Note the username is `postgres.<project-ref>`, not
`postgres`.

Region: Singapore (`ap-southeast-1`).

### Timezone

The MySQL DSN used `loc=Local` against `DATETIME` columns, which carry no
timezone. GORM creates `timestamptz` on Postgres, so imported values must be
interpreted as `Asia/Bangkok` rather than UTC or `CreatedAt`/`UpdatedAt` shift
by seven hours.

Only those two fields are affected. Every date the application actually
displays — `PersonDebt.LastUpdated`, `DebtPayment.Date`, and
`BudgetMonthlyValue.Month` — is stored as a `varchar` in Buddhist Era format and
is untouched by the change.

## Infrastructure

`docker-compose.yml` moves to the root and loses the `db` service, the
`mysql_data` volume, and the `depends_on` health gate. `api` mounts the
frontend build directly:

```yaml
services:
  api:
    build: ./apps/api
    environment:
      DB_HOST: ${DB_HOST}          # session pooler host
      DB_PORT: "5432"
      DB_USER: ${DB_USER}          # postgres.<project-ref>
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: postgres
      DB_SSLMODE: require
      JWT_SECRET: ${JWT_SECRET}
      GIN_MODE: release
      STATIC_DIR: ./dist
    volumes:
      - ./apps/web/dist:/app/dist:ro
    ports: ["8080:8080"]
    restart: unless-stopped
  tunnel:                          # unchanged
```

The Dockerfile needs no changes beyond the build context: it already installs
`ca-certificates`, required for TLS to Supabase, and `tzdata`, required for
`TimeZone=Asia/Bangkok`.

The workflow collapses to roughly twenty lines:

```yaml
on: { push: { branches: [main] }, workflow_dispatch: }
jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - run: cd $APP_DIR && git checkout -- . && git clean -fd && git pull origin main
      - run: cd $APP_DIR/apps/web && npm ci && npm run build
      - run: cd $APP_DIR && docker compose up -d --build
```

Three things disappear: the "Copy dist to backend" step, since Compose now
mounts `apps/web/dist` directly; the frontend's entire dispatch workflow and its
`DEPLOY_TOKEN` secret; and the second `git pull`, which is what allowed the two
sides to deploy at different commits.

`deploy.sh` is updated to match the new paths.

The root `.gitignore` merges both files, with one correction: the API's
`money-manage-api` entry ignores the built binary, but as a slash-free pattern
it matches at any depth. It becomes `apps/api/money-manage-api`.

### Two failure modes on the runner

`docker compose` reads `.env` from the directory it runs in. With the Compose
file at the root, the `.env` currently inside `money-manage-api/` is no longer
read, every variable resolves empty, and the API cannot reach the database. The
file is gitignored and therefore does not arrive with the clone — it must be
copied to the root by hand.

The first deploy must not pass `--remove-orphans`. The MySQL container is an
orphan the moment it leaves the Compose file, and that flag would delete it
along with the fallback path. Compose warns about the orphan; the warning is
correct and can be ignored until the volume is deliberately removed.

## Data migration

A one-shot command at `apps/api/cmd/migrate/main.go`, roughly eighty lines,
opens both databases with the same models and copies table by table:

```go
mysqlDB := gorm.Open(mysql.Open(oldDSN))     // read
pgDB    := gorm.Open(postgres.Open(newDSN))  // write
```

Routing the data through one set of Go structs removes every translation
hazard a CSV export would introduce: `tinyint(1)` versus `boolean`, `\N` versus
a NULL marker, timezone-less `DATETIME` versus `timestamptz`, and escaping of
Thai text or embedded tabs and newlines in `note` and `name`. The drivers
handle all of it, and both drivers plus the models are already dependencies —
no `pgloader`, no new tooling.

Insert order follows the foreign keys, which GORM creates from the
`constraint:OnDelete:CASCADE` tags:

```
users → installment_plans → installments → budget_items
      → budget_monthly_values → person_debts → debt_payments
```

The command is read-only against MySQL.

### Cutover

1. Tag `pre-supabase`.
2. Point the API at Supabase once so GORM's `AutoMigrate` creates the schema.
   This yields a schema matching the models exactly, with no hand-written DDL.
3. Stop using the app, roughly thirty minutes. MySQL is still live and still
   authoritative; writes during this window would be lost. For a single-user
   personal app, not touching it is sufficient — no read-only mode.
4. Run the migration command and verify.
5. Only then switch `.env` to Supabase and `docker compose up -d`.
6. Leave the MySQL container and volume in place.

Verifying before the switch is the point of this ordering: a failed
verification has changed nothing about the running system.

### Verification

| Layer | Check |
|-------|-------|
| Row counts | All seven tables, both sides, equal |
| Money totals | `SUM(total_amount)`, `SUM(value)`, `SUM(paid_amount)`, `SUM(amount)` match — catches float drift |
| Thai text | `SELECT DISTINCT month FROM budget_monthly_values` returns `ม.ค.`, `ก.พ.`, not `???` or mojibake; spot-check budget and debt names |
| End to end | Log in as an existing user (bcrypt hashes are ASCII in `varchar`, so they survive), then compare Dashboard figures before and after |

The migration command prints the counts and sums for both sides side by side,
so the first two layers do not require querying seven tables by hand.

### Rollback

Revert the commit touching `.env` and Compose, then `docker compose up -d`. The
MySQL volume is intact and the migration never wrote to it, so recovery is a
few minutes and no step in this plan destroys existing data.

## Execution

Two deploys, not one:

| Phase | Contents | Database | Verifies |
|-------|----------|----------|----------|
| 1. Monorepo | Repo merge, file moves, new Compose and workflow | MySQL, untouched | The app behaves identically, proving the layout and deploy rework |
| 2. Supabase | Four Go files, migration command, cutover | Supabase | Data complete, totals matching |

Combined into one landing, a broken app is ambiguous: a wrong path in the
workflow and a Postgres behaviour difference present the same way and are
debugged differently. Split, each phase rolls back independently — phase 1 by
reverting a commit, phase 2 by switching `.env` back.

### Manual steps

Before phase 1:

- `brew install git-filter-repo`
- On the self-hosted runner, re-clone the monorepo at
  `APP_DIR=/home/it23-server/money-manage` as a single directory, and copy
  `.env` to its root
- Merge to `main` when ready — pushing `main` deploys production

Before phase 2:

- Create the Supabase project in Singapore and record the database password,
  shown only once
- Copy the session pooler connection string from Connect → Session pooler
- Fill `DB_HOST`, `DB_USER`, `DB_PASSWORD` into `.env` on the runner

After both:

- Delete the `DEPLOY_TOKEN` secret from repository settings
- Archive `money-manage-api` on GitHub
- Remove the MySQL container and volume, once confident

## Local development

Postgres means local development needs a database too. The free tier allows two
projects, so create a second one for development: cleaner than sharing, and it
removes the risk of overwriting real data while experimenting. Running
`postgres:17-alpine` locally is the alternative, but adds back a container to
maintain, which is what this migration is meant to remove.

## Known risks

The free tier pauses a project after seven days without activity, requiring a
manual resume from the dashboard. A personal finance app may plausibly go a
week unopened. `pg_cron`, included with Supabase, can run a trivial daily query
to prevent it.
