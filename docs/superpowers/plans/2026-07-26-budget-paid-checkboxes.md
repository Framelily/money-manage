# Budget Paid Checkboxes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every amount in the budget table gets a checkbox that records whether it has been paid, and ticking a row sourced from installment plans marks the underlying instalments paid.

**Architecture:** The backend gains one boolean column on `BudgetMonthlyValue` and two write endpoints — one for an ordinary budget month, one that sets every instalment of a provider in a month. The frontend carries a parallel `monthlyPaid` record on `BudgetItem` holding both a tri-state and the settled amount, so `BudgetTable` renders one kind of checkbox for every row and the summary rows can total what is settled. Ticks route by row type: provider rows write instalments, everything else writes budget months.

**Tech Stack:** Go 1.25 + Gin + GORM + MySQL (`money-manage-api`); React 19 + TypeScript + Vite + Ant Design (`money-manage`).

**Spec:** `docs/superpowers/specs/2026-07-26-budget-paid-checkboxes-design.md`

**Two repositories.** Tasks 1-2 are in `/Users/ittaframe/Git-Me/money-manage-all/money-manage-api`, Tasks 3-5 in `/Users/ittaframe/Git-Me/money-manage-all/money-manage`. Each repo has its own git history; commit in the repo you are editing.

## Global Constraints

- All UI text is Thai. Code identifiers, comments and commit messages are English.
- `MONTHS_BE` (frontend `src/types/common.ts`) and `monthsBE` (backend `handler_budget.go:11`) are the same 12 Thai abbreviations, ม.ค. first.
- Budget months are keyed by that Thai abbreviation. Instalment months are the numeric index into the same list, as `Installment.Month` already stores.
- Buddhist-era years throughout; both `BudgetMonthlyValue` and `Installment` carry a `Year`.
- Every API route is user-scoped from `c.GetString("user_id")`. A provider name from the request body must never be trusted to select rows on its own.
- `BudgetChart`, `utils/calculations.ts`, the dashboard and the payoff page read `monthlyValues` and must keep working untouched. `monthlyValues` does not change shape.
- Neither repo has a test framework and neither is getting one. Backend verification is `go build ./...` plus `curl` against a local server and a check of the resulting rows. Frontend verification is `npx tsc -b` plus throwaway esbuild+node scripts for pure functions.
- The local API runs on port 8888 against MySQL `money_manage` at 127.0.0.1:3306 (user `root`, no password). A dev server for the frontend runs on 5173.
- Test credentials for curl: username `it23`, password `it231234`.

---

### Task 1: Backend — `Paid` column and the budget paid endpoint

**Files (repo `money-manage-api`):**
- Modify: `models.go` (the `BudgetMonthlyValue` struct, lines 53-59)
- Modify: `handler_budget.go` (add an input struct and handler after `UpdateBudgetMonthlyValue`, which ends at line 186)
- Modify: `routes.go:37` area (the budget group)

**Interfaces:**
- Consumes: nothing.
- Produces: `PATCH /api/budget/:id/paid`, body `{"month": "<Thai abbrev>", "year": <int>, "paid": <bool>}`, returning the full updated `BudgetItem` with its monthly values for that year — the same response shape `PATCH /api/budget/:id/month` already returns. Every `BudgetMonthlyValue` in every budget response now carries `"paid"`. Task 3 consumes both.

- [ ] **Step 1: Add the column**

In `models.go`, `BudgetMonthlyValue` becomes:

```go
type BudgetMonthlyValue struct {
	ID           string  `gorm:"type:varchar(36);primaryKey" json:"id"`
	BudgetItemID string  `gorm:"type:varchar(36);index;not null" json:"budgetItemId"`
	Month        string  `gorm:"type:varchar(20);not null" json:"month"` // Thai month abbreviations
	Year         int     `gorm:"default:0" json:"year"`
	Value        float64 `gorm:"default:0" json:"value"`
	Paid         bool    `gorm:"default:false" json:"paid"`
}
```

GORM's auto-migration on startup adds the column; existing rows take `false`. Do not write a migration file — this project has none.

- [ ] **Step 2: Add the handler**

Append to `handler_budget.go`, directly after `UpdateBudgetMonthlyValue`. It deliberately mirrors that function, including the create-if-missing branch — a month the user has never typed an amount into can still be ticked.

