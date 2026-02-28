import type { ID, Baht } from './common';

export type CardProvider = 'KTC' | 'UOB' | 'SHOPEE';

export interface Installment {
  id: ID;
  month: number; // installment number (1-based)
  installmentNumber: number;
  amount: Baht;
  status: 'paid' | 'unpaid';
}

export interface InstallmentPlan {
  id: ID;
  provider: CardProvider;
  name: string;
  totalAmount: Baht;
  perMonth: Baht | null;
  totalInstallments: number | null;
  installments: Installment[];
  isClosed: boolean;
  note?: string;
}
