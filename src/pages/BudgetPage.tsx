import { useState } from 'react';
import { Typography, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useBudget } from '@/hooks/useBudget';
import { BudgetTable } from '@/components/budget/BudgetTable';
import { BudgetItemForm } from '@/components/budget/BudgetItemForm';
import { BudgetChart } from '@/components/budget/BudgetChart';
import type { BudgetItem } from '@/types';

export function BudgetPage() {
  const { items, loading, create, update, updateMonthlyValue, remove } = useBudget();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | undefined>();

  const handleEdit = (item: BudgetItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    message.success('ลบรายการสำเร็จ');
  };

  const handleSubmit = async (values: Omit<BudgetItem, 'id'>) => {
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
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <Typography.Title level={3} style={{ margin: 0 }}>งบรายเดือน (เม.ย. - ธ.ค. 69)</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          เพิ่มรายการ
        </Button>
      </div>
      <BudgetTable items={items} loading={loading} onEdit={handleEdit} onDelete={handleDelete} onCellChange={updateMonthlyValue} />
      <BudgetChart items={items} loading={loading} />
      <BudgetItemForm
        open={formOpen}
        onCancel={() => { setFormOpen(false); setEditing(undefined); }}
        onSubmit={handleSubmit}
        initialValues={editing}
      />
    </div>
  );
}
