# Supabase Postgres Migration Implementation Plan (Phase 2 of 2)

**Status (2026-07-26): Tasks 1, 2, 2b and 3 complete — production runs on Supabase Postgres (Singapore) and the live app is verified.** All seven tables matched on row counts and column sums; timezone, NULLs, booleans and Thai text confirmed on the real data.

The cutover cost 38 seconds of downtime because repointing the `api` service at `.env` was scheduled in Task 4, after the deploy. That step is now Task 2 Step 5b. See it before re-running any part of this plan.

Tasks 4 and 5 (remove the MySQL container, volume, `migrate.go` and the MySQL driver) are deliberately **not** done. The MySQL volume is the rollback path and should stay until the new setup has run for a few days.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the database from the self-hosted MySQL container to Supabase Postgres, carrying all existing data across, with the Go API otherwise unchanged.

**Architecture:** GORM's driver is swapped from MySQL to Postgres; `models.go` and all handlers stay as they are. A `migrate` subcommand on the existing binary reads every table through the same Go structs and writes them to Postgres, which removes every type-translation hazard a CSV export would introduce. The migration runs on the deploy branch *before* it is merged, so production switches to a database that already holds the data.

**Tech Stack:** Go 1.26 toolchain (`go.mod` declares 1.25.0), GORM 1.31.1 with `gorm.io/driver/postgres`, Supabase Postgres 17 via the Supavisor session pooler, Docker Compose.

## Global Constraints

- Repo root for every path in this plan: `/Users/ittaframe/Git-Me/money-manage-all/money-manage`
- **Phase 1 must be merged to `main` and verified in production first.** This plan assumes the `apps/web` + `apps/api` layout and the root `docker-compose.yml` from `2026-07-26-monorepo-consolidation.md`
- Work happens on a new branch `feat/supabase`, cut from `main` after Phase 1 lands
- **Never push `main`.** A push to `main` is a production deploy. The cutover in Task 3 deliberately runs on the unmerged branch
- Connection endpoint is the **Supavisor session pooler** on port 5432 (`aws-x-<region>.pooler.supabase.com`), never the direct connection (IPv6-only) and never the transaction pooler on 6543 (no prepared statements). Username is `postgres.<project-ref>`, not `postgres`
- Region: Singapore (`ap-southeast-1`). Database name: `postgres`. `sslmode=require`
- `gorm.io/driver/mysql` stays in `go.mod` until Task 4 — the migration command needs it to read the source
- Commit messages: conventional commits, English, imperative, subject ≤72 chars
- No test framework exists. Verification uses `go build ./...`, `go vet ./...`, `docker compose config`, and the migration command's own count/sum comparison output
- Never run `docker compose down -v` or pass `--remove-orphans`. The `mysql_data` volume is the rollback path

## Correction to the spec

The spec places the migration command at `apps/api/cmd/migrate/main.go`. **That cannot work.** All models live in `package main` at `apps/api/`, and Go cannot import `package main` from another package — so a `cmd/migrate` binary has no access to `User`, `InstallmentPlan`, or any other model.

This plan instead adds `apps/api/migrate.go` to the existing package and dispatches on `os.Args[1] == "migrate"` in `main.go`, giving `./server migrate`. Same package, same models, no refactor. Task 5 records the correction in the spec.

## File Structure

```
apps/api/
├── config.go          MODIFY — add DBSSLMode; Postgres defaults
├── database.go        MODIFY — Postgres driver, DSN, connection pool limits
├── migrate.go         CREATE — one-shot MySQL→Postgres copy + comparison report
├── main.go            MODIFY — 4 lines: dispatch the migrate subcommand
├── go.mod / go.sum    MODIFY — add postgres driver (mysql driver stays until Task 4)
├── .env.example       MODIFY — document the new variables
└── CLAUDE.md          MODIFY — tech stack and environment sections
docker-compose.yml     MODIFY — add a profiled migrate service (Task 2); drop db (Task 4)
```

`models.go`, `auth.go`, `routes.go`, `handler_installment.go`, `handler_budget.go`, and `handler_debt.go` are **not** modified. The codebase was checked and is portable: no `Raw`/`Exec` calls, no `OnConflict`/upsert clauses, one transaction (`handler_debt.go:154`, which behaves identically on Postgres), soft delete on `User` alone, and every query fragment is plain portable SQL (`?` placeholders, `IN ?`, `ORDER BY ... ASC`) with no MySQL functions or backticks.

Responsibilities: `database.go` owns connection concerns only; `migrate.go` is self-contained and deleted in Task 4; `config.go` stays a flat env-to-struct mapper.

## Prerequisites (manual, by the user, before Task 1)

