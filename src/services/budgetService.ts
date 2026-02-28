import type { BudgetItem, MonthBE, Baht } from '@/types';
import { MONTHS_BE } from '@/types';
import api from './api';

interface ApiBudgetMonthlyValue {
  id: string;
  budgetItemId: string;
  month: MonthBE;
  value: number;
}

interface ApiBudgetItem {
  id: string;
  name: string;
  category: BudgetItem['category'];
  monthlyValues: ApiBudgetMonthlyValue[];
}

function transformBudgetItem(item: ApiBudgetItem): BudgetItem {
  const monthlyValues = {} as Record<MonthBE, Baht>;
  MONTHS_BE.forEach((m) => { monthlyValues[m] = 0; });
  item.monthlyValues?.forEach((mv) => { monthlyValues[mv.month] = mv.value; });
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    monthlyValues,
  };
}

export const budgetService = {
  async getAll(): Promise<BudgetItem[]> {
    const { data } = await api.get<ApiBudgetItem[]>('/budget');
    return data.map(transformBudgetItem);
  },

  async getById(id: string): Promise<BudgetItem | undefined> {
    const { data } = await api.get<ApiBudgetItem>(`/budget/${id}`);
    return transformBudgetItem(data);
  },

  async create(data: Omit<BudgetItem, 'id'>): Promise<BudgetItem> {
    const { data: created } = await api.post<ApiBudgetItem>('/budget', {
      name: data.name,
      category: data.category,
      monthlyValues: data.monthlyValues,
    });
    return transformBudgetItem(created);
  },

  async update(id: string, data: Partial<BudgetItem>): Promise<BudgetItem> {
    const { data: updated } = await api.put<ApiBudgetItem>(`/budget/${id}`, {
      name: data.name,
      category: data.category,
    });
    return transformBudgetItem(updated);
  },

  async updateMonthlyValue(id: string, month: MonthBE, value: Baht): Promise<BudgetItem> {
    const { data: updated } = await api.patch<ApiBudgetItem>(`/budget/${id}/month`, { month, value });
    return transformBudgetItem(updated);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/budget/${id}`);
  },

  getEmptyMonthlyValues(): Record<MonthBE, Baht> {
    const values = {} as Record<MonthBE, Baht>;
    MONTHS_BE.forEach((m) => { values[m] = 0; });
    return values;
  },
};
