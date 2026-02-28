import { v4 as uuid } from 'uuid';
import type { InstallmentPlan, Installment, CardProvider } from '@/types';
import { allInstallmentPlans } from '@/data/installments';
import { simulateDelay } from './api';

let plans = [...allInstallmentPlans];

export const installmentService = {
  async getAll(): Promise<InstallmentPlan[]> {
    return simulateDelay([...plans]);
  },

  async getByProvider(provider: CardProvider): Promise<InstallmentPlan[]> {
    return simulateDelay(plans.filter((p) => p.provider === provider));
  },

  async getById(id: string): Promise<InstallmentPlan | undefined> {
    return simulateDelay(plans.find((p) => p.id === id));
  },

  async create(data: Omit<InstallmentPlan, 'id' | 'installments'> & { installments?: Installment[] }): Promise<InstallmentPlan> {
    const newPlan: InstallmentPlan = {
      ...data,
      id: uuid(),
      installments: data.installments ?? generateInstallments(data),
    };
    plans = [...plans, newPlan];
    return simulateDelay(newPlan);
  },

  async update(id: string, data: Partial<InstallmentPlan>): Promise<InstallmentPlan> {
    plans = plans.map((p) => (p.id === id ? { ...p, ...data } : p));
    const updated = plans.find((p) => p.id === id)!;
    return simulateDelay(updated);
  },

  async delete(id: string): Promise<void> {
    plans = plans.filter((p) => p.id !== id);
    return simulateDelay(undefined);
  },

  async toggleInstallment(planId: string, installmentId: string): Promise<InstallmentPlan> {
    plans = plans.map((p) => {
      if (p.id !== planId) return p;
      return {
        ...p,
        installments: p.installments.map((inst) =>
          inst.id === installmentId
            ? { ...inst, status: inst.status === 'paid' ? 'unpaid' : 'paid' }
            : inst
        ),
      };
    });
    const updated = plans.find((p) => p.id === planId)!;
    return simulateDelay(updated);
  },
};

function generateInstallments(plan: Omit<InstallmentPlan, 'id' | 'installments'>): Installment[] {
  if (!plan.totalInstallments || !plan.perMonth) return [];
  return Array.from({ length: plan.totalInstallments }, (_, i) => ({
    id: uuid(),
    month: i + 1,
    installmentNumber: i + 1,
    amount: plan.perMonth!,
    status: 'unpaid' as const,
  }));
}