```go
type UpdateMonthlyPaidInput struct {
	Month string `json:"month" binding:"required"`
	Year  int    `json:"year"`
	Paid  bool   `json:"paid"`
}

func UpdateBudgetMonthlyPaid(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var item BudgetItem
	if err := DB.Where("id = ? AND user_id = ?", id, userID).First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Budget item not found"})
		return
	}

	var input UpdateMonthlyPaidInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result := DB.Model(&BudgetMonthlyValue{}).
		Where("budget_item_id = ? AND month = ? AND year = ?", id, input.Month, input.Year).
		Update("paid", input.Paid)

	if result.RowsAffected == 0 {
		mv := BudgetMonthlyValue{
			ID:           uuid.New().String(),
			BudgetItemID: id,
			Month:        input.Month,
			Year:         input.Year,
			Value:        0,
			Paid:         input.Paid,
		}
		DB.Create(&mv)
	}

	query := preloadMonthlyValues(DB.Where("id = ?", id), input.Year)
	query.First(&item)
	c.JSON(http.StatusOK, item)
}
```

- [ ] **Step 3: Register the route**

In `routes.go`, in the budget group, directly below the existing `/:id/month` line:

```go
			budget.PATCH("/:id/paid", UpdateBudgetMonthlyPaid)
```

- [ ] **Step 4: Build**

```bash
go build ./...
```

Expected: no output, exit 0.

- [ ] **Step 5: Verify against a running server**

Restart the API so auto-migration adds the column, then confirm the column exists and the endpoint round-trips.

```bash
mysql -h 127.0.0.1 -u root -D money_manage -e "SHOW COLUMNS FROM budget_monthly_values LIKE 'paid';"
```

Expected: one row, `paid`, type `tinyint(1)`.

```bash
T=$(curl -s -X POST http://localhost:8888/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"it23","password":"it231234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
ID=$(curl -s -H "Authorization: Bearer $T" 'http://localhost:8888/api/budget?year=2569' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
curl -s -X PATCH "http://localhost:8888/api/budget/$ID/paid" -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -d '{"month":"ก.ค.","year":2569,"paid":true}' \
  | python3 -c 'import sys,json;print([mv for mv in json.load(sys.stdin)["monthlyValues"] if mv["month"]=="ก.ค."])'
```

Expected: the ก.ค. monthly value prints with `'paid': True`. Repeat with `"paid":false` and confirm it prints `False`. Then re-run the GET and confirm the flag persisted rather than only appearing in the write's response.

- [ ] **Step 6: Commit**

```bash
git add models.go handler_budget.go routes.go
git commit -m "feat: record whether a budget month has been paid"
```

---

### Task 2: Backend — set every instalment of a provider in a month

**Files (repo `money-manage-api`):**
- Modify: `handler_installment.go` (add an input struct and handler after `ToggleInstallment`, which ends at line 244)
- Modify: `routes.go` (the installments group, lines 20-28)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `PATCH /api/installments/paid`, body `{"provider": "<string>", "month": <0-11>, "year": <int>, "paid": <bool>}`, returning the provider's plans with their instalments preloaded — an array shaped like `GET /api/installments` filtered to that provider. Task 3 consumes it.

- [ ] **Step 1: Add the handler**

Append to `handler_installment.go`, after `ToggleInstallment`.

The plan IDs are resolved from `user_id` first, and the update is constrained to
those IDs — the provider string never selects rows by itself, so it cannot reach
another user's plans. The update is one statement, which MySQL applies
atomically; no explicit transaction is needed and none should be added.

```go
type SetProviderPaidInput struct {
	Provider string `json:"provider" binding:"required"`
	Month    int    `json:"month"`
	Year     int    `json:"year"`
	Paid     bool   `json:"paid"`
}

func SetProviderInstallmentsPaid(c *gin.Context) {
	userID := c.GetString("user_id")

	var input SetProviderPaidInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var planIDs []string
	if err := DB.Model(&InstallmentPlan{}).
		Where("user_id = ? AND provider = ?", userID, input.Provider).
		Pluck("id", &planIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(planIDs) == 0 {
		c.JSON(http.StatusOK, []InstallmentPlan{})
		return
	}

	status := "unpaid"
	if input.Paid {
		status = "paid"
	}

	if err := DB.Model(&Installment{}).
		Where("plan_id IN ? AND month = ? AND year = ?", planIDs, input.Month, input.Year).
		Update("status", status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var plans []InstallmentPlan
	DB.Where("user_id = ? AND provider = ?", userID, input.Provider).
		Preload("Installments", func(db *gorm.DB) *gorm.DB {
			return db.Order("installment_number ASC")
		}).Find(&plans)

	c.JSON(http.StatusOK, plans)
}
```

