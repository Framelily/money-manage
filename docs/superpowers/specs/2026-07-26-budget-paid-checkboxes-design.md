# Budget page: mark each amount as paid

Date: 2026-07-26
Status: approved

Spans two repositories: `money-manage` (frontend) and `money-manage-api` (Go
backend). Implementation waits until `feat/budget-hide-past-months` is verified
and merged — it edits the same table component.

## Problem

The budget table records what each line item costs per month, but not whether it
has been paid. Working through a month's bills means tracking that separately,
in your head or on paper.

Installment plans already carry a paid flag per instalment (`Installment.Status`),
but it can only be toggled from the installments page — even though the budget
page is where the month is actually worked through, and shows those same
instalments as one aggregated row per provider.

## Goal

Every amount in the budget table gets a checkbox. Ticking one records that it is
paid. Ticking a row that came from installment plans marks the underlying
instalments paid, so the two pages stay one truth rather than two records of it.

## Scope

In scope: a paid flag per budget item per month, checkboxes in `BudgetTable`,
paid/planned figures on the summary and remaining rows, and the write path from
the budget page into installment instalments.

Out of scope: the chart, the payoff page, the dashboard, recording *when* or *how
much* was paid (the flag is a boolean, not a payment record), and any change to
how amounts themselves are edited.

## Behaviour

### Every row gets checkboxes

Income rows included — a ticked income means the money arrived.

The checkbox sits to the left of the amount, on the same line, so the table keeps
its row count and only widens.

### Ordinary budget rows

Two states: unticked and ticked. The flag belongs to one item, one month, one
year — the same grain as the amount itself. A month with an amount of zero still
gets a checkbox; zero is a value the user typed, not an absence.

### Installment provider rows

`installmentsToBudgetItems` groups every plan of a provider into one row, so a
single cell can stand for several instalments in that month.

Three states:

| State | Shown as | Ticking it does |
|---|---|---|
| No instalment paid | unticked | marks every instalment for that provider and month paid |
| Some paid | indeterminate | marks the remaining ones paid |
| All paid | ticked | marks every one unpaid |

Both writes set an explicit state for the whole group; neither flips instalments
one by one.

A provider row's cell for a month with no instalments shows nothing to pay, so it
gets no checkbox — unlike an ordinary row, a zero there means the provider has
no instalment that month, not an amount of zero.

### Summary rows

Each per-category summary cell shows `paid / total` — how much of that category's
month has been settled against what it comes to. The user's stated purpose is
working down a month's bills, so what remains has to be readable at a glance.

### Remaining row

`เงินคงเหลือ` shows `actual / planned`:

- **planned** — income minus expenses, what the row shows today.
- **actual** — ticked income minus ticked expenses: cash actually in hand right
  now.

## Design

### Backend — `money-manage-api`

`BudgetMonthlyValue` gains one column:

```go
Paid bool `gorm:"default:false" json:"paid"`
```

GORM's auto-migration on startup adds it; existing rows take the `false` default.
No hand-written migration.

Instalments need no schema change — `Installment.Status` already holds
`'paid'` / `'unpaid'`. This is what lets a tick on the budget page appear on the
installments page: one record, read from two places, not two records to
reconcile.

Two new endpoints:

| Endpoint | Body | Effect |
|---|---|---|
| `PATCH /api/budget/:id/paid` | `{month, year, paid}` | sets the flag on one item's month |
| `PATCH /api/installments/provider/:provider/paid` | `{month, year, paid}` | sets every instalment of that provider in that month to `paid`, in one transaction |

Both are user-scoped like every other route: the budget one by
`budget_items.user_id`, the installment one by joining through
`installment_plans.user_id`, so a provider name alone cannot reach another user's
plans.

`paid` is a separate endpoint from the existing `PATCH /:id/month` because that
one requires a `value` in its body. Marking something paid should not mean
resending — and risk overwriting — its amount.

The provider endpoint is new rather than the frontend looping over the existing
`PATCH /:planId/toggle/:installmentId`, for two reasons. That route *flips* a
status, so applying it across a partially paid group would unpay the instalments
already settled — the opposite of what ticking means here. And a loop of N
requests that fails midway leaves the group half-written, with no way to say what
the user's tick actually did.

### Frontend — `money-manage`

`BudgetItem` gains a parallel field; `monthlyValues` is untouched:

```ts
export type PaidState = 'none' | 'partial' | 'all';

interface BudgetItem {
  // ...
  monthlyPaid: Record<MonthBE, PaidState>;
}
```

Three states rather than a boolean, even though ordinary items only ever reach
`'none'` or `'all'`, because provider rows need `'partial'`. One shared type
means `BudgetTable` renders every cell the same way:

```tsx
<Checkbox checked={state === 'all'} indeterminate={state === 'partial'} />
```

Two types would mean two rendering paths through the same component.

For ordinary items the state comes straight from the API: each
`BudgetMonthlyValue` carries a boolean `paid`, which the service maps to `'all'`
or `'none'`. `'partial'` is unreachable for them, which is correct — an ordinary
item's month is one amount, either settled or not.

`monthlyValues` keeps its shape — turning it into `Record<MonthBE, {value, paid}>`
would reach `BudgetChart`, `utils/calculations.ts`, the payoff page and the
dashboard, none of which care about paid state.

`installmentsToBudgetItems` already aggregates amounts per provider and month; it
also derives `monthlyPaid` from the same instalments it is summing — `'all'` when
every instalment in that month is paid, `'none'` when none is, `'partial'`
otherwise.

Writes route by row type: provider rows (`id` starting `installment-`) call the
installments endpoint and refresh plans; every other row calls the budget
endpoint and refreshes budget items.

## Data flow

```
tick on an ordinary row  → PATCH /api/budget/:id/paid            → refresh budget items
tick on a provider row   → PATCH /api/installments/provider/:p/paid → refresh plans
                                                                  → installmentsToBudgetItems recomputes monthlyPaid
```

Summary and remaining figures are derived in `BudgetTable` from the rows it
already has — no extra request, no stored total.

## Error handling

A failed write leaves the checkbox as it was and surfaces the API's message
through the page's existing `message.error` path, matching how amount edits
already fail. The provider write is transactional, so it either applies to the
whole group or to none of it — there is no half-ticked outcome to explain.

## Testing

The frontend has no test framework and none is being added; pure helpers are
verified by throwaway esbuild+node scripts, as the previous feature did, and the
UI by running the app. The Go API has no tests either — its endpoints are
verified with `curl` against a local server and a check of the resulting rows.

Verification list:

1. Ticking an ordinary expense persists across a reload.
2. Ticking an income row persists and moves the actual figure on the remaining
   row.
3. A provider row with no instalments paid, ticked once, marks them all paid, and
   the installments page agrees.
4. A provider row with some paid shows indeterminate; ticking it settles the
   rest.
5. A fully paid provider row, ticked again, unpays every instalment.
6. Summary cells show `paid / total` and follow each tick.
7. `เงินคงเหลือ` shows `actual / planned`, where actual counts only ticked rows.
8. Another user's plans cannot be reached through the provider endpoint.
