import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber } from 'antd';
import type { PersonDebt } from '@/types';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: Omit<PersonDebt, 'id' | 'payments' | 'lastUpdated' | 'status'>) => void;
  initialValues?: PersonDebt;
}

export function DebtForm({ open, onCancel, onSubmit, initialValues }: Props) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          item: initialValues.item,
          totalAmount: initialValues.totalAmount,
          paidAmount: initialValues.paidAmount,
          installmentAmount: initialValues.installmentAmount,
        });
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
      title={initialValues ? 'แก้ไขข้อมูลลูกหนี้' : 'เพิ่มลูกหนี้'}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={initialValues ? 'บันทึก' : 'เพิ่ม'}
      cancelText="ยกเลิก"
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ paidAmount: 0 }}>
        <Form.Item name="name" label="ชื่อ" rules={[{ required: true, message: 'กรุณากรอกชื่อ' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="item" label="รายการ" rules={[{ required: true, message: 'กรุณากรอกรายการ' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="totalAmount" label="ยอดรวม (฿)" rules={[{ required: true, message: 'กรุณากรอกยอดรวม' }]}>
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item name="paidAmount" label="จ่ายแล้ว (฿)">
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item name="installmentAmount" label="งวดละ (฿)">
          <InputNumber className="w-full" min={0} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
