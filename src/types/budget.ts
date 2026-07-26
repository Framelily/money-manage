import type { ID, Baht, MonthBE } from './common';

export type BudgetCategory = 'income' | 'fixedExpense' | 'variableExpense';

export type PaidState = 'none' | 'partial' | 'all';

/** How much of one month's value has been settled, and whether that is all of it. */
export interface MonthPaid {
  state: PaidState;
  amount: Baht;
}

export interface BudgetItem {
  id: ID;
  name: string;
  category: BudgetCategory;
  monthlyValues: Record<MonthBE, Baht>;
  monthlyPaid: Record<MonthBE, MonthPaid>;
}

export interface MonthSummary {
  month: MonthBE;
  totalIncome: Baht;
  totalFixedExpense: Baht;
  totalVariableExpense: Baht;
  remaining: Baht;
}
