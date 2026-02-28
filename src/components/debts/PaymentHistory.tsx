import { useState } from 'react';
import { Modal, Timeline, InputNumber, Input, Button, Empty } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import type { PersonDebt } from '@/types';
import { formatBaht } from '@/utils/format';

interface Props {
  debt: PersonDebt;
  open: boolean;
  onClose: () => void;
  onRecordPayment: (debtId: string, amount: number, note?: string) => void;
}

export function PaymentHistory({ debt, open, onClose, onRecordPayment }: Props) {
  const [amount, setAmount] = useState<number>(debt.installmentAmount ?? 0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || amount <= 0) return;
    setSubmitting(true);
    await onRecordPayment(debt.id, amount, note || undefined);
    setAmount(debt.installmentAmount ?? 0);
    setNote('');
    setSubmitting(false);
  };

  return (
    <Modal
      title={`ประวัติการจ่าย — ${debt.name} (${debt.item})`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      {debt.status === 'active' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-2">บันทึกการจ่ายเงิน</p>
          <div className="flex gap-2 mb-2">
            <InputNumber
              value={amount}
              onChange={(v) => setAmount(v ?? 0)}
              min={0}
              addonBefore="฿"
              className="flex-1"
            />
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={handleSubmit}
              loading={submitting}
              disabled={!amount || amount <= 0}
            >
              บันทึก
            </Button>
          </div>
          <Input
            placeholder="หมายเหตุ (ไม่บังคับ)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      <p className="text-sm font-medium mb-3">
        จ่ายแล้ว {formatBaht(debt.paidAmount)} / {formatBaht(debt.totalAmount)}
      </p>

      {debt.payments.length === 0 ? (
        <Empty description="ยังไม่มีประวัติการจ่าย" />
      ) : (
        <Timeline
          items={debt.payments.map((p) => ({
            children: (
              <div>
                <p className="font-medium">{formatBaht(p.amount)}</p>
                <p className="text-xs text-gray-400">{p.date}</p>
                {p.note && <p className="text-xs text-gray-500">{p.note}</p>}
              </div>
            ),
          }))}
        />
      )}
    </Modal>
  );
}