- [ ] **Step 2: Register the route**

In `routes.go`, in the installments group, directly below the existing toggle line:

```go
			installments.PATCH("/paid", SetProviderInstallmentsPaid)
```

The static `paid` segment sits beside the existing `:planId` wildcard in the same
PATCH tree. This was checked against the pinned gin (v1.12.0) and registers
without panic, but that is exactly what Step 4 re-confirms: if the server starts,
the routes coexist.

- [ ] **Step 3: Build**

```bash
go build ./...
```

Expected: no output, exit 0.

- [ ] **Step 4: Verify against a running server**

Restart the API. If it starts and logs its routes, registration is fine.

```bash
T=$(curl -s -X POST http://localhost:8888/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"it23","password":"it231234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s -H "Authorization: Bearer $T" http://localhost:8888/api/installments \
  | python3 -c '
import sys, json, collections
plans = json.load(sys.stdin)
seen = collections.Counter()
for p in plans:
    for i in p["installments"]:
        seen[(p["provider"], i["year"], i["month"])] += 1
for k, n in sorted(seen.items())[:10]:
    print(k, n)'
```

Pick a `(provider, year, month)` from that listing with a count above 1 if one
exists — that is the case worth testing — and put it in shell variables so
nothing has to be pasted into the middle of the checking script:

```bash
PROVIDER='KTC'   # replace with a provider from the listing
M=6              # its month index
Y=2569           # its year

curl -s -X PATCH http://localhost:8888/api/installments/paid -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d "{\"provider\":\"$PROVIDER\",\"month\":$M,\"year\":$Y,\"paid\":true}" \
  | M=$M Y=$Y python3 -c '
import sys, json, os
month, year = int(os.environ["M"]), int(os.environ["Y"])
plans = json.load(sys.stdin)
for p in plans:
    for i in p["installments"]:
        if i["month"] == month and i["year"] == year:
            print(p["provider"], i["installmentNumber"], i["status"])'
```

Expected: every instalment for that provider/month/year prints `paid`. Repeat
with `\"paid\":false` and confirm they all print `unpaid`.

Also confirm the existing toggle route still works, since a new sibling was added
to its tree. Take a plan and one of its instalments from the same listing:

```bash
IDS=$(curl -s -H "Authorization: Bearer $T" http://localhost:8888/api/installments \
  | python3 -c '
import sys, json
for p in json.load(sys.stdin):
    if p["installments"]:
        print(p["id"], p["installments"][0]["id"]); break')
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH \
  "http://localhost:8888/api/installments/$(echo $IDS | cut -d" " -f1)/toggle/$(echo $IDS | cut -d" " -f2)" \
  -H "Authorization: Bearer $T"
```

Expected: `200`. Run it twice so the instalment ends up back in its original
state.

And confirm the user scoping holds — a provider name that belongs to another
user must change nothing:

```bash
curl -s -X PATCH http://localhost:8888/api/installments/paid -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -d '{"provider":"__nonexistent__","month":0,"year":2569,"paid":true}'
```

Expected: `[]`, and no rows altered.

- [ ] **Step 5: Commit**

```bash
git add handler_installment.go routes.go
git commit -m "feat: set every instalment of a provider in a month at once"
```

---

### Task 3: Frontend — types, services and the installment aggregation

Data layer only. Nothing renders differently after this task; `tsc` passing and
the aggregation script are the deliverable.

**Files (repo `money-manage`):**
- Modify: `src/types/budget.ts`
- Modify: `src/services/budgetService.ts`
- Modify: `src/services/installmentService.ts`
- Modify: `src/utils/installmentBudget.ts`
- Modify: `src/data/budget.ts` (dead mock data, kept compiling)
- Modify: `src/components/budget/BudgetItemForm.tsx` (constructs a `BudgetItem`)
- Test: throwaway script in the scratchpad, not committed

**Interfaces:**
- Consumes: `paid` on each monthly value from Task 1; `PATCH /api/installments/paid` from Task 2.
- Produces:
  - `PaidState = 'none' | 'partial' | 'all'` and `MonthPaid = { state: PaidState; amount: Baht }` from `@/types`
  - `BudgetItem.monthlyPaid: Record<MonthBE, MonthPaid>` (required)
  - `budgetService.setMonthlyPaid(id: string, month: MonthBE, paid: boolean, year?: number): Promise<BudgetItem>`
  - `budgetService.getEmptyMonthlyPaid(): Record<MonthBE, MonthPaid>`
  - `installmentService.setProviderPaid(provider: CardProvider, month: number, year: number, paid: boolean): Promise<InstallmentPlan[]>`
  - `installmentsToBudgetItems` unchanged in signature, now also filling `monthlyPaid`

  Tasks 4 and 5 consume all of these.

