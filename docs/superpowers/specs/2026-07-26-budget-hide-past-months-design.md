# Budget page: hide past months

Date: 2026-07-26
Status: approved

## Problem

`/budget` renders all 12 months of the selected year as editable columns. For the
current year, months that have already passed take up horizontal space and push
the months the user actually works with off-screen — on mobile the table starts
at ม.ค. no matter what month it is.

## Goal

For the current year, the table opens on the current month. Past months are
hidden but reachable through a toggle.

## Scope

In scope: month column visibility in `BudgetTable`, and the control that drives
it.

Out of scope: the chart (`BudgetChart` always plots all 12 months so the year
stays comparable at a glance), any backend or API change, persisting the toggle
between visits.

## Behaviour

| Selected year | Columns shown |
|---|---|
| Past year (e.g. 2568) | all 12 |
| Current year (2569) | current month through ธ.ค. |
| Future year (e.g. 2570) | all 12 |

The current month is always visible — it is not treated as past.

The toggle "แสดงเดือนที่ผ่านมา" restores all 12 columns. It is unchecked by
default and rendered only when the current year is selected, since it has no
effect otherwise.

Hidden months are hidden from view only. Their values are still fetched and
still stored; nothing is cleared or made read-only.

Changing the year does not reset the toggle. Switching to a past year hides the
checkbox but keeps its value, so returning to the current year restores whatever
the user last chose.

## Design

Three units, each with one job.

### `getVisibleMonths(yearBE, showPast)` — `src/utils/date.ts`

```ts
getVisibleMonths(yearBE: number, showPast: boolean): MonthBE[]
```

Decides which months belong on screen. Returns `MONTHS_BE` unchanged when
`showPast` is true or when `yearBE` differs from the current Buddhist-era year
(`new Date().getFullYear() + 543`).
Otherwise returns `MONTHS_BE.slice(new Date().getMonth())` — `MONTHS_BE` is
ordered ม.ค. first, so its indices line up with `Date.prototype.getMonth()`,
and slicing at the current index keeps the current month.

Pure function: number and boolean in, array out. No DOM, no state.

### `BudgetPage` — owns the state

Holds `showPastMonths` (default `false`) and derives:

```ts
const months = useMemo(
  () => getVisibleMonths(year, showPastMonths),
  [year, showPastMonths],
);
```

Renders the checkbox next to the existing year `Select`, so both controls that
scope the table sit together. The checkbox is omitted unless `year` is the
current year. `months` is passed to `BudgetTable`. `BudgetChart` keeps its
current props.

### `BudgetTable` — renders what it is given

Takes a new required prop `months: MonthBE[]` and stops importing `MONTHS_BE`.
Month columns, the per-category summary rows and the remaining row all iterate
`months`. Each column's total is computed independently per month, so a shorter
list changes nothing about the numbers.

`scroll.x` is currently the constant 1100 (mobile) / 1400 (desktop), sized for
12 columns. With fewer columns that leaves dead space to the right, so it
becomes a computed width: name column + `months.length` × month column +
actions column, using the same widths the columns already declare.

The component no longer knows about years or "now" — it renders whatever month
list it receives.

## Data flow

```
year, showPastMonths → getVisibleMonths() → months → BudgetTable columns
```

No new network calls. The API still returns every month for the selected year.

## Error handling

No new failure modes. `getVisibleMonths` always returns a non-empty array; the
narrowest case is December, where a single column remains — which is the
specified behaviour, not an error.

## Verification

The project has no test framework, so this is checked by:

1. `tsc -b` passes.
2. Running the app and confirming all three year cases from the table above.
3. Toggling "แสดงเดือนที่ผ่านมา" restores the hidden columns and hides them
   again.
4. Editing a cell in a visible month still saves.
