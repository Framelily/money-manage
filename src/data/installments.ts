import { v4 as uuid } from 'uuid';
import type { InstallmentPlan, Installment } from '@/types';

function generateInstallments(
  _total: number,
  perMonth: number,
  count: number,
  paid: number
): Installment[] {
  return Array.from({ length: count }, (_, i) => ({
    id: uuid(),
    month: i + 1,
    installmentNumber: i + 1,
    amount: perMonth,
    status: (i < paid ? 'paid' : 'unpaid') as 'paid' | 'unpaid',
  }));
}

export const ktcPlans: InstallmentPlan[] = [
  {
    id: uuid(),
    provider: 'KTC',
    name: 'MI PAD',
    totalAmount: 7999,
    perMonth: 799.90,
    totalInstallments: 10,
    installments: generateInstallments(7999, 799.90, 10, 7),
    isClosed: false,
  },
  {
    id: uuid(),
    provider: 'KTC',
    name: 'AIA (รอบ 2)',
    totalAmount: 13210.20,
    perMonth: 1321.02,
    totalInstallments: 10,
    installments: generateInstallments(13210.20, 1321.02, 10, 5),
    isClosed: false,
  },
  {
    id: uuid(),
    provider: 'KTC',
    name: 'แม่ผ่าตัด',
    totalAmount: 37700.62,
    perMonth: 3770.06,
    totalInstallments: 10,
    installments: generateInstallments(37700.62, 3770.06, 10, 5),
    isClosed: false,
  },
  {
    id: uuid(),
    provider: 'KTC',
    name: 'มือถือ',
    totalAmount: 47900,
    perMonth: 4790.00,
    totalInstallments: 10,
    installments: generateInstallments(47900, 4790.00, 10, 5),
    isClosed: false,
  },
  {
    id: uuid(),
    provider: 'KTC',
    name: 'กินเบียร์เลี้ยงรุ่น',
    totalAmount: 6800,
    perMonth: 623.68,
    totalInstallments: 10,
    installments: generateInstallments(6800, 623.68, 10, 3),
    isClosed: false,
  },
  {
    id: uuid(),
    provider: 'KTC',
    name: 'แว่นใหม่',
    totalAmount: 12300,
    perMonth: 3075,
    totalInstallments: 4,
    installments: generateInstallments(12300, 3075, 4, 0),
    isClosed: false,
  },
];

export const uobPlans: InstallmentPlan[] = [
  {
    id: uuid(),
    provider: 'UOB',
    name: 'iPad Mini',
    totalAmount: 14900,
    perMonth: 1490,
    totalInstallments: 10,
    installments: generateInstallments(14900, 1490, 10, 8),
    isClosed: false,
  },
  {
    id: uuid(),
    provider: 'UOB',
    name: 'โดนัทฝากจ่าย',
    totalAmount: 27051,
    perMonth: 2780,
    totalInstallments: 10,
    installments: generateInstallments(27051, 2780, 10, 3),
    isClosed: false,
  },
  {
    id: uuid(),
    provider: 'UOB',
    name: 'DJI Nano',
    totalAmount: 10700,
    perMonth: 1070,
    totalInstallments: 10,
    installments: generateInstallments(10700, 1070, 10, 5),
    isClosed: false,
  },
  {
    id: uuid(),
    provider: 'UOB',
    name: 'รองเท้า Asics',
    totalAmount: 4275,
    perMonth: 428,
    totalInstallments: 10,
    installments: generateInstallments(4275, 428, 10, 4),
    isClosed: false,
  },
  {
    id: uuid(),
    provider: 'UOB',
    name: 'โยจิ รพ.ทองหล่อ',
    totalAmount: 10899.61,
    perMonth: 1090,
    totalInstallments: 10,
    installments: generateInstallments(10899.61, 1090, 10, 4),
    isClosed: false,
  },
];

export const shopeePlans: InstallmentPlan[] = [
  {
    id: uuid(),
    provider: 'SHOPEE',
    name: 'Shopee PayLater (ยอดรวมคงเหลือ)',
    totalAmount: 80608.53,
    perMonth: null,
    totalInstallments: null,
    installments: [],
    isClosed: false,
    note: 'ยอดรายเดือนไม่คงที่ จ่ายตามงวด',
  },
];

export const allInstallmentPlans: InstallmentPlan[] = [
  ...ktcPlans,
  ...uobPlans,
  ...shopeePlans,
];
