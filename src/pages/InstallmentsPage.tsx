import { useMemo, useState } from 'react';
import { Typography, Button, App } from 'antd';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useInstallments } from '@/hooks/useInstallments';
import { ProviderGroup } from '@/components/installments/ProviderGroup';
import { InstallmentForm, type InstallmentFormResult } from '@/components/installments/InstallmentForm';
import { buildProviderColorMap } from '@/utils/providerConfig';
import type { InstallmentPlan } from '@/types';

export function InstallmentsPage() {
  const { message } = App.useApp();
  const { plans, loading, create, update, remove, toggleInstallment } = useInstallments();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InstallmentPlan | undefined>();

  const providers = useMemo(() => [...new Set(plans.map((p) => p.provider))], [plans]);
  const providerColorMap = useMemo(() => buildProviderColorMap(plans), [plans]);

  const handleEdit = (plan: InstallmentPlan) => {
    setEditing(plan);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    message.success('ลบรายการสำเร็จ');
  };

  const handleSubmit = async (values: InstallmentFormResult) => {
    if (editing) {
      const { installments: _, ...planValues } = values;
      await update(editing.id, planValues);
      message.success('แก้ไขสำเร็จ');
    } else {
      await create(values);
      message.success('เพิ่มรายการสำเร็จ');
    }
    setFormOpen(false);
    setEditing(undefined);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <Typography.Title level={4} style={{ margin: 0 }}>หนี้ผ่อนชำระ</Typography.Title>
        <Button type="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={() => { setEditing(undefined); setFormOpen(true); }} block className="sm:!w-auto">
          เพิ่มรายการ
        </Button>
      </div>
      {providers.map((provider) => (
        <ProviderGroup
          key={provider}
          provider={provider}
          plans={plans.filter((p) => p.provider === provider)}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleInstallment={toggleInstallment}
        />
      ))}
      <InstallmentForm
        open={formOpen}
        onCancel={() => { setFormOpen(false); setEditing(undefined); }}
        onSubmit={handleSubmit}
        initialValues={editing}
        existingProviders={providers}
        providerColorMap={providerColorMap}
      />
    </div>
  );
}
