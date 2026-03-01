import { useState } from 'react';
import { Card, Progress, Tag, Button, Popconfirm } from 'antd';
import { PencilIcon, TrashIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import type { PersonDebt } from '@/types';
import { calculateDebtProgress } from '@/utils/calculations';
import { formatBaht } from '@/utils/format';
import { PaymentHistory } from './PaymentHistory';

interface Props {
  debt: PersonDebt;
  onEdit: (debt: PersonDebt) => void;
  onDelete: (id: string) => void;
  onRecordPayment: (debtId: string, amount: number, note?: string) => void;
}

export function DebtCard({ debt, onEdit, onDelete, onRecordPayment }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const progress = calculateDebtProgress(debt);
  const remaining = debt.totalAmount - debt.paidAmount;

  return (
    <>
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-semibold truncate">{debt.name}</span>
            <Tag color={debt.status === 'paid' ? 'green' : 'gold'} style={{ margin: 0 }}>
              {debt.status === 'paid' ? 'จ่ายครบ' : 'ค้างอยู่'}
            </Tag>
          </div>
          <div className="flex gap-1 flex-shrink-0 ml-2">
            {debt.status === 'active' && (
              <Button size="small" icon={<CurrencyDollarIcon className="w-3.5 h-3.5" />} onClick={() => setShowHistory(true)}>
                จ่าย
              </Button>
            )}
            <Button size="small" icon={<PencilIcon className="w-3.5 h-3.5" />} onClick={() => onEdit(debt)} />
            <Popconfirm title="ลบรายการนี้?" onConfirm={() => onDelete(debt.id)} okText="ลบ" cancelText="ยกเลิก">
              <Button size="small" danger icon={<TrashIcon className="w-3.5 h-3.5" />} />
            </Popconfirm>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-2">{debt.item}</p>
        <p className="text-lg sm:text-xl font-bold">
          {formatBaht(remaining)} <span className="text-sm font-normal text-gray-400">/ {formatBaht(debt.totalAmount)}</span>
        </p>
        {debt.installmentAmount && (
          <p className="text-xs text-gray-400 mt-1">งวดละ {formatBaht(debt.installmentAmount)}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">อัพเดต {debt.lastUpdated}</p>
        <Progress
          percent={progress}
          size="small"
          strokeColor={progress >= 100 ? '#10b981' : '#f59e0b'}
          className="mt-3"
        />
      </Card>
      <PaymentHistory
        debt={debt}
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onRecordPayment={onRecordPayment}
      />
    </>
  );
}
