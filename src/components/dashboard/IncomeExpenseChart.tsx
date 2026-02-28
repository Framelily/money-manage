import { Card, Skeleton } from 'antd';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BudgetItem } from '@/types';
import { calculateMonthSummaries } from '@/utils/calculations';
import { formatNumber } from '@/utils/format';

interface Props {
  budgetItems: BudgetItem[];
  loading: boolean;
}

export function IncomeExpenseChart({ budgetItems, loading }: Props) {
  const summaries = calculateMonthSummaries(budgetItems);
  const data = summaries.map((s) => ({
    month: s.month,
    รายรับ: s.totalIncome,
    รายจ่ายรวม: s.totalFixedExpense + s.totalVariableExpense,
    เงินคงเหลือ: s.remaining,
  }));

  return (
    <Card title="รายรับ vs รายจ่ายรายเดือน">
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => `฿${formatNumber(v)}`} />
            <Tooltip formatter={(value: number) => `฿${formatNumber(value)}`} />
            <Legend />
            <Bar dataKey="รายรับ" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="รายจ่ายรวม" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="เงินคงเหลือ" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
