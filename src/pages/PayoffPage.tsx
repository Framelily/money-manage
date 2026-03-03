import { useState, useMemo } from 'react';
import { Typography, InputNumber, Button, Space } from 'antd';
import { useInstallments } from '@/hooks/useInstallments';
import { useBudget } from '@/hooks/useBudget';
import { calculatePayoff, type PayoffResult } from '@/utils/payoffCalculator';
import { PayoffSummary } from '@/components/payoff/PayoffSummary';
import { PayoffChart } from '@/components/payoff/PayoffChart';
import { PayoffBudgetTable } from '@/components/payoff/PayoffBudgetTable';

export function PayoffPage() {
  const { plans, loading: plansLoading } = useInstallments();
  const { items: budgetItems, loading: budgetLoading, year } = useBudget();
  const [amount, setAmount] = useState<number | null>(null);
  const [result, setResult] = useState<PayoffResult | null>(null);

  const loading = plansLoading || budgetLoading;

  const handleCalculate = () => {
    if (!amount || amount <= 0) return;
    const payoff = calculatePayoff(plans, amount, year);
    setResult(payoff);
  };

  // recalculate when plans change but user already has a result
  useMemo(() => {
    if (result && amount && amount > 0) {
      setResult(calculatePayoff(plans, amount, year));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, year]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <Typography.Title level={4} style={{ margin: 0 }}>
        วิเคราะห์ปิดหนี้
      </Typography.Title>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Space.Compact>
          <InputNumber
            size="large"
            placeholder="จำนวนเงินที่มี"
            value={amount}
            onChange={(v) => setAmount(v)}
            min={0}
            step={1000}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
            prefix="฿"
            style={{ width: 240 }}
            onPressEnter={handleCalculate}
          />
          <Button
            type="primary"
            size="large"
            onClick={handleCalculate}
            loading={loading}
            disabled={!amount || amount <= 0}
          >
            คำนวณ
          </Button>
        </Space.Compact>
      </div>

      {result && (
        <>
          <PayoffSummary result={result} />
          {result.selected.length > 0 && (
            <>
              <PayoffBudgetTable
                budgetItems={budgetItems}
                plans={plans}
                result={result}
                year={year}
                loading={loading}
              />
              <PayoffChart
                budgetItems={budgetItems}
                plans={plans}
                result={result}
                year={year}
                loading={loading}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
