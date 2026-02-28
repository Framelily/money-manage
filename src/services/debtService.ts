import { v4 as uuid } from 'uuid';
import type { PersonDebt, DebtPayment } from '@/types';
import { personDebts } from '@/data/debts';
import { todayBE } from '@/utils/date';
import { simulateDelay } from './api';

let debts = [...personDebts];

export const debtService = {
  async getAll(): Promise<PersonDebt[]> {
    return simulateDelay([...debts]);
  },

  async getById(id: string): Promise<PersonDebt | undefined> {
    return simulateDelay(debts.find((d) => d.id === id));
  },

  async create(data: Omit<PersonDebt, 'id' | 'payments' | 'lastUpdated' | 'status'>): Promise<PersonDebt> {
    const newDebt: PersonDebt = {
      ...data,
      id: uuid(),
      status: data.paidAmount >= data.totalAmount ? 'paid' : 'active',
      payments: [],
      lastUpdated: todayBE(),
    };
    debts = [...debts, newDebt];
    return simulateDelay(newDebt);
  },

  async update(id: string, data: Partial<PersonDebt>): Promise<PersonDebt> {
    debts = debts.map((d) => (d.id === id ? { ...d, ...data, lastUpdated: todayBE() } : d));
    const updated = debts.find((d) => d.id === id)!;
    return simulateDelay(updated);
  },

  async delete(id: string): Promise<void> {
    debts = debts.filter((d) => d.id !== id);
    return simulateDelay(undefined);
  },

  async recordPayment(debtId: string, amount: number, note?: string): Promise<PersonDebt> {
    const payment: DebtPayment = {
      id: uuid(),
      amount,
      date: todayBE(),
      note,
    };
    debts = debts.map((d) => {
      if (d.id !== debtId) return d;
      const newPaid = d.paidAmount + amount;
      return {
        ...d,
        paidAmount: newPaid,
        status: newPaid >= d.totalAmount ? 'paid' : 'active',
        payments: [...d.payments, payment],
        lastUpdated: todayBE(),
      };
    });
    const updated = debts.find((d) => d.id === debtId)!;
    return simulateDelay(updated);
  },
};
