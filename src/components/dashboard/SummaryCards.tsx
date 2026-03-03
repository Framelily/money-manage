import { Card, Statistic, Skeleton } from 'antd';
import {
  BanknotesIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import styled from 'styled-components';
import type { BudgetItem, InstallmentPlan, PersonDebt } from '@/types';
import { MONTHS_BE } from '@/types';
import { calculateInstallmentRemaining } from '@/utils/calculations';
import { formatNumber } from '@/utils/format';
import { getProviderLabel } from '@/utils/providerConfig';

interface Props {
  budgetItems: BudgetItem[];
  plans: InstallmentPlan[];
  debts: PersonDebt[];
  loading: boolean;
}

const StyledCard = styled(Card)`
  .ant-statistic-title {
    font-size: 12px;
  }
  .ant-statistic-content-value {
    font-size: 18px;
    font-weight: 600;
  }
  .ant-statistic-content-suffix {
    font-size: 14px;
  }
  @media (min-width: 640px) {
    .ant-statistic-title {
      font-size: 14px;
    }
    .ant-statistic-content-value {
      font-size: 24px;
    }
    .ant-statistic-content-suffix {
      font-size: 18px;
    }
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

  const activePlans = plans.filter((p) => !p.isClosed);

  const totalDebtRemaining = activePlans.reduce(
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
      icon: <BanknotesIcon className="w-5 h-5" />,
      desc: 'เงินเดือน + รายได้เสริม',
    },
    {
      title: 'รายจ่ายประจำ/เดือน',
      value: avgFixedExpense,
      color: '#ef4444',
      icon: <ShoppingCartIcon className="w-5 h-5" />,
      desc: 'ผ่อนบ้าน + ค่าใช้จ่ายคงที่',
    },
    {
      title: 'หนี้คงค้างรวม',
      value: totalDebtRemaining,
      color: '#f59e0b',
      icon: <CreditCardIcon className="w-5 h-5" />,
      desc: [...new Set(activePlans.map((p) => getProviderLabel(p.provider)))].join(' + ') || '-',
    },
    {
      title: 'คนที่เป็นหนี้เรา',
      value: totalPeopleDebt,
      color: '#8b5cf6',
      icon: <UserGroupIcon className="w-5 h-5" />,
      desc: 'ยอดค้างชำระ',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c) => (
        <StyledCard key={c.title}>
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
