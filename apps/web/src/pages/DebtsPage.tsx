import { useState } from 'react';
import { Typography, Button, App } from 'antd';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useDebts } from '@/hooks/useDebts';
import { DebtCard } from '@/components/debts/DebtCard';
import { DebtForm } from '@/components/debts/DebtForm';
import type { PersonDebt } from '@/types';

export function DebtsPage() {
  const { message } = App.useApp();
  const { debts, loading, create, update, remove, recordPayment } = useDebts();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PersonDebt | undefined>();

  const handleEdit = (debt: PersonDebt) => {
    setEditing(debt);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    message.success('ลบรายการสำเร็จ');
  };

  const handleSubmit = async (values: Omit<PersonDebt, 'id' | 'payments' | 'lastUpdated' | 'status'>) => {
    if (editing) {
      await update(editing.id, values);
      message.success('แก้ไขสำเร็จ');
    } else {
      await create(values);
      message.success('เพิ่มรายการสำเร็จ');
    }
    setFormOpen(false);
    setEditing(undefined);
  };

  const handleRecordPayment = async (debtId: string, amount: number, note?: string) => {
    await recordPayment(debtId, amount, note);
    message.success('บันทึกการจ่ายเงินสำเร็จ');
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <Typography.Title level={4} style={{ margin: 0 }}>คนที่เป็นหนี้เรา</Typography.Title>
        <Button type="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={() => { setEditing(undefined); setFormOpen(true); }} block className="sm:!w-auto">
          เพิ่มรายการ
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse h-48" style={{ border: '1px solid #E5E7EB' }} />
            ))
          : debts.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRecordPayment={handleRecordPayment}
              />
            ))}
      </div>
      <DebtForm
        open={formOpen}
        onCancel={() => { setFormOpen(false); setEditing(undefined); }}
        onSubmit={handleSubmit}
        initialValues={editing}
      />
    </div>
  );
}
