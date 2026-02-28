import type { PersonDebt } from '@/types';
import api from './api';

export const debtService = {
  async getAll(): Promise<PersonDebt[]> {
    const { data } = await api.get('/debts');
    return data;
  },

  async getById(id: string): Promise<PersonDebt | undefined> {
    const { data } = await api.get(`/debts/${id}`);
    return data;
  },

  async create(data: Omit<PersonDebt, 'id' | 'payments' | 'lastUpdated' | 'status'>): Promise<PersonDebt> {
    const { data: created } = await api.post('/debts', data);
    return created;
  },

  async update(id: string, data: Partial<PersonDebt>): Promise<PersonDebt> {
    const { data: updated } = await api.put(`/debts/${id}`, data);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/debts/${id}`);
  },

  async recordPayment(debtId: string, amount: number, note?: string): Promise<PersonDebt> {
    const { data } = await api.post(`/debts/${debtId}/payment`, { amount, note });
    return data;
  },
};
