import { Card, Statistic, Skeleton } from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  CreditCardOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import type { BudgetItem, InstallmentPlan, PersonDebt } from '@/types';
import { MONTHS_BE } from '@/types';
import { calculateInstallmentRemaining } from '@/utils/calculations';
import { formatNumber } from '@/utils/format';

interface Props {
  budgetItems: BudgetItem[];
  plans: InstallmentPlan[];
  debts: PersonDebt[];
  loading: boolean;
}

const StyledCard = styled(Card)<{ $borderColor: string }>`
  border-left: 4px solid ${({ $borderColor }) => $borderColor};
  .ant-statistic-content-value {
    font-size: 24px;
    font-weight: 700;
  }
`;

export function SummaryCards({ budgetItems, plans, debts, loading }: Props) {
  const avgIncome = budgetItems.length
    ? Math.round(
        budgetItems
          .filter((i) => i.category === 'income')
          .reduce((sum, i) => sum + MONTHS_BE.reduce((s, m) => s + (i.monthlyValues[m] || 0), 0), 0) / MONTHS_BE.length
      )
    : 0;

  const avgFixedExpense = budgetItems.length
    ? Math.round(
        budgetItems
          .filter((i) => i.category === 'fixedExpense')
          .reduce((sum, i) => sum + MONTHS_BE.reduce((s, m) => s + (i.monthlyValues[m] || 0), 0), 0) / MONTHS_BE.length
      )
    : 0;

  const totalDebtRemaining = plans.reduce(
    (sum, p) => sum + calculateInstallmentRemaining(p),
    0
  );

  const totalPeopleDebt = debts
    .filter((d) => d.status === 'active')
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  const cards = [
    {
      title: 'รายรับเฉลี่ยต่อเดือน',
      value: avgIncome,
      color: '#10b981',
      icon: <DollarOutlined />,
      desc: 'เงินเดือน + รายได้เสริม',
    },
    {
      title: 'รายจ่ายประจำ/เดือน',
      value: avgFixedExpense,
      color: '#ef4444',
      icon: <ShoppingCartOutlined />,
      desc: 'ผ่อนบ้าน + ค่าใช้จ่ายคงที่',
    },
    {
      title: 'หนี้คงค้างรวม',
      value: totalDebtRemaining,
      color: '#f59e0b',
      icon: <CreditCardOutlined />,
      desc: 'KTC + UOB + Shopee',
    },
    {
      title: 'คนที่เป็นหนี้เรา',
      value: totalPeopleDebt,
      color: '#8b5cf6',
      icon: <TeamOutlined />,
      desc: 'ยอดค้างชำระ',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <StyledCard key={c.title} $borderColor={c.color}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <>
              <Statistic
                title={c.title}
                value={formatNumber(c.value)}
                prefix={<span style={{ color: c.color }}>{c.icon}</span>}
                suffix="฿"
                valueStyle={{ color: c.color }}
              />
              <p className="text-xs text-gray-400 mt-1">{c.desc}</p>
            </>
          )}
        </StyledCard>
      ))}
    </div>
  );
}