- [ ] **Step 1: Write the failing test**

Write `<scratchpad>/verify-installment-paid.ts`. It exercises the aggregation
across the three states plus the empty month, using plans built inline.

```ts
import { installmentsToBudgetItems } from '@/utils/installmentBudget';
import type { InstallmentPlan } from '@/types';

function plan(id: string, provider: string, insts: Array<[number, number, number, 'paid' | 'unpaid']>): InstallmentPlan {
  return {
    id,
    provider,
    name: id,
    totalAmount: 0,
    perMonth: null,
    totalInstallments: null,
    isClosed: false,
    installments: insts.map(([month, year, amount, status], n) => ({
      id: `${id}-${n}`, month, year, installmentNumber: n + 1, amount, status,
    })),
  };
}

// ก.ค. is index 6, ส.ค. is 7, ก.ย. is 8.
const plans: InstallmentPlan[] = [
  plan('a', 'KTC', [[6, 2569, 3500, 'paid'], [7, 2569, 3500, 'unpaid'], [8, 2569, 1000, 'paid']]),
  plan('b', 'KTC', [[6, 2569, 9000, 'unpaid'], [8, 2569, 2000, 'paid']]),
];

const [ktc] = installmentsToBudgetItems(plans, 2569);

const cases: Array<{ name: string; actual: unknown; expected: unknown }> = [
  { name: 'ก.ค. value sums both plans', actual: ktc.monthlyValues['ก.ค.'], expected: 12500 },
  { name: 'ก.ค. is partial', actual: ktc.monthlyPaid['ก.ค.'].state, expected: 'partial' },
  { name: 'ก.ค. settled amount is the paid instalment only', actual: ktc.monthlyPaid['ก.ค.'].amount, expected: 3500 },
  { name: 'ส.ค. is none', actual: ktc.monthlyPaid['ส.ค.'].state, expected: 'none' },
  { name: 'ส.ค. settled amount is zero', actual: ktc.monthlyPaid['ส.ค.'].amount, expected: 0 },
  { name: 'ก.ย. is all', actual: ktc.monthlyPaid['ก.ย.'].state, expected: 'all' },
  { name: 'ก.ย. settled amount is the full value', actual: ktc.monthlyPaid['ก.ย.'].amount, expected: 3000 },
  { name: 'a month with no instalments is none', actual: ktc.monthlyPaid['ม.ค.'].state, expected: 'none' },
  { name: 'a month with no instalments has zero value', actual: ktc.monthlyValues['ม.ค.'], expected: 0 },
  { name: 'another year is ignored', actual: installmentsToBudgetItems(plans, 2570).length, expected: 0 },
];

let failed = 0;
for (const c of cases) {
  const ok = JSON.stringify(c.actual) === JSON.stringify(c.expected);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  if (!ok) console.log(`   expected ${JSON.stringify(c.expected)}, actual ${JSON.stringify(c.actual)}`);
}
console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it to verify it fails**

From the `money-manage` directory (`$S` is the scratchpad path):

```bash
npx esbuild $S/verify-installment-paid.ts --bundle --platform=node --format=esm \
  --outfile=./node_modules/.verify-paid.mjs --alias:@=./src --log-level=error \
  && node ./node_modules/.verify-paid.mjs
```

Expected: it fails — `monthlyPaid` does not exist yet, so esbuild reports a type-free
runtime error on `ktc.monthlyPaid['ก.ค.'].state` (`Cannot read properties of undefined`).

- [ ] **Step 3: Add the types**

`src/types/budget.ts`:

```ts
import type { ID, Baht, MonthBE } from './common';

export type BudgetCategory = 'income' | 'fixedExpense' | 'variableExpense';

export type PaidState = 'none' | 'partial' | 'all';

/** How much of one month's value has been settled, and whether that is all of it. */
export interface MonthPaid {
  state: PaidState;
  amount: Baht;
}

export interface BudgetItem {
  id: ID;
  name: string;
  category: BudgetCategory;
  monthlyValues: Record<MonthBE, Baht>;
  monthlyPaid: Record<MonthBE, MonthPaid>;
}
```

Leave `MonthSummary` below it untouched.

- [ ] **Step 4: Fill `monthlyPaid` in the budget service**

In `src/services/budgetService.ts`, `ApiBudgetMonthlyValue` gains `paid: boolean`,
and `transformBudgetItem` fills both records:

```ts
import type { BudgetItem, MonthBE, Baht, MonthPaid } from '@/types';

