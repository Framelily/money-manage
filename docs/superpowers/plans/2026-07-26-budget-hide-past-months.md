# Budget Hide Past Months Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/budget`, the current year's table opens at the current month, with past months hidden behind a toggle.

**Architecture:** A pure helper in `src/utils/date.ts` decides which months belong on screen. `BudgetPage` owns the toggle state and passes the resulting month list down. `BudgetTable` drops its own `MONTHS_BE` import and renders whatever month list it is handed, so it knows nothing about years or "now".

**Tech Stack:** React 19 + TypeScript, Vite, Ant Design (`Table`, `Checkbox`, `Select`), path alias `@/` → `src/`.

**Spec:** `docs/superpowers/specs/2026-07-26-budget-hide-past-months-design.md`

## Global Constraints

- All UI text is Thai. Code identifiers, comments and commit messages are English.
- `MONTHS_BE` (in `src/types/common.ts`) is ordered ม.ค. first, so its indices match `Date.prototype.getMonth()`.
- Buddhist-era year = Gregorian year + 543. The current BE year is `new Date().getFullYear() + 543`.
- The chart (`BudgetChart`) always plots all 12 months. Do not touch it.
- No backend, API, service or hook changes. Hidden months are still fetched and still stored.
- The project has no test framework. Verification for the pure helper is a throwaway esbuild+node script run from the scratchpad — do not add a test runner and do not commit the script. Component behaviour is verified by running the app.

---

### Task 1: `getVisibleMonths` helper

The one piece of logic in this feature. Pure function, no React.

**Files:**
- Modify: `src/utils/date.ts` (append; the file currently ends at `todayBE()` on line 21)
- Test: throwaway script at `<scratchpad>/verify-visible-months.ts` (not committed)

**Interfaces:**
- Consumes: `MONTHS_BE` and `MonthBE` from `@/types`.
- Produces: `getVisibleMonths(yearBE: number, showPast: boolean): MonthBE[]` — used by Task 3.

- [ ] **Step 1: Write the failing test**

`src/utils/date.ts` currently imports only `dayjs`. The script below imports the helper through the `@/` alias, exactly as application code will.

Write `<scratchpad>/verify-visible-months.ts`:

