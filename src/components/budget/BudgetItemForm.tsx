import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Tabs } from 'antd';
import type { BudgetItem, BudgetCategory, MonthBE, InstallmentPlan } from '@/types';
import { MONTHS_BE } from '@/types';
import { budgetService } from '@/services/budgetService';

type YearlyValues = Record<number, Record<MonthBE, number>>;

export interface BudgetFormResult {
  values: Omit<BudgetItem, 'id'>;
  selectedPlan?: InstallmentPlan;
  yearlyValues?: YearlyValues;
}

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (result: BudgetFormResult) => void;
  initialValues?: BudgetItem;
  installmentPlans?: InstallmentPlan[];
}

function emptyMonths(): Record<MonthBE, number> {
  const v = {} as Record<MonthBE, number>;
  MONTHS_BE.forEach((m) => { v[m] = 0; });
  return v;
}

export function BudgetItemForm({ open, onCancel, onSubmit, initialValues, installmentPlans = [] }: Props) {
  const [form] = Form.useForm();
  const category = Form.useWatch('category', form);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | undefined>();
  const [yearlyValues, setYearlyValues] = useState<YearlyValues>({});
  const [activeTab, setActiveTab] = useState<string>('');

  const planYears = Object.keys(yearlyValues).map(Number).sort();
  const hasPlanTabs = !!selectedPlan && planYears.length > 0;

  useEffect(() => {
    if (open) {
      setSelectedPlan(undefined);
      setYearlyValues({});
      setActiveTab('');
      if (initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          category: initialValues.category,
          ...MONTHS_BE.reduce((acc, m) => ({ ...acc, [m]: initialValues.monthlyValues[m] || 0 }), {}),
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const handleSelectPlan = (planId: string) => {
    const plan = installmentPlans.find((p) => p.id === planId);
    if (!plan) {
      setSelectedPlan(undefined);
      setYearlyValues({});
      setActiveTab('');
      return;
    }
    setSelectedPlan(plan);

    const grouped: YearlyValues = {};
    plan.installments.forEach((inst) => {
      if (!inst.year || inst.year <= 0) return;
      if (!grouped[inst.year]) grouped[inst.year] = emptyMonths();
      const monthKey = MONTHS_BE[inst.month];
      if (monthKey) grouped[inst.year][monthKey] = inst.amount;
    });

    setYearlyValues(grouped);
    const years = Object.keys(grouped).map(Number).sort();
    setActiveTab(years.length > 0 ? `${years[0]}` : '');

    form.setFieldsValue({
      name: `${plan.provider} - ${plan.name}`,
    });
  };

  const handleClearPlan = () => {
    setSelectedPlan(undefined);
    setYearlyValues({});
    setActiveTab('');
  };

  const updateMonthValue = (yr: number, month: MonthBE, value: number) => {
    setYearlyValues((prev) => ({
      ...prev,
      [yr]: { ...prev[yr], [month]: value },
    }));
  };

  const handleOk = async () => {
    const formValues = await form.validateFields();

    if (hasPlanTabs) {
      onSubmit({
        values: {
          name: formValues.name,
          category: formValues.category,
          monthlyValues: yearlyValues[planYears[0]] || emptyMonths(),
        },
        selectedPlan,
        yearlyValues,
      });
    } else {
      const monthlyValues = MONTHS_BE.reduce((acc, m) => {
        acc[m] = formValues[m] ?? 0;
        return acc;
      }, {} as Record<MonthBE, number>);
      onSubmit({
        values: {
          name: formValues.name,
          category: formValues.category,
          monthlyValues,
        },
      });
    }
  };

  const activePlans = installmentPlans.filter((p) => !p.isClosed);

  const renderMonthGrid = (yr: number) => (
    <div className="grid grid-cols-3 gap-3" style={{ paddingTop: 8 }}>
      {MONTHS_BE.map((month) => (
        <div key={month}>
          <label className="block text-sm text-gray-500 mb-1">{month}</label>
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            value={yearlyValues[yr]?.[month] ?? 0}
            onChange={(val) => updateMonthValue(yr, month, val ?? 0)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <Modal
      title={initialValues ? 'แก้ไขรายการ' : 'เพิ่มรายการ'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={initialValues ? 'บันทึก' : 'เพิ่ม'}
      cancelText="ยกเลิก"
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ category: 'fixedExpense' as BudgetCategory, ...budgetService.getEmptyMonthlyValues() }}>
        <Form.Item name="category" label="ประเภท" rules={[{ required: true }]}>
          <Select options={[
            { value: 'income', label: 'รายรับ' },
            { value: 'fixedExpense', label: 'รายจ่ายประจำ' },
            { value: 'variableExpense', label: 'รายจ่ายผันแปร' },
          ]} />
        </Form.Item>
        {category === 'variableExpense' && activePlans.length > 0 && !initialValues && (
          <Form.Item label="เลือกจากหนี้ผ่อนชำระ (ไม่บังคับ)">
            <Select
              placeholder="เลือกรายการผ่อน..."
              allowClear
              onChange={(val) => val ? handleSelectPlan(val) : handleClearPlan()}
              options={activePlans.map((p) => {
                const years = [...new Set(p.installments.map((i) => i.year).filter((y) => y > 0))].sort();
                const yearLabel = years.length > 0 ? years.join(', ') : '-';
                return {
                  value: p.id,
                  label: `${p.provider} - ${p.name} (ปี ${yearLabel})`,
                };
              })}
            />
          </Form.Item>
        )}
        <Form.Item name="name" label="ชื่อรายการ" rules={[{ required: true, message: 'กรุณากรอกชื่อรายการ' }]}>
          <Input />
        </Form.Item>
        {!hasPlanTabs && (
          <div className="grid grid-cols-3 gap-3">
            {MONTHS_BE.map((month) => (
              <Form.Item key={month} name={month} label={month}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            ))}
          </div>
        )}
      </Form>
      {hasPlanTabs && (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={planYears.map((yr) => ({
            key: `${yr}`,
            label: `ปี ${yr}`,
            children: renderMonthGrid(yr),
          }))}
        />
      )}
    </Modal>
  );
}
