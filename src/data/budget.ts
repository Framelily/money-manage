import { v4 as uuid } from 'uuid';
import type { BudgetItem, MonthBE } from '@/types';
import { MONTHS_BE } from '@/types';

function toMonthlyValues(values: number[]): Record<MonthBE, number> {
  const result = {} as Record<MonthBE, number>;
  MONTHS_BE.forEach((m, i) => {
    result[m] = values[i] ?? 0;
  });
  return result;
}

export const budgetItems: BudgetItem[] = [
  // Income
  { id: uuid(), name: 'เงินเดือน + เสริม', category: 'income', monthlyValues: toMonthlyValues([44900, 44900, 44900, 44900, 44900, 44900, 44900, 44900, 44900]) },
  { id: uuid(), name: 'รายได้อื่น (โดนัท)', category: 'income', monthlyValues: toMonthlyValues([1300, 1300, 1300, 1300, 1300, 0, 0, 0, 0]) },

  // Fixed Expense
  { id: uuid(), name: 'ให้แม่', category: 'fixedExpense', monthlyValues: toMonthlyValues([2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000]) },
  { id: uuid(), name: 'ค่ากิน (โอนโดนัท)', category: 'fixedExpense', monthlyValues: toMonthlyValues([3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]) },
  { id: uuid(), name: 'ค่าน้ำมัน (โอนโดนัท)', category: 'fixedExpense', monthlyValues: toMonthlyValues([1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]) },
  { id: uuid(), name: 'ค่าผ่อนบ้าน', category: 'fixedExpense', monthlyValues: toMonthlyValues([12000, 12000, 12000, 13500, 13500, 13500, 13500, 13500, 13500]) },
  { id: uuid(), name: 'ค่าเหมียว-โยดา-โยจิ', category: 'fixedExpense', monthlyValues: toMonthlyValues([2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500]) },
  { id: uuid(), name: 'ค่ากิน', category: 'fixedExpense', monthlyValues: toMonthlyValues([3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000, 3000]) },
  { id: uuid(), name: 'Coway', category: 'fixedExpense', monthlyValues: toMonthlyValues([600, 600, 600, 600, 600, 600, 600, 600, 600]) },
  { id: uuid(), name: 'ค่าเน็ต', category: 'fixedExpense', monthlyValues: toMonthlyValues([500, 500, 500, 500, 500, 500, 500, 500, 500]) },

  // Variable Expense
  { id: uuid(), name: 'บัตร Kplus ทั่วไป', category: 'variableExpense', monthlyValues: toMonthlyValues([1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500]) },
  { id: uuid(), name: 'Shopee', category: 'variableExpense', monthlyValues: toMonthlyValues([8712, 6967, 4934, 3724, 2908, 2899, 940, 940, 990]) },
  { id: uuid(), name: 'บัตร KTC', category: 'variableExpense', monthlyValues: toMonthlyValues([14380, 14380, 14380, 14380, 11305, 624, 0, 0, 0]) },
  { id: uuid(), name: 'บัตร UOB', category: 'variableExpense', monthlyValues: toMonthlyValues([6857, 6857, 5367, 5367, 5367, 4297, 0, 0, 0]) },
];