```ts
import { getVisibleMonths } from '@/utils/date';
import { MONTHS_BE } from '@/types';

const CURRENT_BE = new Date().getFullYear() + 543;
const CURRENT_MONTH_INDEX = new Date().getMonth();

const cases: Array<{ name: string; actual: string[]; expected: string[] }> = [
  {
    name: 'past year shows all 12 months',
    actual: getVisibleMonths(CURRENT_BE - 1, false),
    expected: MONTHS_BE,
  },
  {
    name: 'future year shows all 12 months',
    actual: getVisibleMonths(CURRENT_BE + 1, false),
    expected: MONTHS_BE,
  },
  {
    name: 'current year starts at the current month',
    actual: getVisibleMonths(CURRENT_BE, false),
    expected: MONTHS_BE.slice(CURRENT_MONTH_INDEX),
  },
  {
    name: 'current month is not hidden',
    actual: [getVisibleMonths(CURRENT_BE, false)[0]],
    expected: [MONTHS_BE[CURRENT_MONTH_INDEX]],
  },
  {
    name: 'showPast overrides hiding on the current year',
    actual: getVisibleMonths(CURRENT_BE, true),
    expected: MONTHS_BE,
  },
];

let failed = 0;
for (const c of cases) {
  const ok = JSON.stringify(c.actual) === JSON.stringify(c.expected);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  if (!ok) console.log(`   expected ${JSON.stringify(c.expected)}\n   actual   ${JSON.stringify(c.actual)}`);
}
console.log(failed === 0 ? 'ALL PASS' : `${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
```

- [ ] **Step 2: Run test to verify it fails**

Run from the `money-manage/` directory (`$S` is the scratchpad path):

```bash
npx esbuild $S/verify-visible-months.ts --bundle --platform=node --format=esm \
  --outfile=./node_modules/.verify-visible-months.mjs --alias:@=./src --log-level=error \
  && node ./node_modules/.verify-visible-months.mjs
```

Expected: esbuild fails with `No matching export in "src/utils/date.ts" for import "getVisibleMonths"`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/utils/date.ts`, and add `MONTHS_BE` / `MonthBE` to its imports:

```ts
import { MONTHS_BE, type MonthBE } from '@/types';
```

```ts
export function getVisibleMonths(yearBE: number, showPast: boolean): MonthBE[] {
  const now = new Date();
  const isCurrentYear = yearBE === toBuddhistYear(now.getFullYear());
  if (showPast || !isCurrentYear) return MONTHS_BE;
  // MONTHS_BE is ordered ม.ค. first, so its indices match Date#getMonth().
  // Slicing at the current index keeps the current month visible.
  return MONTHS_BE.slice(now.getMonth());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run the same command as Step 2.
Expected: five `PASS` lines then `ALL PASS`, exit code 0.

- [ ] **Step 5: Typecheck and clean up**

```bash
npx tsc -b && rm -f ./node_modules/.verify-visible-months.mjs
```

Expected: no output from `tsc`, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add src/utils/date.ts
git commit -m "feat: add getVisibleMonths helper for budget month filtering"
```

---

### Task 2: `BudgetTable` renders a supplied month list

A pure refactor. `BudgetPage` passes all 12 months, so the page looks exactly the same afterwards. This isolates the prop change from the behaviour change in Task 3.

**Files:**
- Modify: `src/components/budget/BudgetTable.tsx` (imports on lines 4-5, `Props` on lines 8-14, `BudgetTable` body on lines 65-192)
- Modify: `src/pages/BudgetPage.tsx:68` (the `<BudgetTable>` call)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `BudgetTable` gains a required prop `months: MonthBE[]`. Task 3 supplies it from `getVisibleMonths`.

- [ ] **Step 1: Add the `months` prop and stop importing `MONTHS_BE`**

In `src/components/budget/BudgetTable.tsx`, line 5 is `import { MONTHS_BE } from '@/types';` — delete that line. `MonthBE` stays in the type import on line 4.

Add `months` to `Props`:

```ts
interface Props {
  items: BudgetItem[];
  months: MonthBE[];
  loading: boolean;
  onEdit: (item: BudgetItem) => void;
  onDelete: (id: string) => void;
  onCellChange: (id: string, month: MonthBE, value: Baht) => void;
}
```

And to the signature on line 65:

```ts
export function BudgetTable({ items, months, loading, onEdit, onDelete, onCellChange }: Props) {
```

- [ ] **Step 2: Iterate `months` instead of `MONTHS_BE`**

Three places in the component body. Replace each `MONTHS_BE` with `months`.

Category summary rows (was line 86):

```ts
    const summary: Record<MonthBE, number> = {} as Record<MonthBE, number>;
    months.forEach((m) => {
      summary[m] = catItems.reduce((s, i) => s + (i.monthlyValues[m] || 0), 0);
    });
```

Remaining row (was line 101):

```ts
  const remaining: Record<MonthBE, number> = {} as Record<MonthBE, number>;
  months.forEach((m) => {
```

Month columns (was line 138):

```ts
    ...months.map((month) => ({
```

Each column's total is summed independently per month, so a shorter list changes no numbers.

- [ ] **Step 3: Size the horizontal scroll from the column count**

The column widths are currently written inline in three places. Hoist them to named constants directly above the `columns` array (was line 116) so the scroll width and the columns cannot drift apart:

```ts
  const nameColWidth = isMobile ? 130 : 200;
  const monthColWidth = isMobile ? 100 : 120;
  const actionsColWidth = isMobile ? 64 : 80;
  const scrollX = nameColWidth + months.length * monthColWidth + actionsColWidth;
```

Then use them in the three column definitions, replacing the inline expressions:

- name column `width: isMobile ? 130 : 200` → `width: nameColWidth`
- month column `width: isMobile ? 100 : 120` → `width: monthColWidth`
- actions column `width: isMobile ? 64 : 80` → `width: actionsColWidth`

And replace the hard-coded scroll on line 183:

```tsx
      scroll={{ x: scrollX }}
```

Note the intended side effect: the old constants (1100 mobile / 1400 desktop) were smaller than the declared widths add up to, which squeezed the columns. With 12 months the table is now 1394 / 1720 wide, so columns render at the width they declare. This is what the spec asked for — columns honour their declared widths in every case.

- [ ] **Step 4: Keep `BudgetPage` compiling**

`BudgetTable` now requires `months`, so `src/pages/BudgetPage.tsx:68` fails to typecheck. Pass all 12 months for now — behaviour is unchanged in this task.

Add `MONTHS_BE` to the existing type import on line 9:

```ts
import { type BudgetItem, MONTHS_BE } from '@/types';
```

And on line 68:

```tsx
      <BudgetTable items={allItems} months={MONTHS_BE} loading={loading} onEdit={handleEdit} onDelete={handleDelete} onCellChange={updateMonthlyValue} />
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc -b
```

Expected: no output, exit code 0.

- [ ] **Step 6: Verify nothing changed visually**

With the dev server running (`npm run dev`), open http://localhost:5173/budget and confirm: all 12 month columns present, cells still editable, summary and เงินคงเหลือ rows show the same figures as before, horizontal scroll reaches ธ.ค.

- [ ] **Step 7: Commit**

```bash
git add src/components/budget/BudgetTable.tsx src/pages/BudgetPage.tsx
git commit -m "refactor: pass budget month columns into BudgetTable"
```

---

### Task 3: Toggle past months on `BudgetPage`

Where the feature becomes visible.

**Files:**
- Modify: `src/pages/BudgetPage.tsx` (imports lines 1-10, component body lines 18-77)

**Interfaces:**
- Consumes: `getVisibleMonths(yearBE, showPast)` from Task 1; the `months` prop from Task 2.
- Produces: nothing downstream.

- [ ] **Step 1: Add the toggle state and derived month list**

In `src/pages/BudgetPage.tsx`, add `Checkbox` to the antd import on line 2:

```ts
import { Typography, Button, Select, Checkbox, App } from 'antd';
```

Add the helper import below the existing `installmentBudget` import (line 10):

```ts
import { getVisibleMonths } from '@/utils/date';
```

`MONTHS_BE` is no longer referenced once Step 2 lands, so revert line 9 to:

```ts
import type { BudgetItem } from '@/types';
```

Then, after the `editing` state (line 23):

```ts
  const [showPastMonths, setShowPastMonths] = useState(false);
  const isCurrentYear = year === CURRENT_YEAR_BE;

  const months = useMemo(
    () => getVisibleMonths(year, showPastMonths),
    [year, showPastMonths],
  );
```

`CURRENT_YEAR_BE` is already defined at line 12. Changing the year deliberately does not reset `showPastMonths` — the spec keeps the user's last choice when they return to the current year.

- [ ] **Step 2: Render the checkbox next to the year select**

Replace the header's left-hand group (lines 55-63) so the checkbox sits with the year select. It renders only on the current year, where it has an effect:

```tsx
        <div className="flex items-center gap-3">
          <Typography.Title level={4} style={{ margin: 0 }}>งบรายเดือน</Typography.Title>
          <Select
            value={year}
            onChange={setYear}
            options={YEAR_OPTIONS}
            style={{ width: 100 }}
          />
          {isCurrentYear && (
            <Checkbox
              checked={showPastMonths}
              onChange={(e) => setShowPastMonths(e.target.checked)}
            >
              แสดงเดือนที่ผ่านมา
            </Checkbox>
          )}
        </div>
```

- [ ] **Step 3: Feed the derived months to the table**

Replace the `months={MONTHS_BE}` placeholder from Task 2 (line 68):

```tsx
      <BudgetTable items={allItems} months={months} loading={loading} onEdit={handleEdit} onDelete={handleDelete} onCellChange={updateMonthlyValue} />
```

Leave `<BudgetChart items={allItems} loading={loading} />` untouched — it plots all 12 months by design.

- [ ] **Step 4: Typecheck**

```bash
npx tsc -b
```

Expected: no output, exit code 0.

- [ ] **Step 5: Verify the behaviour in the app**

At http://localhost:5173/budget, confirm each row of the spec's table:

| Check | Expected |
|---|---|
| Year 2569 (current), checkbox unchecked | First column is the current month; ม.ค. through the previous month absent; last column ธ.ค. |
| Tick "แสดงเดือนที่ผ่านมา" | All 12 columns return, starting at ม.ค. |
| Untick it | Back to the current month onward |
| Switch to 2568 | All 12 columns; checkbox not rendered |
| Switch to 2570 | All 12 columns; checkbox not rendered |
| Back to 2569 with the box previously ticked | All 12 columns still shown, box still ticked |
| Edit a cell in a visible month | Value saves and the summary / เงินคงเหลือ rows update |

- [ ] **Step 6: Commit**

```bash
git add src/pages/BudgetPage.tsx
git commit -m "feat: hide past months on the budget page for the current year"
```

---

## Verification

The spec's verification list, in order:

1. `npx tsc -b` passes — covered by Task 1 Step 5, Task 2 Step 5, Task 3 Step 4.
2. All three year cases behave — Task 3 Step 5.
3. The toggle hides and restores columns — Task 3 Step 5.
4. Editing a visible cell still saves — Task 3 Step 5.