1. Create a Supabase project in Singapore (`ap-southeast-1`). **Record the database password — it is shown once.**
2. Create a *second* free project for local development. The free tier allows two, and a separate dev database removes the risk of writing to real data while experimenting.
3. From Connect → Session pooler, copy the host and username for both projects.

Task 1 needs the dev project's credentials. Task 3 needs the production project's.

---

### Task 1: Switch GORM from MySQL to Postgres

**Files:**
- Modify: `apps/api/config.go:9-17` (struct), `apps/api/config.go:23-31` (loader)
- Modify: `apps/api/database.go` (whole file)
- Modify: `apps/api/go.mod`, `apps/api/go.sum`
- Modify: `apps/api/.env.example`

**Interfaces:**
- Produces: `AppConfig.DBSSLMode string`, and a `ConnectDatabase()` that connects to Postgres and runs `AutoMigrate` over the same seven models. `DB *gorm.DB` keeps its name and type, so every handler is unaffected. Task 2's `migrate.go` writes through this same `DB` global.

- [ ] **Step 1: Cut the branch**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
git checkout main
git pull origin main          # Phase 1 must already be merged here
git checkout -b feat/supabase
git log --oneline -1
```

Expected: `main` contains the Phase 1 commits (`chore: move frontend into apps/web` and the rest). If it does not, stop — Phase 1 is not merged and this plan cannot start.

- [ ] **Step 2: Add the Postgres driver**

```bash
cd apps/api
go get gorm.io/driver/postgres@latest
```

Expected: `go.mod` gains `gorm.io/driver/postgres`. `gorm.io/driver/mysql` must remain — Task 2 reads the source database through it. Confirm both are present:

```bash
grep driver go.mod
```

Expected: both `gorm.io/driver/mysql` and `gorm.io/driver/postgres` in the `require` block.

- [ ] **Step 3: Add `DBSSLMode` to the config struct and loader**

In `apps/api/config.go`, add the field to `Config`:

```go
type Config struct {
	Port      string
	DBHost    string
	DBPort    string
	DBUser    string
	DBPass    string
	DBName    string
	DBSSLMode string
	JWTSecret string
}
```

And in `LoadConfig()`, change the three MySQL-shaped defaults and add the new one:

```go
	AppConfig = Config{
		Port:      getEnv("PORT", "8080"),
		DBHost:    getEnv("DB_HOST", "localhost"),
		DBPort:    getEnv("DB_PORT", "5432"),
		DBUser:    getEnv("DB_USER", "postgres"),
		DBPass:    getEnv("DB_PASSWORD", ""),
		DBName:    getEnv("DB_NAME", "postgres"),
		DBSSLMode: getEnv("DB_SSLMODE", "require"),
		JWTSecret: getEnv("JWT_SECRET", "default_secret_change_me"),
	}
