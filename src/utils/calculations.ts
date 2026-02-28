import type { InstallmentPlan, BudgetItem, PersonDebt, MonthBE, MonthSummary, Baht } from '@/types';
import { MONTHS_BE } from '@/types';

export function calculateInstallmentProgress(plan: InstallmentPlan): number {
  if (!plan.installments.length) {
    if (plan.totalInstallments === null) return 0;
    return plan.isClosed ? 100 : 0;
  }
  const paid = plan.installments.filter((i) => i.status === 'paid').length;
  const total = plan.installments.length;
  return Math.round((paid / total) * 100);
}

export function calculateInstallmentRemaining(plan: InstallmentPlan): Baht {
  const paid = plan.installments
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0);
  return plan.totalAmount - paid;
}

export function calculateProviderTotal(plans: InstallmentPlan[]): Baht {
  return plans.reduce((sum, p) => sum + calculateInstallmentRemaining(p), 0);
}

export function calculateMonthSummaries(items: BudgetItem[]): MonthSummary[] {
  return MONTHS_BE.map((month) => {
    const totalIncome = items
      .filter((i) => i.category === 'income')
      .reduce((s, i) => s + (i.monthlyValues[month] || 0), 0);
    const totalFixedExpense = items
      .filter((i) => i.category === 'fixedExpense')
      .reduce((s, i) => s + (i.monthlyValues[month] || 0), 0);
    const totalVariableExpense = items
      .filter((i) => i.category === 'variableExpense')
      .reduce((s, i) => s + (i.monthlyValues[month] || 0), 0);
    return {
      month,
      totalIncome,
      totalFixedExpense,
      totalVariableExpense,
      remaining: totalIncome - totalFixedExpense - totalVariableExpense,
    };
  });
}

export function calculateDebtProgress(debt: PersonDebt): number {
  if (debt.totalAmount === 0) return 100;
  return Math.round((debt.paidAmount / debt.totalAmount) * 100);
}

export function sumByMonth(items: BudgetItem[], category: BudgetItem['category'], month: MonthBE): Baht {
  return items
    .filter((i) => i.category === category)
    .reduce((s, i) => s + (i.monthlyValues[month] || 0), 0);
}
