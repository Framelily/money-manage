import { v4 as uuid } from 'uuid';
import type { BudgetItem, MonthBE, Baht } from '@/types';
import { MONTHS_BE } from '@/types';
import { budgetItems } from '@/data/budget';
import { simulateDelay } from './api';

let items = [...budgetItems];

export const budgetService = {
  async getAll(): Promise<BudgetItem[]> {
    return simulateDelay([...items]);
  },

  async getById(id: string): Promise<BudgetItem | undefined> {
    return simulateDelay(items.find((i) => i.id === id));
  },

  async create(data: Omit<BudgetItem, 'id'>): Promise<BudgetItem> {
    const newItem: BudgetItem = { ...data, id: uuid() };
    items = [...items, newItem];
    return simulateDelay(newItem);
  },

  async update(id: string, data: Partial<BudgetItem>): Promise<BudgetItem> {
    items = items.map((i) => (i.id === id ? { ...i, ...data } : i));
    const updated = items.find((i) => i.id === id)!;
    return simulateDelay(updated);
  },

  async updateMonthlyValue(id: string, month: MonthBE, value: Baht): Promise<BudgetItem> {
    items = items.map((i) => {
      if (i.id !== id) return i;
      return { ...i, monthlyValues: { ...i.monthlyValues, [month]: value } };
    });
    const updated = items.find((i) => i.id === id)!;
    return simulateDelay(updated);
  },

  async delete(id: string): Promise<void> {
    items = items.filter((i) => i.id !== id);
    return simulateDelay(undefined);
  },

  getEmptyMonthlyValues(): Record<MonthBE, Baht> {
    const values = {} as Record<MonthBE, Baht>;
    MONTHS_BE.forEach((m) => { values[m] = 0; });
    return values;
  },
};
