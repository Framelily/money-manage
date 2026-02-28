import type { ID, Baht, MonthBE } from './common';

export type BudgetCategory = 'income' | 'fixedExpense' | 'variableExpense';

export interface BudgetItem {
  id: ID;
  name: string;
  category: BudgetCategory;
  monthlyValues: Record<MonthBE, Baht>;
}

export interface MonthSummary {
  month: MonthBE;
  totalIncome: Baht;
  totalFixedExpense: Baht;
  totalVariableExpense: Baht;
  remaining: Baht;
}
