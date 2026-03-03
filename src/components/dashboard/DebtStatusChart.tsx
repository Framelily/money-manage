import { Card, Skeleton } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { InstallmentPlan, CardProvider } from '@/types';
import { calculateInstallmentRemaining } from '@/utils/calculations';
import { formatNumber } from '@/utils/format';
import { getProviderChartColor, getProviderLabel } from '@/utils/providerConfig';

interface Props {
  plans: InstallmentPlan[];
  loading: boolean;
}

export function DebtStatusChart({ plans, loading }: Props) {
  const activePlans = plans.filter((p) => !p.isClosed);
  const grouped: Record<CardProvider, number> = {};
  const providerColors: Record<CardProvider, string | undefined> = {};
  activePlans.forEach((p) => {
    grouped[p.provider] = (grouped[p.provider] || 0) + calculateInstallmentRemaining(p);
    if (!providerColors[p.provider] && p.providerColor) {
      providerColors[p.provider] = p.providerColor;
    }
  });

  const data = (Object.entries(grouped) as [CardProvider, number][])
    .filter(([, v]) => v > 0)
    .map(([provider, value]) => ({
      name: getProviderLabel(provider),
      provider,
      value: Math.round(value * 100) / 100,
    }));

  return (
    <Card title="หนี้คงค้างแยกตามผู้ให้บริการ">
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
                  fill={getProviderChartColor(entry.provider, providerColors[entry.provider])}
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
