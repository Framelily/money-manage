import { useMemo } from 'react';
import { Typography } from 'antd';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { DebtStatusChart } from '@/components/dashboard/DebtStatusChart';
import { useBudget } from '@/hooks/useBudget';
import { useInstallments } from '@/hooks/useInstallments';
import { useDebts } from '@/hooks/useDebts';
import { installmentsToBudgetItems } from '@/utils/installmentBudget';

export function DashboardPage() {
  const { items: budgetItems, loading: budgetLoading, year } = useBudget();
  const { plans, loading: installmentsLoading } = useInstallments();
  const { debts, loading: debtsLoading } = useDebts();
  const loading = budgetLoading || installmentsLoading || debtsLoading;

  const allBudgetItems = useMemo(
    () => [...budgetItems, ...installmentsToBudgetItems(plans, year)],
    [budgetItems, plans, year],
  );

  return (
    <div className="flex flex-col gap-6">
      <Typography.Title level={3}>แดชบอร์ด</Typography.Title>
      <SummaryCards budgetItems={allBudgetItems} plans={plans} debts={debts} loading={loading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncomeExpenseChart budgetItems={allBudgetItems} loading={loading} />
        <DebtStatusChart plans={plans} loading={loading} />
      </div>
    </div>
  );
}
