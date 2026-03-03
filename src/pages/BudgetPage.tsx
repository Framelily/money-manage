import { useMemo, useState } from 'react';
import { Typography, Button, Select, App } from 'antd';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useBudget } from '@/hooks/useBudget';
import { useInstallments } from '@/hooks/useInstallments';
import { BudgetTable } from '@/components/budget/BudgetTable';
import { BudgetItemForm, type BudgetFormResult } from '@/components/budget/BudgetItemForm';
import { BudgetChart } from '@/components/budget/BudgetChart';
import type { BudgetItem } from '@/types';
import { installmentsToBudgetItems } from '@/utils/installmentBudget';

const CURRENT_YEAR_BE = new Date().getFullYear() + 543;
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => {
  const y = CURRENT_YEAR_BE - 2 + i;
  return { value: y, label: `${y}` };
});

export function BudgetPage() {
  const { message } = App.useApp();
  const { items, loading, year, setYear, create, update, updateMonthlyValue, remove } = useBudget();
  const { plans } = useInstallments();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | undefined>();

  const installmentItems = useMemo(() => installmentsToBudgetItems(plans, year), [plans, year]);

  const allItems = useMemo(() => [...items, ...installmentItems], [items, installmentItems]);

  const handleEdit = (item: BudgetItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    message.success('ลบรายการสำเร็จ');
  };

  const handleSubmit = async (result: BudgetFormResult) => {
    const { values } = result;
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

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Typography.Title level={4} style={{ margin: 0 }}>งบรายเดือน</Typography.Title>
          <Select
            value={year}
            onChange={setYear}
            options={YEAR_OPTIONS}
            style={{ width: 100 }}
          />
        </div>
        <Button type="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={() => { setEditing(undefined); setFormOpen(true); }} block className="sm:!w-auto">
          เพิ่มรายการ
        </Button>
      </div>
      <BudgetTable items={allItems} loading={loading} onEdit={handleEdit} onDelete={handleDelete} onCellChange={updateMonthlyValue} />
      <BudgetChart items={allItems} loading={loading} />
      <BudgetItemForm
        open={formOpen}
        onCancel={() => { setFormOpen(false); setEditing(undefined); }}
        onSubmit={handleSubmit}
        initialValues={editing}
      />
    </div>
  );
}
