import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, AutoComplete, Input, Popconfirm, Drawer } from 'antd';
import {
  ArrowLeftIcon,
  TrashIcon,
  BoltIcon,
  PencilSquareIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useDaily } from '@/hooks/useDaily';
import { formatBaht } from '@/utils/format';
import type { DailyCategoryStat, DailyType } from '@/types';

const FREQUENT_THRESHOLD = 3;
const EXPENSE_COLOR = '#ef4444';
const INCOME_COLOR = '#10b981';

export function DailyPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { entries, categories, loading, create, remove } = useDaily();

  const [type, setType] = useState<DailyType>('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const accent = type === 'expense' ? EXPENSE_COLOR : INCOME_COLOR;

  const frequent = useMemo(
    () =>
      categories
        .filter((c) => c.count >= FREQUENT_THRESHOLD && c.type === type)
        .slice(0, 12),
    [categories, type],
  );

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((c) => c.type === type)
        .sort((a, b) => b.count - a.count)
        .map((c) => ({ value: c.category, label: `${c.category} · ${c.count} ครั้ง` })),
    [categories, type],
  );

  const handlePickCategory = (value: string) => {
    setCategory(value);
    const found = categories.find((c) => c.category === value && c.type === type);
    if (found && !amount) {
      setAmount(String(found.lastAmount));
    }
    setTimeout(() => amountRef.current?.focus(), 50);
  };

  const handleQuickTap = (stat: DailyCategoryStat) => {
    setType(stat.type);
    setCategory(stat.category);
    setAmount(String(stat.lastAmount));
    setTimeout(() => amountRef.current?.focus(), 50);
  };

  const parseAmount = (s: string): number | null => {
    const n = parseFloat(s.replace(/,/g, ''));
    return isFinite(n) && n > 0 ? n : null;
  };

  const canSubmit = !!category.trim() && parseAmount(amount) !== null;

  const handleSubmit = async () => {
    const amt = parseAmount(amount);
    if (!category.trim()) {
      message.warning('กรอกหมวดหมู่');
      return;
    }
    if (amt == null) {
      message.warning('กรอกจำนวนเงิน');
      return;
    }
    setSubmitting(true);
    try {
      await create({
        category: category.trim(),
        type,
        amount: amt,
        note: note.trim() || undefined,
      });
      message.success(`บันทึก ${category.trim()} ${formatBaht(amt)}`);
      setCategory('');
      setAmount('');
      setNote('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await remove(id);
    message.success('ลบแล้ว');
  };

  const todayTotals = useMemo(() => {
    const today = new Date();
    const be = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear() + 543}`;
    const todays = entries.filter((e) => e.entryDate === be);
    const income = todays.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expense = todays.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    return { income, expense, net: income - expense, count: todays.length };
  }, [entries]);

  useEffect(() => {
    document.body.style.backgroundColor = '#f4f6fa';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        maxWidth: 480,
        margin: '0 auto',
        backgroundColor: '#f4f6fa',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: accent,
          color: 'white',
          padding: '14px 16px 20px',
          borderRadius: '0 0 24px 24px',
          transition: 'background-color .25s',
        }}
      >
        <div className="grid grid-cols-3 items-center">
          <button
            onClick={() => navigate('/choose')}
            style={{
              background: 'rgba(255,255,255,.15)',
              border: 'none',
              padding: 8,
              borderRadius: 12,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              justifySelf: 'start',
            }}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div style={{ fontSize: 13, opacity: 0.85 }}>บันทึกประจำวัน</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>วันนี้ · {todayTotals.count} รายการ</div>
          </div>
          <div className="flex items-center gap-2 justify-self-end">
            <button
              onClick={() => navigate('/daily/report')}
              style={{
                background: 'rgba(255,255,255,.15)',
                border: 'none',
                padding: 8,
                borderRadius: 12,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <ChartBarIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowHistory(true)}
              style={{
                background: 'rgba(255,255,255,.15)',
                border: 'none',
                padding: 8,
                borderRadius: 12,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>รับ</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{formatBaht(todayTotals.income)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>จ่าย</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{formatBaht(todayTotals.expense)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>คงเหลือ</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{formatBaht(todayTotals.net)}</div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Type toggle */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            backgroundColor: 'white',
            padding: 4,
            borderRadius: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,.04)',
          }}
        >
          <TypeButton
            active={type === 'expense'}
            color={EXPENSE_COLOR}
            onClick={() => setType('expense')}
            label="รายจ่าย"
          />
          <TypeButton
            active={type === 'income'}
            color={INCOME_COLOR}
            onClick={() => setType('income')}
            label="รายรับ"
          />
        </div>

        {/* Amount */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: '20px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,.04)',
          }}
        >
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>จำนวนเงิน</div>
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: 32, fontWeight: 700, color: accent }}>฿</span>
            <input
              ref={amountRef}
              inputMode="decimal"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0"
              style={{
                flex: 1,
                fontSize: 36,
                fontWeight: 700,
                border: 'none',
                outline: 'none',
                color: '#111827',
                background: 'transparent',
                width: '100%',
                padding: 0,
              }}
            />
          </div>
        </div>

        {/* Category */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,.04)',
          }}
        >
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>หมวดหมู่</div>
          <AutoComplete
            style={{ width: '100%' }}
            variant="borderless"
            placeholder="เช่น กาแฟ, ข้าวกลางวัน"
            value={category}
            options={categoryOptions}
            onChange={setCategory}
            onSelect={handlePickCategory}
            filterOption={(input, option) =>
              (option?.value as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>

        {/* Quick tap */}
        {frequent.length > 0 && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,.04)',
            }}
          >
            <div
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}
            >
              <BoltIcon className="w-3.5 h-3.5" /> กดเพิ่มไว
            </div>
            <div className="flex flex-wrap gap-2">
              {frequent.map((stat) => {
                const c = stat.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR;
                return (
                  <button
                    key={`${stat.type}-${stat.category}`}
                    onClick={() => handleQuickTap(stat)}
                    style={{
                      background: `${c}15`,
                      border: `1px solid ${c}40`,
                      borderRadius: 999,
                      padding: '8px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      cursor: 'pointer',
                      minHeight: 48,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: c }}>{stat.category}</span>
                    <span style={{ fontSize: 11, color: c, opacity: 0.85 }}>
                      {formatBaht(stat.lastAmount)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Note */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,.04)',
          }}
        >
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>โน้ต (ไม่บังคับ)</div>
          <Input
            variant="borderless"
            placeholder="บันทึกเพิ่มเติม..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ padding: 0 }}
          />
        </div>

        <div style={{ height: 16 }} />
      </div>

      {/* Fixed bottom submit */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0))',
          backgroundColor: 'rgba(244,246,250,.9)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            width: '100%',
            height: 56,
            border: 'none',
            borderRadius: 16,
            fontSize: 17,
            fontWeight: 700,
            color: 'white',
            background: canSubmit ? accent : '#d1d5db',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit ? `0 6px 20px ${accent}50` : 'none',
            transition: 'all .2s',
          }}
        >
          {submitting ? 'กำลังบันทึก...' : `บันทึก ${type === 'expense' ? 'รายจ่าย' : 'รายรับ'}`}
        </button>
      </div>

      {/* History drawer */}
      <Drawer
        title="รายการทั้งหมด"
        placement="right"
        open={showHistory}
        onClose={() => setShowHistory(false)}
        width="100%"
        styles={{ body: { padding: 0 } }}
      >
        {loading ? (
          <div className="text-center py-10 text-gray-400">กำลังโหลด...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">ยังไม่มีรายการ</div>
        ) : (
          <div>
            {entries.map((e) => {
              const c = e.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR;
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3"
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: `${c}18`,
                      color: c,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {e.type === 'income' ? '+' : '-'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {e.category}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {e.entryDate}
                      {e.note ? ` · ${e.note}` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: c }}>
                    {e.type === 'income' ? '+' : '-'}
                    {formatBaht(e.amount)}
                  </div>
                  <Popconfirm
                    title="ลบรายการนี้?"
                    onConfirm={() => handleDelete(e.id)}
                    okText="ลบ"
                    cancelText="ยกเลิก"
                  >
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 6,
                        color: '#9ca3af',
                        cursor: 'pointer',
                      }}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </Popconfirm>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>
    </div>
  );
}

interface TypeButtonProps {
  active: boolean;
  color: string;
  onClick: () => void;
  label: string;
}

function TypeButton({ active, color, onClick, label }: TypeButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px',
        border: 'none',
        borderRadius: 10,
        background: active ? color : 'transparent',
        color: active ? 'white' : '#6b7280',
        fontWeight: 600,
        fontSize: 15,
        cursor: 'pointer',
        transition: 'all .2s',
      }}
    >
      {label}
    </button>
  );
}
