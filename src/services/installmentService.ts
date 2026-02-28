import type { InstallmentPlan, Installment, CardProvider } from '@/types';
import api from './api';

export const installmentService = {
  async getAll(): Promise<InstallmentPlan[]> {
    const { data } = await api.get('/installments');
    return data;
  },

  async getByProvider(provider: CardProvider): Promise<InstallmentPlan[]> {
    const all = await this.getAll();
    return all.filter((p) => p.provider === provider);
  },

  async getById(id: string): Promise<InstallmentPlan | undefined> {
    const { data } = await api.get(`/installments/${id}`);
    return data;
  },

  async create(data: Omit<InstallmentPlan, 'id' | 'installments'> & { installments?: Installment[] }): Promise<InstallmentPlan> {
    const { data: created } = await api.post('/installments', data);
    return created;
  },

  async update(id: string, data: Partial<InstallmentPlan>): Promise<InstallmentPlan> {
    const { data: updated } = await api.put(`/installments/${id}`, data);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/installments/${id}`);
  },

  async toggleInstallment(planId: string, installmentId: string): Promise<InstallmentPlan> {
    const { data } = await api.patch(`/installments/${planId}/toggle/${installmentId}`);
    return data;
  },
};