interface ApiBudgetMonthlyValue {
  id: string;
  budgetItemId: string;
  month: MonthBE;
  year: number;
  value: number;
  paid: boolean;
}

function transformBudgetItem(item: ApiBudgetItem): BudgetItem {
  const monthlyValues = {} as Record<MonthBE, Baht>;
  const monthlyPaid = {} as Record<MonthBE, MonthPaid>;
  MONTHS_BE.forEach((m) => {
    monthlyValues[m] = 0;
    monthlyPaid[m] = { state: 'none', amount: 0 };
  });
  item.monthlyValues?.forEach((mv) => {
    monthlyValues[mv.month] = mv.value;
    monthlyPaid[mv.month] = mv.paid
      ? { state: 'all', amount: mv.value }
      : { state: 'none', amount: 0 };
  });
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    monthlyValues,
    monthlyPaid,
  };
}
```

Add the write method next to `updateMonthlyValue`:

```ts
  async setMonthlyPaid(id: string, month: MonthBE, paid: boolean, year?: number): Promise<BudgetItem> {
    const { data: updated } = await api.patch<ApiBudgetItem>(`/budget/${id}/paid`, { month, paid, year });
    return transformBudgetItem(updated);
  },
```

And a companion to the existing `getEmptyMonthlyValues`:

```ts
  getEmptyMonthlyPaid(): Record<MonthBE, MonthPaid> {
    const paid = {} as Record<MonthBE, MonthPaid>;
    MONTHS_BE.forEach((m) => { paid[m] = { state: 'none', amount: 0 }; });
    return paid;
  },
```

- [ ] **Step 5: Add the installment write method**

In `src/services/installmentService.ts`, next to `toggleInstallment`:

```ts
  async setProviderPaid(provider: CardProvider, month: number, year: number, paid: boolean): Promise<InstallmentPlan[]> {
    const { data } = await api.patch('/installments/paid', { provider, month, year, paid });
    return Array.isArray(data) ? data : [];
  },
```

- [ ] **Step 6: Derive `monthlyPaid` in the aggregation**

Rewrite `src/utils/installmentBudget.ts`. It walks the same instalments it
already sums, additionally counting how many fall in each month and how many of
those are paid, so the state and the settled amount come out of one pass.

```ts
import type { BudgetItem, InstallmentPlan, MonthBE, MonthPaid } from '@/types';
import { MONTHS_BE } from '@/types';

interface ProviderTotals {
  values: Record<MonthBE, number>;
  paidAmount: Record<MonthBE, number>;
  count: Record<MonthBE, number>;
  paidCount: Record<MonthBE, number>;
}

function emptyTotals(): ProviderTotals {
  const totals = {
    values: {} as Record<MonthBE, number>,
    paidAmount: {} as Record<MonthBE, number>,
    count: {} as Record<MonthBE, number>,
    paidCount: {} as Record<MonthBE, number>,
  };
  MONTHS_BE.forEach((m) => {
    totals.values[m] = 0;
    totals.paidAmount[m] = 0;
    totals.count[m] = 0;
    totals.paidCount[m] = 0;
  });
  return totals;
}

function toMonthPaid(totals: ProviderTotals, month: MonthBE): MonthPaid {
  const amount = totals.paidAmount[month];
  if (totals.count[month] === 0 || totals.paidCount[month] === 0) return { state: 'none', amount: 0 };
  if (totals.paidCount[month] === totals.count[month]) return { state: 'all', amount };
  return { state: 'partial', amount };
}

