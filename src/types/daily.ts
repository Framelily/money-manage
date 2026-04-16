import type { Baht, DateBE, ID } from './common';

export type DailyType = 'income' | 'expense';

export interface DailyEntry {
  id: ID;
  category: string;
  type: DailyType;
  amount: Baht;
  note?: string;
  entryDate: DateBE;
  createdAt: string;
}

export interface DailyCategoryStat {
  category: string;
  type: DailyType;
  count: number;
  lastAmount: Baht;
}
