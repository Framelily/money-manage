import type { DailyEntry, DailyCategoryStat, DailyType } from '@/types';
import api from './api';

export interface CreateDailyInput {
  category: string;
  type: DailyType;
  amount: number;
  note?: string;
  entryDate?: string;
}

export const dailyService = {
  async list(date?: string): Promise<DailyEntry[]> {
    const { data } = await api.get('/daily', { params: date ? { date } : {} });
    return Array.isArray(data) ? data : [];
  },

  async create(input: CreateDailyInput): Promise<DailyEntry> {
    const { data } = await api.post('/daily', input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/daily/${id}`);
  },

  async categories(): Promise<DailyCategoryStat[]> {
    const { data } = await api.get('/daily/categories');
    return Array.isArray(data) ? data : [];
  },
};
