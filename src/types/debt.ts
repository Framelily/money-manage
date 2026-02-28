import type { ID, Baht, DateBE } from './common';

export type DebtStatus = 'active' | 'paid';

export interface DebtPayment {
  id: ID;
  amount: Baht;
  date: DateBE;
  note?: string;
}

export interface PersonDebt {
  id: ID;
  name: string;
  item: string;
  totalAmount: Baht;
  paidAmount: Baht;
  installmentAmount: Baht | null;
  status: DebtStatus;
  payments: DebtPayment[];
  lastUpdated: DateBE;
}
