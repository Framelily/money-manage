import { Collapse, Tag, Skeleton } from 'antd';
import type { InstallmentPlan, CardProvider } from '@/types';
import { calculateProviderTotal } from '@/utils/calculations';
import { formatBaht } from '@/utils/format';
import { InstallmentCard } from './InstallmentCard';
import { InstallmentTable } from './InstallmentTable';

interface Props {
  provider: CardProvider;
  plans: InstallmentPlan[];
  loading: boolean;
  onEdit: (plan: InstallmentPlan) => void;
  onDelete: (id: string) => void;
  onToggleInstallment: (planId: string, installmentId: string) => void;
}

const PROVIDER_COLORS: Record<CardProvider, string> = {
  KTC: 'red',
  UOB: 'blue',
  SHOPEE: 'orange',
};

const PROVIDER_LABELS: Record<CardProvider, string> = {
  KTC: 'KTC',
  UOB: 'UOB',
  SHOPEE: 'Shopee PayLater',
};

export function ProviderGroup({ provider, plans, loading, onEdit, onDelete, onToggleInstallment }: Props) {
  if (loading) return <Skeleton active paragraph={{ rows: 3 }} />;
  if (!plans.length) return null;

  const total = calculateProviderTotal(plans);

  return (
    <Collapse
      defaultActiveKey={[provider]}
      items={[
        {
          key: provider,
          label: (
            <div className="flex items-center gap-2">
              <Tag color={PROVIDER_COLORS[provider]}>{PROVIDER_LABELS[provider]}</Tag>
              <span className="text-sm text-gray-500">คงเหลือ {formatBaht(total)}</span>
            </div>
          ),
          children: (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plans.map((plan) => (
                  <InstallmentCard key={plan.id} plan={plan} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
              {plans.map((plan) =>
                plan.installments.length > 0 ? (
                  <div key={plan.id}>
                    <p className="text-sm font-medium mb-2">{plan.name} — รายละเอียดงวด</p>
                    <InstallmentTable plan={plan} onToggle={onToggleInstallment} />
                  </div>
                ) : null
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
