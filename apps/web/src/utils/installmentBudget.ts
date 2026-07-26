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
