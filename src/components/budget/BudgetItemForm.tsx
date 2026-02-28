import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select } from 'antd';
import type { BudgetItem, BudgetCategory, MonthBE } from '@/types';
import { MONTHS_BE } from '@/types';
import { budgetService } from '@/services/budgetService';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: Omit<BudgetItem, 'id'>) => void;
  initialValues?: BudgetItem;
}

export function BudgetItemForm({ open, onCancel, onSubmit, initialValues }: Props) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
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

  const handleOk = async () => {
    const values = await form.validateFields();
    const monthlyValues = MONTHS_BE.reduce((acc, m) => {
      acc[m] = values[m] ?? 0;
      return acc;
    }, {} as Record<MonthBE, number>);
    onSubmit({
      name: values.name,
      category: values.category,
      monthlyValues,
    });
  };

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
        <Form.Item name="name" label="ชื่อรายการ" rules={[{ required: true, message: 'กรุณากรอกชื่อรายการ' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="category" label="ประเภท" rules={[{ required: true }]}>
          <Select options={[
            { value: 'income', label: 'รายรับ' },
            { value: 'fixedExpense', label: 'รายจ่ายประจำ' },
            { value: 'variableExpense', label: 'รายจ่ายผันแปร' },
          ]} />
        </Form.Item>
        <div className="grid grid-cols-3 gap-3">
          {MONTHS_BE.map((month) => (
            <Form.Item key={month} name={month} label={month}>
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          ))}
        </div>
      </Form>
    </Modal>
  );
}
