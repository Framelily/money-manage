import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd';
import type { InstallmentPlan, Installment, CardProvider } from '@/types';

const FULL_MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const CURRENT_YEAR_BE = new Date().getFullYear() + 543;

interface FormValues extends Omit<InstallmentPlan, 'id' | 'installments'> {
  startMonth?: number;
  startYear?: number;
}

export interface InstallmentFormResult extends Omit<InstallmentPlan, 'id' | 'installments'> {
  installments?: Omit<Installment, 'id'>[];
}

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: InstallmentFormResult) => void;
  initialValues?: InstallmentPlan;
}

const MONTH_OPTIONS = FULL_MONTHS_TH.map((label, i) => ({ value: i, label }));
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => {
  const y = CURRENT_YEAR_BE - 2 + i;
  return { value: y, label: `${y}` };
});

function generateInstallments(
  totalInstallments: number,
  perMonth: number,
  startMonth: number,
  startYear: number,
): Omit<Installment, 'id'>[] {
  return Array.from({ length: totalInstallments }, (_, i) => {
    const monthIndex = (startMonth + i) % 12;
    const yearOffset = Math.floor((startMonth + i) / 12);
    return {
      month: monthIndex,
      year: startYear + yearOffset,
      installmentNumber: i + 1,
      amount: perMonth,
      status: 'unpaid' as const,
    };
  });
}

export function InstallmentForm({ open, onCancel, onSubmit, initialValues }: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const { startMonth, startYear, ...planValues } = values;

    const result: InstallmentFormResult = { ...planValues };

    if (!initialValues && planValues.totalInstallments && planValues.perMonth && startMonth != null && startYear != null) {
      result.installments = generateInstallments(
        planValues.totalInstallments,
        planValues.perMonth,
        startMonth,
        startYear,
      );
    }

    onSubmit(result);
  };

  return (
    <Modal
      title={initialValues ? 'แก้ไขรายการผ่อน' : 'เพิ่มรายการผ่อน'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={initialValues ? 'บันทึก' : 'เพิ่ม'}
      cancelText="ยกเลิก"
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ provider: 'KTC' as CardProvider, isClosed: false, startMonth: 0, startYear: CURRENT_YEAR_BE }}>
        <Form.Item name="provider" label="Provider" rules={[{ required: true }]}>
          <Select options={[
            { value: 'KTC', label: 'KTC' },
            { value: 'UOB', label: 'UOB' },
            { value: 'SHOPEE', label: 'Shopee PayLater' },
          ]} />
        </Form.Item>
        <Form.Item name="name" label="ชื่อรายการ" rules={[{ required: true, message: 'กรุณากรอกชื่อรายการ' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="totalAmount" label="ยอดรวม (฿)" rules={[{ required: true, message: 'กรุณากรอกยอดรวม' }]}>
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item name="perMonth" label="ค่างวด/เดือน (฿)">
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item name="totalInstallments" label="จำนวนงวดทั้งหมด">
          <InputNumber className="w-full" min={1} />
        </Form.Item>
        {!initialValues && (
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="startMonth" label="เริ่มผ่อนเดือน">
              <Select options={MONTH_OPTIONS} />
            </Form.Item>
            <Form.Item name="startYear" label="ปี (พ.ศ.)">
              <Select options={YEAR_OPTIONS} />
            </Form.Item>
          </div>
        )}
        <Form.Item name="isClosed" label="ปิดแล้ว" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="note" label="หมายเหตุ">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
