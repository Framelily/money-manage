import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useDaily } from '@/hooks/useDaily';
import { formatBaht, formatNumber } from '@/utils/format';
import type { DailyEntry, DailyType } from '@/types';

const EXPENSE_COLOR = '#ef4444';
const INCOME_COLOR = '#10b981';
const NEUTRAL = '#6366f1';

type RangeKey = 'today' | 'week' | 'month' | 'all' | 'custom';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'วันนี้' },
  { key: 'week', label: '7 วัน' },
  { key: 'month', label: '30 วัน' },
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'custom', label: 'เลือกเอง' },
];

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromDateInputValue(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const SHORT_MONTHS_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

function parseBEDate(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyyBE] = m;
  const year = parseInt(yyyyBE, 10) - 543;
  return new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10));
}

function formatShortDate(d: Date): string {
  return `${d.getDate()} ${SHORT_MONTHS_TH[d.getMonth()]}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function DailyReportPage() {
  const navigate = useNavigate();
  const { entries, loading } = useDaily();
  const [range, setRange] = useState<RangeKey>('month');
  const [breakdownType, setBreakdownType] = useState<DailyType>('expense');
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toDateInputValue(d);
  });
  const [customTo, setCustomTo] = useState<string>(() => toDateInputValue(new Date()));

  useEffect(() => {
    document.body.style.backgroundColor = '#f4f6fa';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const today = startOfDay(new Date());
    if (range === 'today') return { rangeStart: today, rangeEnd: today };
    if (range === 'week') {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { rangeStart: d, rangeEnd: today };
    }
    if (range === 'month') {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { rangeStart: d, rangeEnd: today };
    }
    if (range === 'custom') {
      const from = fromDateInputValue(customFrom);
      const to = fromDateInputValue(customTo);
      if (!from || !to) return { rangeStart: null, rangeEnd: null };
      const [s, e] = from <= to ? [from, to] : [to, from];
      return { rangeStart: startOfDay(s), rangeEnd: startOfDay(e) };
    }
    return { rangeStart: null, rangeEnd: null };
  }, [range, customFrom, customTo]);

  const filtered = useMemo(() => {
    return entries
      .map((e) => ({ ...e, _date: parseBEDate(e.entryDate) }))
      .filter((e): e is DailyEntry & { _date: Date } => {
        if (!e._date) return false;
        const d = startOfDay(e._date);
        if (rangeStart && d < rangeStart) return false;
        if (rangeEnd && d > rangeEnd) return false;
        return true;
      });
  }, [entries, rangeStart, rangeEnd]);

  const totals = useMemo(() => {
    const income = filtered
      .filter((e) => e.type === 'income')
      .reduce((s, e) => s + e.amount, 0);
    const expense = filtered
      .filter((e) => e.type === 'expense')
      .reduce((s, e) => s + e.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  const chartData = useMemo(() => {
    if (!filtered.length) return [];
    const end = rangeEnd ?? startOfDay(new Date(
      Math.max(...filtered.map((e) => e._date.getTime()))
    ));
    const start = rangeStart ?? startOfDay(new Date(
      Math.min(...filtered.map((e) => e._date.getTime()))
    ));
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const map = new Map<string, { date: Date; income: number; expense: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: d, income: 0, expense: 0 });
    }
    for (const e of filtered) {
      const key = startOfDay(e._date).toISOString().slice(0, 10);
      const bucket = map.get(key);
      if (!bucket) continue;
      if (e.type === 'income') bucket.income += e.amount;
      else bucket.expense += e.amount;
    }
    return Array.from(map.values()).map((b) => ({
      label: formatShortDate(b.date),
      income: b.income,
      expense: b.expense,
    }));
  }, [filtered, rangeStart]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const e of filtered) {
      if (e.type !== breakdownType) continue;
      const prev = map.get(e.category) ?? { amount: 0, count: 0 };
      map.set(e.category, { amount: prev.amount + e.amount, count: prev.count + 1 });
    }
    const items = Array.from(map.entries()).map(([category, v]) => ({
      category,
      amount: v.amount,
      count: v.count,
    }));
    items.sort((a, b) => b.amount - a.amount);
    const total = items.reduce((s, i) => s + i.amount, 0);
    return { items, total };
  }, [filtered, breakdownType]);

  const accent = breakdownType === 'expense' ? EXPENSE_COLOR : INCOME_COLOR;

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
          backgroundColor: NEUTRAL,
          color: 'white',
          padding: '14px 16px 20px',
          borderRadius: '0 0 24px 24px',
        }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/daily')}
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
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div style={{ fontSize: 13, opacity: 0.85 }}>รายงาน</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>สรุปรายรับรายจ่าย</div>
          </div>
          <div style={{ width: 40 }} />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginTop: 16,
          }}
        >
          <SummaryStat label="รายรับ" value={totals.income} color="#d1fae5" />
          <SummaryStat label="รายจ่าย" value={totals.expense} color="#fee2e2" />
          <SummaryStat
            label="คงเหลือ"
            value={totals.net}
            color={totals.net >= 0 ? '#dbeafe' : '#fef3c7'}
          />
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Range tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${RANGE_OPTIONS.length}, 1fr)`,
            backgroundColor: 'white',
            padding: 4,
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,.04)',
          }}
        >
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              style={{
                padding: '10px 4px',
                border: 'none',
                borderRadius: 8,
                background: range === opt.key ? NEUTRAL : 'transparent',
                color: range === opt.key ? 'white' : '#6b7280',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all .2s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,.04)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            <DateField label="จากวันที่" value={customFrom} onChange={setCustomFrom} max={customTo} />
            <DateField label="ถึงวันที่" value={customTo} onChange={setCustomTo} min={customFrom} />
          </div>
        )}

        {/* Trend chart */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: '16px 4px 8px 4px',
            boxShadow: '0 1px 3px rgba(0,0,0,.04)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: '#6b7280',
              fontWeight: 600,
              padding: '0 14px 10px',
            }}
          >
            แนวโน้มรายวัน
          </div>
          {chartData.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>
              ไม่มีข้อมูล
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(v: number) => formatBaht(v)}
                  labelStyle={{ fontSize: 12, color: '#111827' }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="income" name="รายรับ" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="รายจ่าย" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category breakdown */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,.04)',
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
              แยกตามหมวดหมู่
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                backgroundColor: '#f3f4f6',
                padding: 3,
                borderRadius: 8,
              }}
            >
              <button
                onClick={() => setBreakdownType('expense')}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  borderRadius: 6,
                  background: breakdownType === 'expense' ? EXPENSE_COLOR : 'transparent',
                  color: breakdownType === 'expense' ? 'white' : '#6b7280',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                จ่าย
              </button>
              <button
                onClick={() => setBreakdownType('income')}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  borderRadius: 6,
                  background: breakdownType === 'income' ? INCOME_COLOR : 'transparent',
                  color: breakdownType === 'income' ? 'white' : '#6b7280',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                รับ
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#9ca3af' }}>
              กำลังโหลด...
            </div>
          ) : categoryBreakdown.items.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#9ca3af' }}>
              ไม่มีข้อมูล
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {categoryBreakdown.items.map((item) => {
                const pct = categoryBreakdown.total > 0
                  ? (item.amount / categoryBreakdown.total) * 100
                  : 0;
                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                        {item.category}
                        <span
                          style={{
                            fontSize: 11,
                            color: '#9ca3af',
                            marginLeft: 6,
                          }}
                        >
                          {item.count} ครั้ง
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: accent }}>
                        {formatBaht(item.amount)}
                      </div>
                    </div>
                    <div
                      style={{
                        height: 6,
                        backgroundColor: '#f3f4f6',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: accent,
                          transition: 'width .3s',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {formatNumber(pct)}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

interface SummaryStatProps {
  label: string;
  value: number;
  color: string;
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}

function DateField({ label, value, onChange, min, max }: DateFieldProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#6b7280' }}>{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 14,
          outline: 'none',
          background: 'white',
          color: '#111827',
          width: '100%',
        }}
      />
    </label>
  );
}

function SummaryStat({ label, value, color }: SummaryStatProps) {
  return (
    <div
      style={{
        background: color,
        borderRadius: 12,
        padding: '10px 8px',
        textAlign: 'center',
        color: '#111827',
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{formatBaht(value)}</div>
    </div>
  );
}