/** รวมรายการผ่อนชำระตาม provider เป็น BudgetItem (variableExpense) สำหรับปีที่ระบุ */
export function installmentsToBudgetItems(plans: InstallmentPlan[], year: number): BudgetItem[] {
  const grouped = new Map<string, ProviderTotals>();

  plans
    .filter((p) => !p.isClosed)
    .forEach((plan) => {
      if (!grouped.has(plan.provider)) {
        grouped.set(plan.provider, emptyTotals());
      }
      const totals = grouped.get(plan.provider)!;
      plan.installments
        .filter((inst) => inst.year === year)
        .forEach((inst) => {
          const monthKey = MONTHS_BE[inst.month];
          if (!monthKey) return;
          totals.values[monthKey] += inst.amount;
          totals.count[monthKey] += 1;
          if (inst.status === 'paid') {
            totals.paidAmount[monthKey] += inst.amount;
            totals.paidCount[monthKey] += 1;
          }
        });
    });

  return [...grouped.entries()]
    .filter(([, totals]) => MONTHS_BE.some((m) => totals.values[m] > 0))
    .map(([provider, totals]) => {
      const monthlyPaid = {} as Record<MonthBE, MonthPaid>;
      MONTHS_BE.forEach((m) => { monthlyPaid[m] = toMonthPaid(totals, m); });
      return {
        id: `installment-${provider}`,
        name: provider,
        category: 'variableExpense' as const,
        monthlyValues: totals.values,
        monthlyPaid,
      };
    });
}
```

- [ ] **Step 7: Run the test to verify it passes**

Same command as Step 2.
Expected: ten `PASS` lines then `ALL PASS`, exit 0.

- [ ] **Step 8: Keep the remaining `BudgetItem` producers compiling**

Two places build a `BudgetItem` and now lack `monthlyPaid`.

`src/data/budget.ts` is mock data that nothing imports, but it is inside
`tsconfig`'s `include`, so it must still typecheck. Change only its top and
bottom — leave the thirteen data lines exactly as they are. Its declaration on
line 14 becomes a plain array of items without the new field, and the export maps
them:

```ts
const items: Omit<BudgetItem, 'monthlyPaid'>[] = [
```

and after the closing `];` of that array:

```ts
export const budgetItems: BudgetItem[] = items.map((item) => ({
  ...item,
  monthlyPaid: MONTHS_BE.reduce((acc, m) => ({ ...acc, [m]: { state: 'none' as const, amount: 0 } }), {} as BudgetItem['monthlyPaid']),
}));
```

`src/components/budget/BudgetItemForm.tsx` builds the object submitted on create,
around line 45. Add the empty record from the service:

```ts
        monthlyPaid: budgetService.getEmptyMonthlyPaid(),
```

importing `budgetService` from `@/services/budgetService` if it is not already
imported there.

- [ ] **Step 9: Typecheck and clean up**

```bash
npx tsc -b && rm -f ./node_modules/.verify-paid.mjs
```

Expected: no output from `tsc`, exit 0.

- [ ] **Step 10: Commit**

```bash
git add src/types/budget.ts src/services/budgetService.ts src/services/installmentService.ts \
        src/utils/installmentBudget.ts src/data/budget.ts src/components/budget/BudgetItemForm.tsx
git commit -m "feat: carry per-month paid state on budget items"
```

---

### Task 4: Frontend — checkboxes that persist

The tick appears and the write lands. Summary figures come in Task 5.

**Files (repo `money-manage`):**
- Modify: `src/components/budget/BudgetTable.tsx`
- Modify: `src/hooks/useBudget.ts`
- Modify: `src/hooks/useInstallments.ts`
- Modify: `src/pages/BudgetPage.tsx`

**Interfaces:**
- Consumes: everything Task 3 produced.
- Produces: `BudgetTable` gains a required prop
  `onPaidChange: (item: BudgetItem, month: MonthBE, paid: boolean) => void`.
  `RowData` gains `paid: Record<MonthBE, MonthPaid>`, which Task 5 reads.

- [ ] **Step 1: Give the hooks their write methods**

In `src/hooks/useBudget.ts`, beside `updateMonthlyValue`:

```ts
  const setMonthlyPaid = useCallback(
    async (id: string, month: MonthBE, paid: boolean) => {
      await budgetService.setMonthlyPaid(id, month, paid, year);
      await refresh();
    },
    [refresh, year]
  );
```

and add `setMonthlyPaid` to the returned object.

In `src/hooks/useInstallments.ts`, beside `toggleInstallment`:

```ts
  const setProviderPaid = useCallback(
    async (provider: CardProvider, month: number, year: number, paid: boolean) => {
      await installmentService.setProviderPaid(provider, month, year, paid);
      await refresh(true);
    },
    [refresh]
  );
```

and add `setProviderPaid` to the returned object. `CardProvider` is already
imported there.

- [ ] **Step 2: Carry paid state into the table's rows**

In `src/components/budget/BudgetTable.tsx`, extend the imports and `Props`:

```ts
import { Table, InputNumber, Button, Popconfirm, Checkbox } from 'antd';
import type { BudgetItem, MonthBE, Baht, BudgetCategory, MonthPaid } from '@/types';
```

```ts
interface Props {
  items: BudgetItem[];
  months: readonly MonthBE[];
  loading: boolean;
  onEdit: (item: BudgetItem) => void;
  onDelete: (id: string) => void;
  onCellChange: (id: string, month: MonthBE, value: Baht) => void;
  onPaidChange: (item: BudgetItem, month: MonthBE, paid: boolean) => void;
}
```

`RowData` gains a field:

```ts
  paid: Record<MonthBE, MonthPaid>;
