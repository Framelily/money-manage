import { Card, Skeleton } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { BudgetItem, MonthBE } from '@/types';
import { MONTHS_BE } from '@/types';
import { calculateMonthSummaries } from '@/utils/calculations';
import { installmentsToBudgetItems } from '@/utils/installmentBudget';
import { formatNumber } from '@/utils/format';
import type { InstallmentPlan } from '@/types';
import type { PayoffResult } from '@/utils/payoffCalculator';

interface Props {
  budgetItems: BudgetItem[];
  plans: InstallmentPlan[];
  result: PayoffResult;
  year: number;
  loading?: boolean;
}

export function PayoffChart({ budgetItems, plans, result, year, loading }: Props) {
  const installmentBudget = installmentsToBudgetItems(plans, year);
  const allItemsBefore = [...budgetItems, ...installmentBudget];
  const summariesBefore = calculateMonthSummaries(allItemsBefore);

  const data = MONTHS_BE.map((month: MonthBE, idx) => {
    const before = summariesBefore[idx]?.remaining ?? 0;
    const saving = result.monthlySavings[month] ?? 0;
    const after = before + saving;

    return {
      month,
      'ก่อนปิดหนี้': Math.round(before * 100) / 100,
      'หลังปิดหนี้': Math.round(after * 100) / 100,
    };
  });

  return (
    <Card title={`เปรียบเทียบเงินคงเหลือ: ก่อน vs หลังปิดหนี้ (${year})`}>
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => `฿${formatNumber(v)}`} />
            <Tooltip formatter={(value: number) => `฿${formatNumber(value)}`} />
            <Legend />
            <ReferenceLine y={0} stroke="#999" />
            <Bar dataKey="ก่อนปิดหนี้" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="หลังปิดหนี้" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
