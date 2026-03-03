import { useState, useEffect, useMemo } from 'react';
import { Table, Button, Space } from 'antd';
import type { BudgetItem, BudgetCategory, MonthBE, InstallmentPlan } from '@/types';
import { MONTHS_BE } from '@/types';
import { formatNumber, formatBaht } from '@/utils/format';
import { installmentsToBudgetItems } from '@/utils/installmentBudget';
import type { PayoffResult } from '@/utils/payoffCalculator';

const CATEGORY_CONFIG: Record<BudgetCategory, { label: string; color: string }> = {
  income: { label: 'รายรับ', color: '#10b981' },
  fixedExpense: { label: 'รายจ่ายประจำ', color: '#ef4444' },
  variableExpense: { label: 'รายจ่ายผันแปร', color: '#f97316' },
};

interface RowData {
  key: string;
  name: string;
  category: BudgetCategory;
  isSummary?: boolean;
  isRemaining?: boolean;
  values: Record<MonthBE, number>;
}

interface Props {
  budgetItems: BudgetItem[];
  plans: InstallmentPlan[];
  result: PayoffResult;
  year: number;
  loading?: boolean;
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

function buildRows(items: BudgetItem[]): RowData[] {
  const categories: BudgetCategory[] = ['income', 'fixedExpense', 'variableExpense'];
  const rows: RowData[] = [];

  categories.forEach((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    catItems.forEach((item) => {
      rows.push({
        key: item.id,
        name: item.name,
        category: cat,
        values: item.monthlyValues,
      });
    });
    // Summary row
    const summary = {} as Record<MonthBE, number>;
    MONTHS_BE.forEach((m) => {
      summary[m] = catItems.reduce((s, i) => s + (i.monthlyValues[m] || 0), 0);
    });
    rows.push({
      key: `summary-${cat}`,
      name: `รวม${CATEGORY_CONFIG[cat].label}`,
      category: cat,
      isSummary: true,
      values: summary,
    });
  });

  // Remaining row
  const remaining = {} as Record<MonthBE, number>;
  MONTHS_BE.forEach((m) => {
    const inc = items.filter((i) => i.category === 'income').reduce((s, i) => s + (i.monthlyValues[m] || 0), 0);
    const fix = items.filter((i) => i.category === 'fixedExpense').reduce((s, i) => s + (i.monthlyValues[m] || 0), 0);
    const vari = items.filter((i) => i.category === 'variableExpense').reduce((s, i) => s + (i.monthlyValues[m] || 0), 0);
    remaining[m] = inc - fix - vari;
  });
  rows.push({
    key: 'remaining',
    name: 'เงินคงเหลือ',
    category: 'income',
    isRemaining: true,
    values: remaining,
  });

  return rows;
}

export function PayoffBudgetTable({ budgetItems, plans, result, year, loading }: Props) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'before' | 'after'>('after');

  const totalUsedLabel = formatBaht(result.totalUsed);

  // "ก่อนปิด" = budget items + all installment items
  const beforeItems = useMemo(() => {
    const instItems = installmentsToBudgetItems(plans, year);
    return [...budgetItems, ...instItems];
  }, [budgetItems, plans, year]);

  // "หลังปิด" = budget items + installment items (excluding selected plans)
  const afterItems = useMemo(() => {
    const selectedIds = new Set(result.selected.map((s) => s.plan.id));
    const remainingPlans = plans.filter((p) => !selectedIds.has(p.id));
    const instItems = installmentsToBudgetItems(remainingPlans, year);
    return [...budgetItems, ...instItems];
  }, [budgetItems, plans, result, year]);

  const rows = useMemo(
    () => buildRows(tab === 'after' ? afterItems : beforeItems),
    [tab, beforeItems, afterItems],
  );

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
        return <span>{formatNumber(val)}</span>;
      },
    })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <Space>
        <Button
          type={tab === 'before' ? 'primary' : 'default'}
          onClick={() => setTab('before')}
          style={tab === 'before' ? { background: '#6366f1', borderColor: '#6366f1' } : undefined}
        >
          ปัจจุบัน
        </Button>
        <Button
          type={tab === 'after' ? 'primary' : 'default'}
          onClick={() => setTab('after')}
          style={tab === 'after' ? { background: '#10b981', borderColor: '#10b981' } : undefined}
        >
          หลังปิดหนี้ {totalUsedLabel}
        </Button>
      </Space>
      <Table<RowData>
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
    </div>
  );
}
