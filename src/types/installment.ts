import type { ID, Baht } from './common';

export type CardProvider = string;

export interface Installment {
  id: ID;
  month: number; // index into MONTHS_BE (0 = เม.ย.)
  year: number; // ปี พ.ศ.
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
