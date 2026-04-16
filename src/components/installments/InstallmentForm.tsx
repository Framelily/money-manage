import { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Button, AutoComplete, ColorPicker } from 'antd';
import type { Color } from 'antd/es/color-picker';
import type { InstallmentPlan, Installment } from '@/types';
import { getProviderChartColor } from '@/utils/providerConfig';

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
  existingProviders?: string[];
  providerColorMap?: Record<string, string>;
}

const MONTH_OPTIONS = FULL_MONTHS_TH.map((label, i) => ({ value: i, label }));
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => {
  const y = CURRENT_YEAR_BE - 2 + i;
  return { value: y, label: `${y}` };
});

type DraftInstallment = Omit<Installment, 'id'>;

function buildInstallments(
  total: number,
  perMonth: number | null,
  startMonth: number,
  startYear: number,
): DraftInstallment[] {
  return Array.from({ length: total }, (_, i) => {
    const monthIndex = (startMonth + i) % 12;
    const yearOffset = Math.floor((startMonth + i) / 12);
    return {
      month: monthIndex,
      year: startYear + yearOffset,
      installmentNumber: i + 1,
      amount: perMonth ?? 0,
      status: 'unpaid' as const,
    };
  });
}

function toHex(value: string | Color): string {
  if (typeof value === 'string') return value;
  return value.toHexString();
}

export function InstallmentForm({ open, onCancel, onSubmit, initialValues, existingProviders = [], providerColorMap = {} }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [drafts, setDrafts] = useState<DraftInstallment[]>([]);
  const [colorValue, setColorValue] = useState<string>('#1677ff');

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
        setColorValue(initialValues.providerColor ?? getProviderChartColor(initialValues.provider));
        setDrafts(
          initialValues.installments.map(({ id: _, ...rest }) => rest),
        );
      } else {
        form.resetFields();
        setColorValue('#1677ff');
        setDrafts([]);
      }
    }
  }, [open, initialValues, form]);

  const handleProviderSelect = (value: string) => {
    const existingColor = providerColorMap[value];
    if (existingColor) {
      setColorValue(existingColor);
      form.setFieldValue('providerColor', existingColor);
    } else {
      const defaultColor = getProviderChartColor(value);
      setColorValue(defaultColor);
      form.setFieldValue('providerColor', defaultColor);
    }
  };

  const handleGenerate = async () => {
    try {
      await form.validateFields(['totalInstallments', 'startMonth', 'startYear']);
    } catch {
      return;
    }
    const totalInstallments = form.getFieldValue('totalInstallments');
    const perMonth = form.getFieldValue('perMonth');
    const startMonth = form.getFieldValue('startMonth');
    const startYear = form.getFieldValue('startYear');
    setDrafts(buildInstallments(totalInstallments, perMonth, startMonth, startYear));
  };

  const updateDraftAmount = (index: number, value: number | null) => {
    setDrafts((prev) => prev.map((d, i) => i === index ? { ...d, amount: value as number } : d));
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    const { startMonth, startYear, ...planValues } = values;

    planValues.providerColor = colorValue;

    const result: InstallmentFormResult = { ...planValues };
    if (drafts.length > 0) {
      result.installments = drafts;
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
      destroyOnHidden
      width="100%"
      style={{ maxWidth: 600, top: 20 }}
      styles={{ body: { maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' } }}
    >
      <Form form={form} layout="vertical" initialValues={{ isClosed: false, startMonth: 0, startYear: CURRENT_YEAR_BE }}>
        <Form.Item name="provider" label="ผู้ให้บริการ" rules={[{ required: true, message: 'กรุณาเลือกหรือพิมพ์ชื่อผู้ให้บริการ' }]}>
          <AutoComplete
            placeholder="เลือกหรือพิมพ์ชื่อใหม่..."
            options={existingProviders.map((p) => ({ value: p }))}
            filterOption={(input, option) =>
              (option?.value as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            onSelect={handleProviderSelect}
          />
        </Form.Item>
        <Form.Item label="สีผู้ให้บริการ">
          <ColorPicker
            value={colorValue}
            onChange={(color) => {
              const hex = toHex(color);
              setColorValue(hex);
              form.setFieldValue('providerColor', hex);
            }}
            showText
          />
        </Form.Item>
        <Form.Item name="name" label="ชื่อรายการ" rules={[{ required: true, message: 'กรุณากรอกชื่อรายการ' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="totalAmount" label="ยอดรวม (฿)" rules={[{ required: true, message: 'กรุณากรอกยอดรวม' }]}>
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            onFocus={() => { if (form.getFieldValue('totalAmount') === 0) form.setFieldValue('totalAmount', null); }}
            onBlur={() => { if (form.getFieldValue('totalAmount') == null) form.setFieldValue('totalAmount', 0); }}
          />
        </Form.Item>
        <Form.Item name="perMonth" label="ค่างวด/เดือน (฿) — เว้นว่างถ้าแต่ละเดือนไม่เท่ากัน">
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            onFocus={() => { if (form.getFieldValue('perMonth') === 0) form.setFieldValue('perMonth', null); }}
            onBlur={() => { if (form.getFieldValue('perMonth') == null) form.setFieldValue('perMonth', 0); }}
          />
        </Form.Item>
        <Form.Item name="totalInstallments" label="จำนวนงวดทั้งหมด" rules={[{ required: true, message: 'กรุณากรอกจำนวนงวด' }]}>
          <InputNumber style={{ width: '100%' }} min={1} />
        </Form.Item>
        {!initialValues && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="startMonth" label="เริ่มผ่อนเดือน" rules={[{ required: true, message: 'กรุณาเลือกเดือน' }]}>
                <Select options={MONTH_OPTIONS} />
              </Form.Item>
              <Form.Item name="startYear" label="ปี (พ.ศ.)" rules={[{ required: true, message: 'กรุณาเลือกปี' }]}>
                <Select options={YEAR_OPTIONS} />
              </Form.Item>
            </div>
            <Button type="dashed" block onClick={handleGenerate} style={{ marginBottom: 16 }}>
              สร้างรายการงวด
            </Button>
          </>
        )}
        <Form.Item name="isClosed" label="ปิดแล้ว" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="note" label="หมายเหตุ">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>

      {drafts.length > 0 && (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>งวด</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>เดือน</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>ปี</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>จำนวนเงิน (฿)</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '4px 8px' }}>{d.installmentNumber}</td>
                  <td style={{ padding: '4px 8px' }}>{FULL_MONTHS_TH[d.month]}</td>
                  <td style={{ padding: '4px 8px' }}>{d.year}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                    <InputNumber
                      size="small"
                      style={{ width: '100%', minWidth: 80 }}
                      min={0}
                      value={d.amount}
                      onChange={(val) => updateDraftAmount(i, val ?? 0)}
                      onFocus={() => { if (d.amount === 0) updateDraftAmount(i, null); }}
                      onBlur={() => { if (d.amount == null) updateDraftAmount(i, 0); }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
