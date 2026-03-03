import { useState, useEffect } from 'react';
import { Table, InputNumber, Button, Popconfirm } from 'antd';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { BudgetItem, MonthBE, Baht, BudgetCategory } from '@/types';
import { MONTHS_BE } from '@/types';
import { formatNumber } from '@/utils/format';

interface Props {
  items: BudgetItem[];
  loading: boolean;
  onEdit: (item: BudgetItem) => void;
  onDelete: (id: string) => void;
  onCellChange: (id: string, month: MonthBE, value: Baht) => void;
}

const CATEGORY_CONFIG: Record<BudgetCategory, { label: string; color: string; tagColor: string }> = {
  income: { label: 'รายรับ', color: '#10b981', tagColor: 'green' },
  fixedExpense: { label: 'รายจ่ายประจำ', color: '#ef4444', tagColor: 'red' },
  variableExpense: { label: 'รายจ่ายผันแปร', color: '#f97316', tagColor: 'orange' },
};

interface RowData {
  key: string;
  id: string;
  name: string;
  category: BudgetCategory;
  isSummary?: boolean;
  isRemaining?: boolean;
  isReadOnly?: boolean;
  values: Record<MonthBE, number>;
  original?: BudgetItem;
}

function EditableCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = useState(false);
  const [local, setLocal] = useState<number | null>(value);

  useEffect(() => { if (!focused) setLocal(value); }, [value, focused]);

  return (
    <InputNumber
      size="small"
      value={focused ? local : value}
      min={0}
      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      parser={(v) => Number(v!.replace(/,/g, ''))}
      onFocus={() => { setFocused(true); setLocal(value === 0 ? null : value); }}
      onBlur={() => { if (local == null) onChange(0); setFocused(false); }}
      onChange={(v) => { setLocal(v); onChange(v ?? 0); }}
      style={{ width: '100%' }}
    />
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export function BudgetTable({ items, loading, onEdit, onDelete, onCellChange }: Props) {
  const isMobile = useIsMobile();
  const categories: BudgetCategory[] = ['income', 'fixedExpense', 'variableExpense'];

  const rows: RowData[] = [];

  categories.forEach((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    catItems.forEach((item) => {
      rows.push({
        key: item.id,
        id: item.id,
        name: item.name,
        category: cat,
        isReadOnly: item.id.startsWith('installment-'),
        values: item.monthlyValues,
        original: item,
      });
    });
    // Summary row
    const summary: Record<MonthBE, number> = {} as Record<MonthBE, number>;
    MONTHS_BE.forEach((m) => {
      summary[m] = catItems.reduce((s, i) => s + (i.monthlyValues[m] || 0), 0);
    });
    rows.push({
      key: `summary-${cat}`,
      id: `summary-${cat}`,
      name: `รวม${CATEGORY_CONFIG[cat].label}`,
      category: cat,
      isSummary: true,
      values: summary,
    });
  });

  // Remaining row
  const remaining: Record<MonthBE, number> = {} as Record<MonthBE, number>;
  MONTHS_BE.forEach((m) => {
    const inc = items.filter((i) => i.category === 'income').reduce((s, i) => s + (i.monthlyValues[m] || 0), 0);
    const fix = items.filter((i) => i.category === 'fixedExpense').reduce((s, i) => s + (i.monthlyValues[m] || 0), 0);
    const vari = items.filter((i) => i.category === 'variableExpense').reduce((s, i) => s + (i.monthlyValues[m] || 0), 0);
    remaining[m] = inc - fix - vari;
  });
  rows.push({
    key: 'remaining',
    id: 'remaining',
    name: 'เงินคงเหลือ',
    category: 'income',
    isRemaining: true,
    values: remaining,
  });

  const columns = [
    {
      title: 'รายการ',
      dataIndex: 'name',
      key: 'name',
      fixed: isMobile ? undefined : ('left' as const),
      width: isMobile ? 130 : 200,
      render: (name: string, record: RowData) => {
        if (record.isSummary) return <strong style={{ color: CATEGORY_CONFIG[record.category].color }}>{name}</strong>;
        if (record.isRemaining) return <strong>{name}</strong>;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: CATEGORY_CONFIG[record.category].color,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: isMobile ? 13 : 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          </div>
        );
      },
    },
    ...MONTHS_BE.map((month) => ({
      title: month,
      key: month,
      width: isMobile ? 100 : 120,
      render: (_: unknown, record: RowData) => {
        const val = record.values[month] || 0;
        if (record.isSummary) {
          return <strong style={{ color: CATEGORY_CONFIG[record.category].color }}>{formatNumber(val)}</strong>;
        }
        if (record.isRemaining) {
          return <strong style={{ color: val >= 0 ? '#10b981' : '#ef4444' }}>{formatNumber(val)}</strong>;
        }
        if (record.isReadOnly) {
          return <span style={{ color: '#999' }}>{formatNumber(val)}</span>;
        }
        return (
          <EditableCell value={val} onChange={(newVal) => onCellChange(record.id, month, newVal)} />
        );
      },
    })),
    {
      title: '',
      key: 'actions',
      width: isMobile ? 64 : 80,
      fixed: isMobile ? undefined : ('right' as const),
      render: (_: unknown, record: RowData) => {
        if (record.isSummary || record.isRemaining || record.isReadOnly) return null;
        return (
          <div className="flex gap-1">
            <Button size="small" icon={<PencilIcon className="w-3.5 h-3.5" />} onClick={() => onEdit(record.original!)} />
            <Popconfirm title="ลบรายการนี้?" onConfirm={() => onDelete(record.id)} okText="ลบ" cancelText="ยกเลิก">
              <Button size="small" danger icon={<TrashIcon className="w-3.5 h-3.5" />} />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  return (
    <Table
      dataSource={rows}
      columns={columns}
      loading={loading}
      pagination={false}
      scroll={{ x: isMobile ? 1100 : 1400 }}
      size="small"
      bordered
      rowClassName={(record) => {
        if (record.isRemaining) return 'bg-gray-800 text-white';
        if (record.isSummary) return 'bg-gray-50 font-semibold';
        return '';
      }}
    />
  );
}
