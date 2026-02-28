import { useState } from 'react';
import { Typography, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useInstallments } from '@/hooks/useInstallments';
import { ProviderGroup } from '@/components/installments/ProviderGroup';
import { InstallmentForm, type InstallmentFormResult } from '@/components/installments/InstallmentForm';
import type { InstallmentPlan, CardProvider } from '@/types';

const PROVIDERS: CardProvider[] = ['KTC', 'UOB', 'SHOPEE'];

export function InstallmentsPage() {
  const { plans, loading, create, update, remove, toggleInstallment } = useInstallments();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InstallmentPlan | undefined>();

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
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <Typography.Title level={3} style={{ margin: 0 }}>หนี้ผ่อนชำระ</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          เพิ่มรายการ
        </Button>
      </div>
      {PROVIDERS.map((provider) => (
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
      />
    </div>
  );
}
