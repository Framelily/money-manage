import type { InstallmentPlan, MonthBE, Baht } from '@/types';
import { MONTHS_BE } from '@/types';
import { calculateInstallmentRemaining } from './calculations';

export interface PayoffPlanItem {
  plan: InstallmentPlan;
  remaining: Baht;
  perMonth: Baht;
  remainingInstallments: number;
}

export interface PayoffResult {
  selected: PayoffPlanItem[];
  totalUsed: Baht;
  moneyLeft: Baht;
  /** ค่างวดที่ประหยัดได้ในแต่ละเดือน (แยกตามเดือน เพราะบาง plan หมดงวดก่อน) */
  monthlySavings: Record<MonthBE, Baht>;
}

/**
 * คำนวณ Snowball Payoff — เรียงยอดคงเหลือน้อย→มาก แล้วเลือกปิดจนเงินหมด
 * @param plans - รายการผ่อนทั้งหมด
 * @param budget - เงินก้อนที่มี
 * @param year - ปี พ.ศ. ที่ต้องการคำนวณ
 */
export function calculatePayoff(
  plans: InstallmentPlan[],
  budget: Baht,
  year: number,
): PayoffResult {
  // 1. ดึง active plans ที่ยังไม่ปิด && remaining > 0
  const activePlans = plans
    .filter((p) => !p.isClosed)
    .map((p) => ({
      plan: p,
      remaining: calculateInstallmentRemaining(p),
    }))
    .filter((item) => item.remaining > 0);

  // 2. เรียงจากยอดคงเหลือน้อย → มาก
  activePlans.sort((a, b) => a.remaining - b.remaining);

  // 3. เลือก plans ที่รวมแล้วไม่เกินเงินที่กรอก
  const selected: PayoffPlanItem[] = [];
  let totalUsed = 0;

  for (const item of activePlans) {
    if (totalUsed + item.remaining <= budget) {
      const unpaidInstallments = item.plan.installments.filter(
        (inst) => inst.status === 'unpaid',
      );
      const perMonth = unpaidInstallments.length > 0
        ? unpaidInstallments[0].amount
        : (item.plan.perMonth ?? 0);

      selected.push({
        plan: item.plan,
        remaining: item.remaining,
        perMonth,
        remainingInstallments: unpaidInstallments.length,
      });
      totalUsed += item.remaining;
    }
  }

  // 4. คำนวณค่างวดที่ประหยัดได้ในแต่ละเดือน
  const monthlySavings = {} as Record<MonthBE, Baht>;
  MONTHS_BE.forEach((m) => { monthlySavings[m] = 0; });

  for (const item of selected) {
    const unpaid = item.plan.installments.filter(
      (inst) => inst.status === 'unpaid' && inst.year === year,
    );
    for (const inst of unpaid) {
      const monthKey = MONTHS_BE[inst.month];
      if (monthKey) {
        monthlySavings[monthKey] += inst.amount;
      }
    }
  }

  return {
    selected,
    totalUsed,
    moneyLeft: budget - totalUsed,
    monthlySavings,
  };
}
