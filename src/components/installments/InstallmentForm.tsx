import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch } from 'antd';
import type { InstallmentPlan, CardProvider } from '@/types';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: Omit<InstallmentPlan, 'id' | 'installments'>) => void;
  initialValues?: InstallmentPlan;
}

export function InstallmentForm({ open, onCancel, onSubmit, initialValues }: Props) {
  const [form] = Form.useForm();

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
    onSubmit(values);
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
      <Form form={form} layout="vertical" initialValues={{ provider: 'KTC' as CardProvider, isClosed: false }}>
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
