import type { BudgetItem, InstallmentPlan, MonthBE } from '@/types';
import { MONTHS_BE } from '@/types';

/** รวมรายการผ่อนชำระตาม provider เป็น BudgetItem (variableExpense) สำหรับปีที่ระบุ */
export function installmentsToBudgetItems(plans: InstallmentPlan[], year: number): BudgetItem[] {
  const grouped = new Map<string, Record<MonthBE, number>>();

  plans
    .filter((p) => !p.isClosed)
    .forEach((plan) => {
      if (!grouped.has(plan.provider)) {
        const empty = {} as Record<MonthBE, number>;
        MONTHS_BE.forEach((m) => { empty[m] = 0; });
        grouped.set(plan.provider, empty);
      }
      const values = grouped.get(plan.provider)!;
      plan.installments
        .filter((inst) => inst.year === year)
        .forEach((inst) => {
          const monthKey = MONTHS_BE[inst.month];
          if (monthKey) values[monthKey] += inst.amount;
        });
    });

  return [...grouped.entries()]
    .filter(([, values]) => MONTHS_BE.some((m) => values[m] > 0))
    .map(([provider, monthlyValues]) => ({
      id: `installment-${provider}`,
      name: provider,
      category: 'variableExpense' as const,
      monthlyValues,
    }));
}
