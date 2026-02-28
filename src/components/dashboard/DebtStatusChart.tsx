import { Card, Skeleton } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { InstallmentPlan, CardProvider } from '@/types';
import { calculateInstallmentRemaining } from '@/utils/calculations';
import { formatNumber } from '@/utils/format';

interface Props {
  plans: InstallmentPlan[];
  loading: boolean;
}

const PROVIDER_COLORS: Record<CardProvider, string> = {
  KTC: '#ef4444',
  UOB: '#3b82f6',
  SHOPEE: '#f97316',
};

export function DebtStatusChart({ plans, loading }: Props) {
  const grouped: Record<CardProvider, number> = { KTC: 0, UOB: 0, SHOPEE: 0 };
  plans.forEach((p) => {
    grouped[p.provider] += calculateInstallmentRemaining(p);
  });

  const data = (Object.entries(grouped) as [CardProvider, number][])
    .filter(([, v]) => v > 0)
    .map(([provider, value]) => ({
      name: provider,
      value: Math.round(value * 100) / 100,
    }));

  return (
    <Card title="หนี้คงค้างแยกตาม Provider">
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name, value }) => `${name}: ฿${formatNumber(value)}`}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={PROVIDER_COLORS[entry.name as CardProvider]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `฿${formatNumber(value)}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
