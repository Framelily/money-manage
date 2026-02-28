import { Table, Checkbox, Tag } from 'antd';
import type { InstallmentPlan, Installment } from '@/types';
import { formatBaht } from '@/utils/format';

const FULL_MONTHS_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

interface Props {
  plan: InstallmentPlan;
  onToggle: (planId: string, installmentId: string) => void;
}

export function InstallmentTable({ plan, onToggle }: Props) {
  if (!plan.installments.length) return null;

  const sorted = [...plan.installments].sort((a, b) => a.installmentNumber - b.installmentNumber);

  const columns = [
    {
      title: 'งวดที่',
      dataIndex: 'installmentNumber',
      key: 'installmentNumber',
      width: 80,
    },
    {
      title: 'เดือน',
      key: 'month',
      render: (_: unknown, record: Installment) =>
        FULL_MONTHS_TH[record.month] ?? `เดือน ${record.month + 1}`,
    },
    {
      title: 'ปี (พ.ศ.)',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: 'จำนวน',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => formatBaht(v),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'paid' ? 'green' : 'default'}>
          {status === 'paid' ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'}
        </Tag>
      ),
    },
    {
      title: 'จ่าย',
      key: 'toggle',
      width: 60,
      render: (_: unknown, record: Installment) => (
        <Checkbox
          checked={record.status === 'paid'}
          onChange={() => onToggle(plan.id, record.id)}
        />
      ),
    },
  ];

  return (
    <Table
      dataSource={sorted}
      columns={columns}
      rowKey="id"
      size="small"
      pagination={false}
    />
  );
}
