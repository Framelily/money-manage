import { useMemo, useState } from 'react';
import { Typography, Button, Select, Checkbox, App } from 'antd';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useBudget } from '@/hooks/useBudget';
import { useInstallments } from '@/hooks/useInstallments';
import { BudgetTable } from '@/components/budget/BudgetTable';
import { BudgetItemForm, type BudgetFormResult } from '@/components/budget/BudgetItemForm';
import { BudgetChart } from '@/components/budget/BudgetChart';
import { type BudgetItem, type MonthBE, MONTHS_BE } from '@/types';
import { installmentsToBudgetItems } from '@/utils/installmentBudget';
import { getVisibleMonths } from '@/utils/date';

const CURRENT_YEAR_BE = new Date().getFullYear() + 543;
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => {
  const y = CURRENT_YEAR_BE - 2 + i;
  return { value: y, label: `${y}` };
});

export function BudgetPage() {
  const { message } = App.useApp();
  const { items, loading, year, setYear, create, update, updateMonthlyValue, setMonthlyPaid, remove } = useBudget();
  const { plans, setProviderPaid } = useInstallments();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | undefined>();
  const [showPastMonths, setShowPastMonths] = useState(false);
  const isCurrentYear = year === CURRENT_YEAR_BE;

  const months = useMemo(
    () => getVisibleMonths(year, showPastMonths),
    [year, showPastMonths],
  );

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

  const handlePaidChange = async (item: BudgetItem, month: MonthBE, paid: boolean) => {
    try {
      if (item.id.startsWith('installment-')) {
        const provider = item.id.slice('installment-'.length);
        await setProviderPaid(provider, MONTHS_BE.indexOf(month), year, paid);
      } else {
        await setMonthlyPaid(item.id, month, paid);
      }
    } catch {
      message.error('บันทึกสถานะจ่ายไม่สำเร็จ');
    }
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
        <div className="flex items-center gap-3 flex-wrap">
          <Typography.Title level={4} style={{ margin: 0 }}>งบรายเดือน</Typography.Title>
          <Select
            value={year}
            onChange={setYear}
            options={YEAR_OPTIONS}
            style={{ width: 100 }}
          />
          {isCurrentYear && (
            <Checkbox
              checked={showPastMonths}
              onChange={(e) => setShowPastMonths(e.target.checked)}
            >
              แสดงเดือนที่ผ่านมา
            </Checkbox>
          )}
        </div>
        <Button type="primary" icon={<PlusIcon className="w-4 h-4" />} onClick={() => { setEditing(undefined); setFormOpen(true); }} block className="sm:!w-auto">
          เพิ่มรายการ
        </Button>
      </div>
      <BudgetTable items={allItems} months={months} loading={loading} onEdit={handleEdit} onDelete={handleDelete} onCellChange={updateMonthlyValue} onPaidChange={handlePaidChange} />
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
