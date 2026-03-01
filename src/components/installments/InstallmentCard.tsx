import { Card, Progress, Tag, Button, Popconfirm } from 'antd';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
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
    <Card size="small" styles={{ body: { padding: 16 } }}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold truncate">{plan.name}</span>
        <div className="flex gap-1 flex-shrink-0 ml-2">
          <Button size="small" icon={<PencilIcon className="w-3.5 h-3.5" />} onClick={() => onEdit(plan)} />
          <Popconfirm title="ยืนยันลบรายการนี้?" onConfirm={() => onDelete(plan.id)} okText="ลบ" cancelText="ยกเลิก">
            <Button size="small" danger icon={<TrashIcon className="w-3.5 h-3.5" />} />
          </Popconfirm>
        </div>
      </div>
      <div className="flex justify-between items-center text-sm mb-2 flex-wrap gap-1">
        <span className="text-gray-500">ยอดรวม {formatBaht(plan.totalAmount)}</span>
        <Tag color={remaining === 0 ? 'green' : 'red'} style={{ margin: 0 }}>
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
