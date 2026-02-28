import type { BudgetItem, MonthBE, Baht } from '@/types';
import { MONTHS_BE } from '@/types';
import api from './api';

interface ApiBudgetMonthlyValue {
  id: string;
  budgetItemId: string;
  month: MonthBE;
  year: number;
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
  async getAll(year?: number): Promise<BudgetItem[]> {
    const params = year ? { year } : {};
    const { data } = await api.get<ApiBudgetItem[]>('/budget', { params });
    return data.map(transformBudgetItem);
  },

  async getById(id: string, year?: number): Promise<BudgetItem | undefined> {
    const params = year ? { year } : {};
    const { data } = await api.get<ApiBudgetItem>(`/budget/${id}`, { params });
    return transformBudgetItem(data);
  },

  async create(data: Omit<BudgetItem, 'id'>, year?: number): Promise<BudgetItem> {
    const { data: created } = await api.post<ApiBudgetItem>('/budget', {
      name: data.name,
      category: data.category,
      monthlyValues: data.monthlyValues,
      year,
    });
    return transformBudgetItem(created);
  },

  async update(id: string, data: Partial<BudgetItem>, year?: number): Promise<BudgetItem> {
    const params = year ? { year } : {};
    const { data: updated } = await api.put<ApiBudgetItem>(`/budget/${id}`, {
      name: data.name,
      category: data.category,
    }, { params });
    return transformBudgetItem(updated);
  },

  async updateMonthlyValue(id: string, month: MonthBE, value: Baht, year?: number): Promise<BudgetItem> {
    const { data: updated } = await api.patch<ApiBudgetItem>(`/budget/${id}/month`, { month, value, year });
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
