import type { BudgetItem, MonthBE, Baht, MonthPaid } from '@/types';
import { MONTHS_BE } from '@/types';
import api from './api';

/** What a form can supply. Paid state is never authored here — it is set by
 *  ticking a month, so it must not ride along on a create or an edit. */
export type BudgetItemDraft = Omit<BudgetItem, 'id' | 'monthlyPaid'>;

interface ApiBudgetMonthlyValue {
  id: string;
  budgetItemId: string;
  month: MonthBE;
  year: number;
  value: number;
  paid: boolean;
}

interface ApiBudgetItem {
  id: string;
  name: string;
  category: BudgetItem['category'];
  monthlyValues: ApiBudgetMonthlyValue[];
}

function transformBudgetItem(item: ApiBudgetItem): BudgetItem {
  const monthlyValues = {} as Record<MonthBE, Baht>;
  const monthlyPaid = {} as Record<MonthBE, MonthPaid>;
  MONTHS_BE.forEach((m) => {
    monthlyValues[m] = 0;
    monthlyPaid[m] = { state: 'none', amount: 0 };
  });
  item.monthlyValues?.forEach((mv) => {
    monthlyValues[mv.month] = mv.value;
    monthlyPaid[mv.month] = mv.paid
      ? { state: 'all', amount: mv.value }
      : { state: 'none', amount: 0 };
  });
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    monthlyValues,
    monthlyPaid,
  };
}

export const budgetService = {
  async getAll(year?: number): Promise<BudgetItem[]> {
    const params = year ? { year } : {};
    const { data } = await api.get<ApiBudgetItem[]>('/budget', { params });
    return Array.isArray(data) ? data.map(transformBudgetItem) : [];
  },

  async getById(id: string, year?: number): Promise<BudgetItem | undefined> {
    const params = year ? { year } : {};
    const { data } = await api.get<ApiBudgetItem>(`/budget/${id}`, { params });
    return transformBudgetItem(data);
  },

  async create(data: BudgetItemDraft, year?: number): Promise<BudgetItem> {
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
      monthlyValues: data.monthlyValues,
    }, { params });
    return transformBudgetItem(updated);
  },

  async updateMonthlyValue(id: string, month: MonthBE, value: Baht, year?: number): Promise<BudgetItem> {
    const { data: updated } = await api.patch<ApiBudgetItem>(`/budget/${id}/month`, { month, value, year });
    return transformBudgetItem(updated);
  },

  async setMonthlyPaid(id: string, month: MonthBE, paid: boolean, year?: number): Promise<BudgetItem> {
    const { data: updated } = await api.patch<ApiBudgetItem>(`/budget/${id}/paid`, { month, paid, year });
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
