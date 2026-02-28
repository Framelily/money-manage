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
  items: BudgetItem[];
  loading: boolean;
}

export function BudgetChart({ items, loading }: Props) {
  const summaries = calculateMonthSummaries(items);
  const data = summaries.map((s) => ({
    month: s.month,
    รายรับ: s.totalIncome,
    รายจ่ายประจำ: s.totalFixedExpense,
    รายจ่ายผันแปร: s.totalVariableExpense,
    เงินคงเหลือ: s.remaining,
  }));

  return (
    <Card title="กราฟรายรับรายจ่ายรายเดือน">
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => `฿${formatNumber(v)}`} />
            <Tooltip formatter={(value: number) => `฿${formatNumber(value)}`} />
            <Legend />
            <Bar dataKey="รายรับ" fill="#10b981" radius={[4, 4, 0, 0]} stackId="expenses" />
            <Bar dataKey="รายจ่ายประจำ" fill="#ef4444" radius={[0, 0, 0, 0]} />
            <Bar dataKey="รายจ่ายผันแปร" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="เงินคงเหลือ" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