```

The per-item row push gains `paid: item.monthlyPaid,`. The two synthetic rows
(the category summary and the remaining row) have no paid state of their own;
give them an empty record built the same way the summary values are, so the type
holds:

```ts
    const emptyPaid = {} as Record<MonthBE, MonthPaid>;
    months.forEach((m) => { emptyPaid[m] = { state: 'none', amount: 0 }; });
```

Declare that once, above the `categories.forEach` loop, and use it for both
synthetic rows.

- [ ] **Step 3: Render the checkbox beside each amount**

In the month column's `render`, the two branches that draw an actual item — the
read-only installment branch and the editable branch — each gain a checkbox to
the left. Replace those two branches with:

```tsx
        const paid = record.paid[month] ?? { state: 'none' as const, amount: 0 };
        const checkbox = (
          <Checkbox
            checked={paid.state === 'all'}
            indeterminate={paid.state === 'partial'}
            onChange={(e) => onPaidChange(record.original!, month, e.target.checked)}
          />
        );

        if (record.isReadOnly) {
          return (
            <div className="flex items-center gap-1">
              {val > 0 ? checkbox : <span style={{ width: 16, flexShrink: 0 }} />}
              <span style={{ color: '#999' }}>{formatNumber(val)}</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1">
            {checkbox}
            <EditableCell value={val} onChange={(newVal) => onCellChange(record.id, month, newVal)} />
          </div>
        );
```

A provider row's month with no instalments has a value of zero and gets a spacer
instead of a checkbox, so its number stays aligned with the rows above and below
it. Ordinary rows always get the checkbox, zero or not.

- [ ] **Step 4: Widen the month columns for the checkbox**

The checkbox adds roughly 24px inside each month cell. In the width constants
added by the previous feature, `monthColWidth` becomes:

```ts
  const monthColWidth = isMobile ? 124 : 144;
```

`scrollX` already derives from it, so nothing else changes.

- [ ] **Step 5: Route the write by row type**

In `src/pages/BudgetPage.tsx`, pull the new hook methods:

```ts
  const { items, loading, year, setYear, create, update, updateMonthlyValue, setMonthlyPaid, remove } = useBudget();
  const { plans, setProviderPaid } = useInstallments();
```

Add the handler beside the other handlers. Provider rows carry the provider name
after the `installment-` prefix that `installmentsToBudgetItems` gave them, and
instalments are keyed by numeric month:

```ts
  const handlePaidChange = async (item: BudgetItem, month: MonthBE, paid: boolean) => {
    try {
      if (item.id.startsWith('installment-')) {
        const provider = item.id.slice('installment-'.length);
        await setProviderPaid(provider, MONTHS_BE.indexOf(month), year, paid);
      } else {
        await setMonthlyPaid(item.id, month, paid);
      }
    } catch {
      message.error('บันทึกสถานะจ่ายไม่สำเร็จ');
    }
  };
```

`MonthBE` and `MONTHS_BE` need importing from `@/types` — the type import on
line 9 becomes:

```ts
import { type BudgetItem, type MonthBE, MONTHS_BE } from '@/types';
```

Pass it to the table:

```tsx
      <BudgetTable items={allItems} months={months} loading={loading} onEdit={handleEdit} onDelete={handleDelete} onCellChange={updateMonthlyValue} onPaidChange={handlePaidChange} />
```

- [ ] **Step 6: Typecheck**

```bash
npx tsc -b
```

Expected: no output, exit 0.

- [ ] **Step 7: Verify in the app**

With the API and the dev server running, at http://localhost:5173/budget:

| Check | Expected |
|---|---|
| An ordinary expense row | checkbox left of the amount; ticking it stays ticked after a page reload |
| An income row | same |
| A provider row with no instalment paid that month | unticked; ticking it fills in, and the installments page shows those instalments paid |
| A provider row with some paid | shows the indeterminate dash; ticking it settles the rest |
| A fully paid provider row | ticked; ticking again clears every instalment |
| A provider row's month with no instalments | no checkbox, number still aligned |
| Editing an amount | still saves, unaffected by the checkbox |

- [ ] **Step 8: Commit**

```bash
git add src/components/budget/BudgetTable.tsx src/hooks/useBudget.ts src/hooks/useInstallments.ts src/pages/BudgetPage.tsx
git commit -m "feat: tick budget amounts as paid, including installment rows"
```

---

### Task 5: Frontend — paid figures on the summary and remaining rows

**Files (repo `money-manage`):**
- Modify: `src/components/budget/BudgetTable.tsx` (the summary row build, the remaining row build, and the month column's render)

**Interfaces:**
- Consumes: `RowData.paid` from Task 4.
- Produces: nothing downstream.

- [ ] **Step 1: Total the settled amounts per category**

Where the category summary row is built, alongside the existing `summary` record,
build a settled record from the same items:

```ts
    const summaryPaid = {} as Record<MonthBE, MonthPaid>;
    months.forEach((m) => {
      summaryPaid[m] = {
        state: 'none',
        amount: catItems.reduce((s, i) => s + (i.monthlyPaid[m]?.amount || 0), 0),
      };
    });
```

and give the summary row `paid: summaryPaid` instead of the empty record from
Task 4. `state` is unused on synthetic rows — they render figures, never a
checkbox.

- [ ] **Step 2: Total the settled amounts for the remaining row**

Where the remaining row is built, compute an actual figure beside the planned
one, from ticked rows only:

```ts
  const remainingPaid = {} as Record<MonthBE, MonthPaid>;
  months.forEach((m) => {
    const paidOf = (cat: BudgetCategory) => items
      .filter((i) => i.category === cat)
      .reduce((s, i) => s + (i.monthlyPaid[m]?.amount || 0), 0);
    remainingPaid[m] = {
      state: 'none',
      amount: paidOf('income') - paidOf('fixedExpense') - paidOf('variableExpense'),
    };
  });
```

and give the remaining row `paid: remainingPaid`.

- [ ] **Step 3: Render both figures**

In the month column's `render`, the summary and remaining branches show the
settled figure before the planned one, separated by a slash. The settled figure
keeps the row's colour; the planned figure is muted so the pair reads as
"progress against plan" rather than two equal numbers.

```tsx
        if (record.isSummary) {
          return (
            <span style={{ color: CATEGORY_CONFIG[record.category].color }}>
              <strong>{formatNumber(record.paid[month]?.amount || 0)}</strong>
              <span style={{ opacity: 0.6 }}> / {formatNumber(val)}</span>
            </span>
          );
        }
        if (record.isRemaining) {
          const actual = record.paid[month]?.amount || 0;
          return (
            <span>
              <strong style={{ color: actual >= 0 ? '#10b981' : '#ef4444' }}>{formatNumber(actual)}</strong>
              <span style={{ opacity: 0.6 }}> / {formatNumber(val)}</span>
            </span>
          );
        }
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc -b
```

Expected: no output, exit 0.

- [ ] **Step 5: Verify in the app**

At http://localhost:5173/budget:

| Check | Expected |
|---|---|
| A category summary cell | reads `settled / planned`; the planned half matches what the row showed before this task |
| Tick an expense in that category | the settled half rises by that amount |
| Untick it | it falls back |
| Tick a partially paid provider row | the settled half rises by the unpaid instalments' amounts, not by the whole cell |
| เงินคงเหลือ | reads `actual / planned`; actual counts only ticked rows and goes red when negative |
| A month with nothing ticked | reads `0 / <planned>` |

- [ ] **Step 6: Commit**

```bash
git add src/components/budget/BudgetTable.tsx
git commit -m "feat: show settled against planned on the budget summary rows"
```

---

## Verification

The spec's verification list, mapped to where each item is checked:

1. Ticking an ordinary expense persists across a reload — Task 4 Step 7.
2. Ticking an income row persists and moves the remaining row's actual figure — Task 4 Step 7, Task 5 Step 5.
3. A provider row with nothing paid, ticked once, marks every instalment paid and the installments page agrees — Task 4 Step 7.
4. A partially paid provider row shows indeterminate; ticking settles the rest — Task 4 Step 7.
5. A fully paid provider row, ticked again, unpays every instalment — Task 2 Step 4, Task 4 Step 7.
6. Summary cells show `paid / total` and follow each tick — Task 5 Step 5.
7. `เงินคงเหลือ` shows `actual / planned` from ticked rows only — Task 5 Step 5.
8. Another user's plans cannot be reached through the provider endpoint — Task 2 Step 4.
