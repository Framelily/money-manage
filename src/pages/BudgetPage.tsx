import { useState } from 'react';
import { Typography, Button, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useBudget } from '@/hooks/useBudget';
import { useInstallments } from '@/hooks/useInstallments';
import { BudgetTable } from '@/components/budget/BudgetTable';
import { BudgetItemForm, type BudgetFormResult } from '@/components/budget/BudgetItemForm';
import { BudgetChart } from '@/components/budget/BudgetChart';
import type { BudgetItem } from '@/types';
import { MONTHS_BE } from '@/types';
import { budgetService } from '@/services/budgetService';

const CURRENT_YEAR_BE = new Date().getFullYear() + 543;
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => {
  const y = CURRENT_YEAR_BE - 2 + i;
  return { value: y, label: `${y}` };
});

export function BudgetPage() {
  const { items, loading, year, setYear, create, update, updateMonthlyValue, remove, refresh } = useBudget();
  const { plans } = useInstallments();
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

  const handleSubmit = async (result: BudgetFormResult) => {
    const { values, selectedPlan, yearlyValues } = result;

    if (editing) {
      await update(editing.id, values);
      message.success('แก้ไขสำเร็จ');
    } else if (selectedPlan && yearlyValues) {
      // สร้าง budget item ครั้งเดียว แล้วเพิ่ม monthlyValues ปีอื่นลง item เดียวกัน
      const years = Object.keys(yearlyValues).map(Number).sort();
      const firstYear = years[0];

      const created = await budgetService.create(
        { name: values.name, category: values.category, monthlyValues: yearlyValues[firstYear] },
        firstYear,
      );

      // เพิ่ม monthlyValues ปีที่เหลือลง item เดียวกัน
      for (let i = 1; i < years.length; i++) {
        const yr = years[i];
        const monthValues = yearlyValues[yr];
        for (const m of MONTHS_BE) {
          if (monthValues[m] > 0) {
            await budgetService.updateMonthlyValue(created.id, m, monthValues[m], yr);
          }
        }
      }

      await refresh();
      message.success(`เพิ่มรายการสำเร็จ (${years.length} ปี)`);
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
        <div className="flex items-center gap-3">
          <Typography.Title level={3} style={{ margin: 0 }}>งบรายเดือน</Typography.Title>
          <Select
            value={year}
            onChange={setYear}
            options={YEAR_OPTIONS}
            style={{ width: 100 }}
          />
        </div>
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
        installmentPlans={plans}
      />
    </div>
  );
}
