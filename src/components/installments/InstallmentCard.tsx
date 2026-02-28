import { Card, Progress, Tag, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { InstallmentPlan } from '@/types';
import { calculateInstallmentProgress, calculateInstallmentRemaining } from '@/utils/calculations';
import { formatBaht } from '@/utils/format';

interface Props {
  plan: InstallmentPlan;
  onEdit: (plan: InstallmentPlan) => void;
  onDelete: (id: string) => void;
}

export function InstallmentCard({ plan, onEdit, onDelete }: Props) {
  const progress = calculateInstallmentProgress(plan);
  const remaining = calculateInstallmentRemaining(plan);
  const paidCount = plan.installments.filter((i) => i.status === 'paid').length;

  return (
    <Card
      size="small"
      extra={
        <div className="flex gap-1">
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(plan)} />
          <Popconfirm title="ยืนยันลบรายการนี้?" onConfirm={() => onDelete(plan.id)} okText="ลบ" cancelText="ยกเลิก">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      }
      title={plan.name}
    >
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-500">ยอดรวม {formatBaht(plan.totalAmount)}</span>
        <Tag color={remaining === 0 ? 'green' : 'red'}>
          {remaining === 0 ? 'ปิดแล้ว' : `คงเหลือ ${formatBaht(remaining)}`}
        </Tag>
      </div>
      {plan.perMonth && (
        <p className="text-xs text-gray-400 mb-2">งวดละ {formatBaht(plan.perMonth)}</p>
      )}
      {plan.note && <p className="text-xs text-gray-400 mb-2">{plan.note}</p>}
      <Progress
        percent={progress}
        size="small"
        strokeColor={progress >= 100 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444'}
      />
      {plan.totalInstallments && (
        <p className="text-xs text-gray-400 text-right mt-1">
          {paidCount}/{plan.totalInstallments} งวด
        </p>
      )}
    </Card>
  );
}