```

`sslmode` defaults to `require` rather than `disable` so a misconfigured deployment fails loudly instead of connecting in the clear.

- [ ] **Step 4: Rewrite `apps/api/database.go`**

```go
package main

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=Asia/Bangkok",
		AppConfig.DBHost,
		AppConfig.DBUser,
		AppConfig.DBPass,
		AppConfig.DBName,
		AppConfig.DBPort,
		AppConfig.DBSSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Supabase caps connections per project and Supavisor drops idle ones.
	// GORM leaves MaxOpenConns unbounded, which exhausts the quota.
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to access the underlying sql.DB:", err)
	}
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(2)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	err = db.AutoMigrate(
		&User{},
		&InstallmentPlan{},
		&Installment{},
		&BudgetItem{},
		&BudgetMonthlyValue{},
		&PersonDebt{},
		&DebtPayment{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	DB = db
	log.Println("Database connected and migrated successfully")
}
```

`TimeZone=Asia/Bangkok` matters: GORM creates `timestamptz` columns on Postgres, and the old MySQL `DATETIME` columns carried no timezone. Only `CreatedAt`/`UpdatedAt` are affected — every date the UI shows (`PersonDebt.LastUpdated`, `DebtPayment.Date`, `BudgetMonthlyValue.Month`) is a Buddhist Era `varchar`.

- [ ] **Step 5: Verify it compiles**

```bash
cd apps/api
go build ./...
go vet ./...
```

Expected: both PASS with no output. A failure here means a handler referenced something MySQL-specific — investigate before continuing, since the portability audit said there is nothing to find.

- [ ] **Step 6: Update `apps/api/.env.example`**

```bash
# Server
PORT=8080

# Database — Supabase Postgres via the Supavisor session pooler (port 5432).
# Do NOT use the direct connection (IPv6 only) or the transaction pooler (6543,
# no prepared statement support).
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.your_project_ref
DB_PASSWORD=your_supabase_db_password
DB_NAME=postgres
DB_SSLMODE=require

# JWT
JWT_SECRET=your_jwt_secret_key_change_this

# Cloudflare Tunnel
# CLOUDFLARE_TUNNEL_TOKEN=your_tunnel_token_here

# One-shot migration only — the legacy MySQL source. Remove after the cutover.
# Note loc=Asia%2FBangkok, not loc=Local: the source DATETIME columns have no
# timezone, and Local would resolve to the container's zone (usually UTC),
# shifting every created_at by seven hours.
# MYSQL_DSN=root:password@tcp(db:3306)/money_manage?charset=utf8mb4&parseTime=True&loc=Asia%2FBangkok
```

- [ ] **Step 7: Verify against the development Supabase project**

Create `apps/api/.env` locally (gitignored) with the **dev** project credentials, then:

```bash
cd apps/api
go run .
```

Expected: logs `Database connected and migrated successfully`, then `Server starting on port 8080`. This proves the DSN, TLS, pooler username format, and `AutoMigrate` all work.

Confirm the schema was created — in the Supabase dashboard SQL editor for the dev project:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

Expected exactly seven tables: `budget_items`, `budget_monthly_values`, `debt_payments`, `installment_plans`, `installments`, `person_debts`, `users`.

Stop the server (Ctrl-C).

- [ ] **Step 8: Commit**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
git add apps/api/config.go apps/api/database.go apps/api/go.mod apps/api/go.sum apps/api/.env.example
git commit -m "feat: connect to Postgres instead of MySQL"
```

---

### Task 2: Add the `migrate` subcommand

**Files:**
- Create: `apps/api/migrate.go`
- Modify: `apps/api/main.go:14-17` (dispatch)
- Modify: `docker-compose.yml` (add a profiled `migrate` service)

**Interfaces:**
- Consumes: `ConnectDatabase()` and the `DB` global from Task 1; the seven model types from `models.go`.
- Produces: `RunMySQLMigration()`, called from `main()` when `os.Args[1] == "migrate"`. Invoked in production as `docker compose run --rm migrate`, which runs `./server migrate`.

- [ ] **Step 1: Create `apps/api/migrate.go`**

```go
package main

import (
	"fmt"
	"log"
	"math"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

// RunMySQLMigration copies every row from the legacy MySQL database into the
// Postgres database this binary is configured for, then prints a per-table
// comparison so the copy can be checked before the cutover.
//
// Routing the data through the same Go structs on both sides is what makes this
// safe: tinyint/boolean, NULL handling, timezone interpretation, and Thai text
// encoding are all the drivers' problem, not ours.
func RunMySQLMigration() {
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		log.Fatal("MYSQL_DSN is required — see .env.example")
	}

	src, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatal("Failed to open the MySQL source: ", err)
	}

	// Refuse to run twice: a second pass would fail on duplicate primary keys
	// partway through and leave the destination half-written.
	var existing int64
	DB.Table("users").Count(&existing)
	if existing > 0 {
		log.Fatalf("destination already holds %d users — clear it before re-running", existing)
	}

	fmt.Println("== copying ==")
	copyTable[User](src, "users")
	copyTable[InstallmentPlan](src, "installment_plans")
	copyTable[Installment](src, "installments")
	copyTable[BudgetItem](src, "budget_items")
	copyTable[BudgetMonthlyValue](src, "budget_monthly_values")
	copyTable[PersonDebt](src, "person_debts")
	copyTable[DebtPayment](src, "debt_payments")

	fmt.Println()
	fmt.Println("== verification: table, rows src/dst, sums src/dst ==")
	ok := true
	ok = compare(src, "users") && ok
	ok = compare(src, "installment_plans", "total_amount") && ok
	ok = compare(src, "installments", "amount") && ok
	ok = compare(src, "budget_items") && ok
	ok = compare(src, "budget_monthly_values", "value") && ok
	ok = compare(src, "person_debts", "total_amount", "paid_amount") && ok
	ok = compare(src, "debt_payments", "amount") && ok

	fmt.Println()
	var months []string
	DB.Table("budget_monthly_values").Distinct().Pluck("month", &months)
	fmt.Println("Thai month values in Postgres:", months)

	fmt.Println()
	if !ok {
		log.Fatal("MISMATCH found — do not cut over")
	}
	fmt.Println("All tables match.")
}

// copyTable reads a whole table from src and inserts it into DB.
func copyTable[T any](src *gorm.DB, label string) {
	var rows []T
	// Unscoped so soft-deleted users are carried across too. It is a no-op for
	// the six models with no DeletedAt field.
	if err := src.Unscoped().Find(&rows).Error; err != nil {
		log.Fatalf("read %s: %v", label, err)
	}
	if len(rows) == 0 {
		fmt.Printf("  %-24s 0 rows, skipped\n", label)
		return
	}
	// Omit associations: the slices were never preloaded, and letting GORM walk
	// them would insert children twice. SkipHooks keeps callbacks out of it.
	err := DB.Session(&gorm.Session{SkipHooks: true}).
		Omit(clause.Associations).
		CreateInBatches(rows, 200).Error
	if err != nil {
		log.Fatalf("write %s: %v", label, err)
	}
	fmt.Printf("  %-24s %d rows\n", label, len(rows))
}

// compare reports row counts and column sums on both sides. Returns false on
// any difference.
func compare(src *gorm.DB, table string, sumCols ...string) bool {
	var srcCount, dstCount int64
	src.Table(table).Count(&srcCount)
	DB.Table(table).Count(&dstCount)

	match := srcCount == dstCount
	fmt.Printf("  %-24s rows %6d / %-6d", table, srcCount, dstCount)

	for _, col := range sumCols {
		var srcSum, dstSum float64
		expr := "COALESCE(SUM(" + col + "), 0)"
		src.Table(table).Select(expr).Scan(&srcSum)
		DB.Table(table).Select(expr).Scan(&dstSum)
		// Tolerance rather than equality: these are float64 sums.
		if math.Abs(srcSum-dstSum) > 0.005 {
			match = false
		}
		fmt.Printf("  %s %.2f / %.2f", col, srcSum, dstSum)
	}

	if match {
		fmt.Println("  OK")
	} else {
		fmt.Println("  MISMATCH")
	}
	return match
}
```

Two details worth knowing before reviewing this code:

- Insert order follows the foreign keys GORM creates from the `constraint:OnDelete:CASCADE` tags: `users → installment_plans → installments → budget_items → budget_monthly_values → person_debts → debt_payments`. Reordering produces FK violations.
- `CreatedAt`/`UpdatedAt` survive the copy. GORM's auto-timestamps only fill a field that is the zero value, so the source values pass through untouched.

- [ ] **Step 2: Dispatch the subcommand in `apps/api/main.go`**

Insert immediately after `ConnectDatabase()` in `main()`:

```go
func main() {
	LoadConfig()
	ConnectDatabase()

	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		RunMySQLMigration()
		return
	}

	r := gin.Default()
```

`os` is already imported (used for `os.Stat` on the static directory), so the import block needs no change. Placing the dispatch after `ConnectDatabase()` is deliberate — the migration needs `DB` connected and `AutoMigrate` already run, so the destination schema exists before any copy.

- [ ] **Step 3: Verify it compiles and the subcommand is wired**

```bash
cd apps/api
go build ./...
go vet ./...
```

Expected: both PASS.

```bash
go run . migrate
```

Expected: connects to the dev Supabase project, then exits with `MYSQL_DSN is required — see .env.example`. That message proves the dispatch works and the guard fires before touching anything.

- [ ] **Step 4: Add a profiled `migrate` service to `docker-compose.yml`**

The migration must run inside the Compose network so it can reach the MySQL container by hostname. A `profiles` key keeps it out of `docker compose up`:

```yaml
  migrate:
    build: ./apps/api
    profiles: ["tools"]
    command: ["./server", "migrate"]
    environment:
      MYSQL_DSN: ${MYSQL_DSN}
      DB_HOST: ${DB_HOST}
      DB_PORT: "5432"
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: postgres
      DB_SSLMODE: require
```

Add it alongside `api` and `tunnel`. **Leave the `db` service in place** — Task 3 runs the migration against it, and only Task 4 removes it. That ordering is what guarantees the `db` hostname resolves.

- [ ] **Step 5: Verify Compose still resolves and the profile hides the service**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
docker compose config --services
```

Expected: `db`, `api`, `tunnel` — **not** `migrate`, because it is behind the `tools` profile.

```bash
docker compose --profile tools config --services
```

Expected: all four, including `migrate`.

- [ ] **Step 5b: Repoint the `api` service at the `.env` values — do NOT defer this to Task 4**

This step was originally part of Task 4, which runs *after* the cutover. That ordering took production down for 38 seconds on 2026-07-26 and it will do so again if restored.

The `api` service hard-codes its database target:

```yaml
      DB_HOST: db
      DB_PORT: "3306"
      DB_USER: root
      DB_PASSWORD: ${DB_PASSWORD:-money123}
      DB_NAME: ${DB_NAME:-money_manage}
```

So switching `.env` to Supabase changes nothing for the API. Task 3 deploys a binary built with the Postgres driver, Compose still aims it at the MySQL container, and it crash-loops on `tls error: server refused TLS connection` — the driver asking for TLS from a MySQL server that has no idea what it is being asked. `.env` looks correct throughout, which makes it a slow thing to diagnose under pressure.

Replace the block with:

```yaml
      # Every DB_* value comes from .env — no defaults. A missing variable must
      # fail loudly rather than silently fall back to the retired local MySQL.
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      DB_SSLMODE: ${DB_SSLMODE}
```

Dropping the `:-` defaults is deliberate. A default that points at the database being retired turns a missing variable into a confusing runtime failure instead of an obvious startup one.

Leave the `db` service and `depends_on` in place — they are the rollback path until Task 4.

Verify before committing:

```bash
docker compose config | sed -n '/^  api:/,/^  [a-z]/p' | grep DB_
```

Expected: the resolved Supabase host and port 5432, not `db` and `3306`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/migrate.go apps/api/main.go docker-compose.yml
git commit -m "feat: add migrate subcommand for the MySQL to Postgres copy"
```

---

### Task 2b: Rehearse the whole path against a throwaway local Postgres

**Files:** none modified. Pure verification, and worth its own task: it exercises every risk in Task 3 without a maintenance window, real data, or a Supabase account.

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: evidence that the driver switch, `AutoMigrate`, the copy, the guards, and every handler behave correctly on Postgres 17 — so Task 3 is a credential change rather than a first attempt.

This was run on 2026-07-26 and passed in full. Re-run it after any change to `migrate.go`, `database.go`, or the models.

- [ ] **Step 1: Seed the local MySQL with data that has teeth**

The local `db` container already holds the schema from the Phase 1 verification. Insert rows that cover every translation hazard: Thai text, a soft-deleted user, NULL nullable columns, `tinyint` booleans in both states, non-round floats, and explicit wall-clock timestamps.

```bash
docker compose -f docker-compose.yml -f "$SCR/no-db-port.yml" up -d db
docker compose exec -T db mysql -uroot -pmoney123 money_manage <<'SQL'
SET NAMES utf8mb4;
INSERT INTO users (id,username,password,created_at,deleted_at) VALUES
 ('u-soft','ผู้ใช้ลบแล้ว','$2a$10$abcdefghijklmnopqrstuv','2026-01-15 09:30:00','2026-02-01 11:00:00');
INSERT INTO installment_plans
 (id,provider,name,total_amount,per_month,total_installments,is_closed,note,provider_color,user_id,created_at,updated_at) VALUES
 ('p-ktc','KTC','ตู้เย็น 2 ประตู',24000.50,2000.00,12,0,'ผ่อน 0% นาน 12 เดือน','#1f9d55','<a real user id>','2026-03-01 20:38:00','2026-03-03 16:01:00'),
 ('p-shp','SHOPEE','Shopee PayLater',3500.75,NULL,NULL,1,NULL,NULL,'<a real user id>','2026-04-10 08:15:00','2026-05-02 10:00:00');
SQL
```

Add matching `installments`, `budget_items`, `budget_monthly_values` (with Thai month strings such as `เม.ย.`, `พ.ค.`, `ก.ค.`), `person_debts`, and `debt_payments` rows in the same style.

- [ ] **Step 2: Start a throwaway Postgres on the Compose network**

No published port — the migrate container reaches it by container name:

```bash
docker run -d --name mm-pg-verify --network money-manage_default \
  -e POSTGRES_PASSWORD=verify_pw -e POSTGRES_DB=postgres postgres:17-alpine
```

- [ ] **Step 3: Run the migration into it**

`DB_SSLMODE=disable` because a bare local Postgres has no TLS:

```bash
docker compose --profile tools run --rm --no-deps \
  -e DB_HOST=mm-pg-verify -e DB_USER=postgres -e DB_PASSWORD=verify_pw -e DB_SSLMODE=disable \
  -e MYSQL_DSN='root:money123@tcp(db:3306)/money_manage?charset=utf8mb4&parseTime=True&loc=Asia%2FBangkok' \
  migrate
```

Expected: every table `OK`, the Thai month list printed, and `All tables match.`

- [ ] **Step 4: Check what the report cannot judge**

```bash
docker exec mm-pg-verify psql -U postgres -c "select column_name,data_type from information_schema.columns where table_name='installment_plans';"
docker exec mm-pg-verify psql -U postgres -c "select id,per_month,total_installments,note,is_closed from installment_plans order by id;"
docker exec mm-pg-verify psql -U postgres -c "set timezone='Asia/Bangkok'; select created_at from installment_plans where id='p-ktc';"
docker exec mm-pg-verify psql -U postgres -c "select username,(deleted_at is not null) from users order by id;"
```

Expected, and all confirmed on the 2026-07-26 run:

- `created_at` is `timestamp with time zone`, `is_closed` is `boolean`, amounts are `numeric`
- The Shopee plan keeps NULL in `per_month`, `total_installments`, `note`, `provider_color`
- **`created_at` reads back `2026-03-01 20:38:00+07`** — the source wall-clock exactly, stored as `13:38+00`. This is the single largest corruption risk in the migration; the `loc=Asia%2FBangkok` DSN plus `TimeZone=Asia/Bangkok` is what makes it come out right
- The soft-deleted user is present, proving `Unscoped()` in `copyTable` works

- [ ] **Step 5: Verify both guards refuse to do damage**

Re-run the exact command from Step 3, then run it again with `-e MYSQL_DSN=`:

Expected: `destination already holds N users — clear it before re-running`, then `MYSQL_DSN is required — see .env.example`. Neither writes anything.

- [ ] **Step 6: Run the real API against the migrated Postgres**

**Rebuild the image first.** The `money-manage-api` image from Phase 1 still contains the MySQL driver, and running it against Postgres fails with `[mysql] connection.go:49: unexpected EOF` — a confusing symptom with a trivial cause. The production deploy rebuilds via `up -d --build`, but a manual `docker run` does not:

```bash
docker compose build api
docker run -d --name mm-api-verify --network money-manage_default -p 8080:8080 \
  -e DB_HOST=mm-pg-verify -e DB_PORT=5432 -e DB_USER=postgres \
  -e DB_PASSWORD=verify_pw -e DB_NAME=postgres -e DB_SSLMODE=disable \
  -e JWT_SECRET=verify_secret -e GIN_MODE=release -e STATIC_DIR=./dist \
  -v "$PWD/apps/web/dist:/app/dist:ro" money-manage-api
```

Then exercise the read and write paths, especially the ones with the most Postgres exposure:

- `POST /api/auth/login` as a migrated user — proves the copied bcrypt hash works
- `GET /api/installments` — `Preload` with `ORDER BY installment_number ASC`
- `PATCH /api/installments/:planId/toggle/:installmentId`
- `POST /api/debts/:id/payment` — the `DB.Begin()` transaction at `handler_debt.go:154`
- `PATCH /api/budget/:id/paid` — a boolean write
- `PATCH /api/installments/paid` — `plan_id IN ?` and `is_closed = ?`

All returned correct results on the 2026-07-26 run. Note `PATCH /api/budget/:id/month` handles `value` only; the paid flag has its own `/paid` route. Sending `paid` to `/month` is silently ignored — pre-existing behaviour, not a Postgres regression.

- [ ] **Step 7: Tear down**

```bash
docker rm -f mm-api-verify mm-pg-verify
docker compose stop db
```

Leave the MySQL container and its volume alone.

---

### Task 3: Run the migration and cut over

**Files:** none modified. This task runs on the production server against real data.

**Interfaces:**
- Consumes: `RunMySQLMigration()` and the `migrate` Compose service from Task 2.
- Produces: a populated Supabase database and a production API serving from it.

The ordering here is the whole point: the migration runs on the **unmerged** branch, so production is still serving from MySQL while the copy is verified. Merging to `main` — and therefore deploying — happens only after the destination is known good, so the API never comes up against an empty database.

- [ ] **Step 1: Push the branch without merging**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
git push -u origin feat/supabase
```

Pushing this branch is safe: the deploy workflow triggers on `main` and `workflow_dispatch` only.

- [ ] **Step 2: Check the branch out on the server**

On the self-hosted runner:

```bash
cd /home/it23-server/money-manage
git fetch origin
git checkout feat/supabase
```

The running containers are untouched by a checkout — production keeps serving the old image against MySQL.

- [ ] **Step 3: Add both sets of credentials to the root `.env`**

The root `.env` needs the Supabase destination *and* the MySQL source at the same time. Append:

```bash
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.<project-ref>
DB_PASSWORD=<supabase db password>
DB_NAME=postgres
DB_SSLMODE=require

MYSQL_DSN=root:<mysql password>@tcp(db:3306)/money_manage?charset=utf8mb4&parseTime=True&loc=Asia%2FBangkok
```

The existing `DB_PASSWORD` line for MySQL must be **replaced**, not duplicated — its old value is what goes inside `MYSQL_DSN`. Keep `JWT_SECRET` unchanged; changing it would invalidate every issued token.

`loc=Asia%2FBangkok` is not optional. `loc=Local` resolves to the container's timezone, which is UTC, and would shift every `created_at` by seven hours on the way into `timestamptz`.

**Do not run `docker compose up` between this step and Step 7.** The `.env` now holds Supabase credentials in `DB_PASSWORD`, but the `api` image currently running is the Phase 1 build with the MySQL driver. Bringing it up would restart the API with a Postgres password pointed at a MySQL driver — it would fail to connect and take production down for no reason. Only `docker compose run --rm migrate` is safe here, because it builds and runs a separate one-off container and leaves `api` alone.

- [ ] **Step 4: Stop using the app**

Announce a maintenance window of roughly thirty minutes. MySQL is still authoritative and still accepting writes; anything written from now until Step 7 is not copied and will be lost. For a single-user personal app, simply not opening it is sufficient — no read-only mode is needed.

- [ ] **Step 5: Run the migration**

```bash
cd /home/it23-server/money-manage
docker compose --profile tools run --rm migrate
```

Expected output, in order: `Database connected and migrated successfully` (AutoMigrate created the seven tables in Supabase), a `== copying ==` block listing row counts per table, a `== verification ==` block, the list of Thai month values, and finally `All tables match.`

Task 2b already rehearsed this exact command against a local Postgres 17, so a failure here points at the Supabase connection or the real data's shape, not at the migration code.

If it exits with `MISMATCH found — do not cut over`, **stop**. Nothing has changed in production. Read the offending row, decide whether it needs clearing the destination (`truncate` the seven tables in the Supabase SQL editor) and re-running, and only continue once the report is clean.

- [ ] **Step 6: Verify the Thai text and a spot value by hand**

The command's own report covers row counts and money totals. Two things it cannot judge for you — run these in the Supabase SQL editor:

```sql
select distinct month from budget_monthly_values;
select name, item, total_amount from person_debts limit 5;
```

Expected: months read `ม.ค.`, `ก.พ.`, and so on — not `???`, not mojibake. Debt names and items are legible Thai. If they are not, the copy is unusable; clear the tables and investigate the source encoding before retrying.

- [ ] **Step 7: Merge to `main` and let the deploy cut over**

Merge `feat/supabase` into `main` on GitHub. The workflow fires, rebuilds the API image with the Postgres driver, and restarts the container against Supabase — which already holds the data.

On the server, return the checkout to `main` first so the workflow's `git pull origin main` operates on the right branch:

```bash
cd /home/it23-server/money-manage
git checkout main
```

- [ ] **Step 8: Verify production end to end**

```bash
docker compose ps
docker compose logs --tail=30 api
```

Expected: `api` running; logs show `Database connected and migrated successfully` and no connection errors. A TLS or DNS failure here means `DB_HOST`/`DB_USER` are wrong — the username must be `postgres.<project-ref>`.

Then in a browser:

- Log in with an existing account. Success proves the copied bcrypt hashes are intact (they are ASCII in a `varchar`, so they survive), and that `JWT_SECRET` was left alone.
- Compare the Dashboard summary figures against what they were before the window. They must be identical.
- Open the installments, budget, and debts pages. Thai labels render, amounts match, and paid checkboxes reflect their previous state.

- [ ] **Step 9: Leave MySQL running and record the state**

Do not stop or remove the `db` container yet, and never pass `-v` to `docker compose down`. It is the rollback path until the user is confident.

**Rollback, if any of Step 8 fails:** revert the merge commit on `main` (which redeploys the previous image), restore the MySQL `DB_*` values in `.env`, and `docker compose up -d --build`. The `mysql_data` volume is untouched and the migration only ever read from it, so recovery is a few minutes and loses nothing.

---

### Task 4: Remove the migration scaffolding

**Files:**
- Delete: `apps/api/migrate.go`
- Modify: `apps/api/main.go` (drop the dispatch), `apps/api/go.mod`, `apps/api/go.sum`
- Modify: `docker-compose.yml` (drop `db`, `mysql_data`, `depends_on`, and `migrate`)
- Modify: `apps/api/.env.example` (drop `MYSQL_DSN`)

**Interfaces:**
- Consumes: a verified production cutover from Task 3.
- Produces: a Compose file with two services, `api` and `tunnel`, and a Go module with no MySQL dependency.

Run this task only once the user confirms production has been stable for long enough that the rollback path is no longer wanted. It is a separate deploy.

- [ ] **Step 1: Branch**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
git checkout main
git pull origin main
git checkout -b chore/drop-mysql
```

- [ ] **Step 2: Delete the migration code and its dispatch**

```bash
git rm apps/api/migrate.go
```

In `apps/api/main.go`, remove the four dispatch lines added in Task 2 Step 2, restoring:

```go
func main() {
	LoadConfig()
	ConnectDatabase()

	r := gin.Default()
```

- [ ] **Step 3: Drop the MySQL driver**

```bash
cd apps/api
go mod tidy
grep driver go.mod
```

Expected: only `gorm.io/driver/postgres` remains. `go mod tidy` also drops `github.com/go-sql-driver/mysql` and `filippo.io/edwards25519` from the indirect block, since nothing imports them now.

- [ ] **Step 4: Reduce `docker-compose.yml` to two services**

Remove, in full: the `db` service, the top-level `mysql_data` volume, the `depends_on` block under `api`, and the `migrate` service from Task 2.

The `api` service keeps its `DB_*` environment untouched — Task 2 Step 5b already repointed it at `.env`, which is what makes it safe to delete `db` here. `tunnel` is unchanged except that its `depends_on: [api]` stays valid.

Dropping the health gate is a small win in itself: the deploy no longer waits for a MySQL container to report healthy before starting the API.

- [ ] **Step 5: Verify Compose**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
docker compose config --services
```

Expected: exactly `api` and `tunnel`.

```bash
docker compose config | grep -i -e mysql -e "profiles" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 6: Verify the API still builds**

```bash
cd apps/api
go build ./...
go vet ./...
```

Expected: both PASS.

- [ ] **Step 7: Update `apps/api/.env.example` and `apps/api/CLAUDE.md`**

In `.env.example`, delete the `MYSQL_DSN` block and its explanatory comment.

In `CLAUDE.md`, correct two sections that still describe MySQL. Tech Stack:

```markdown
- **Supabase Postgres 17** via GORM (auto-migration on startup), connected
  through the Supavisor session pooler on port 5432
- **Docker Compose** for deployment (API + Cloudflare Tunnel)
```

Environment Variables — add `DB_SSLMODE` to the list and note that `DB_USER` takes the form `postgres.<project-ref>` and `DB_NAME` is `postgres`.

- [ ] **Step 8: Commit**

```bash
cd /Users/ittaframe/Git-Me/money-manage-all/money-manage
git add -A
git commit -m "chore: drop MySQL driver and container"
```

- [ ] **Step 9: Report and stop**

Do not push. Tell the user this branch is ready and that merging it deploys a Compose file with no `db` service — after which the MySQL container becomes an orphan. Compose will warn about it; the warning is correct. It can be removed manually, with its volume, whenever they choose. Confirm the real names first — Compose derives them from the project name, which is the directory name:

```bash
docker ps -a --filter name=db --format '{{.Names}}'
docker volume ls | grep mysql
```

Then, using the names those commands printed:

```bash
docker rm -f <db container name>
docker volume rm <mysql volume name>
```

The `volume rm` is the point of no return for the old data. Only the user runs it.

---

### Task 5: Reconcile the spec

**Files:**
- Modify: `docs/superpowers/specs/2026-07-26-monorepo-supabase-design.md`

- [ ] **Step 1: Correct the migration command's location**

The Data migration section states the command lives at `apps/api/cmd/migrate/main.go`. Replace that sentence with an accurate description and the reason:

```markdown
A `migrate` subcommand on the existing binary — `apps/api/migrate.go`, dispatched
from `main.go` on `os.Args[1] == "migrate"` — opens both databases with the same
models and copies table by table.

It is a subcommand rather than a separate `cmd/migrate` binary because the models
live in `package main`, which Go cannot import from another package. Reaching them
from a second binary would mean extracting the models into their own package,
a refactor this migration does not need.
```

- [ ] **Step 2: Note that the MySQL driver is retained temporarily**

The Database migration table says `gorm.io/driver/mysql` → `gorm.io/driver/postgres`. Amend that row: the Postgres driver is added while the MySQL driver stays, since the migration command reads through it; it is dropped in a separate follow-up deploy along with `migrate.go` and the `db` service.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-26-monorepo-supabase-design.md
git commit -m "docs: correct the migrate command location in the spec"
```

This can ride along on the `chore/drop-mysql` branch from Task 4 rather than needing its own.

---

## Post-phase manual steps (user, not the implementer)

- Set up a `pg_cron` job to keep the free-tier project from pausing after seven days of inactivity:

  ```sql
  select cron.schedule('keepalive', '0 3 * * *', 'select 1');
  ```

  Without it, an unopened week suspends the project and it needs a manual resume from the dashboard.
- Point local development at the second (dev) Supabase project via `apps/api/.env`
- Archive `money-manage-api` on GitHub
- Remove the MySQL container and volume when ready (see Task 4 Step 9)
- Delete the `DEPLOY_TOKEN` secret if Phase 1 did not already
