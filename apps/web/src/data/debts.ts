import { v4 as uuid } from 'uuid';
import type { PersonDebt } from '@/types';

export const personDebts: PersonDebt[] = [
  {
    id: uuid(),
    name: 'โดนัท',
    item: 'TV',
    totalAmount: 9600,
    paidAmount: 4800,
    installmentAmount: 9600,
    status: 'active',
    payments: [
      { id: uuid(), amount: 4800, date: '23/02/2569', note: 'จ่ายงวดแรก' },
    ],
    lastUpdated: '23/02/2569',
  },
  {
    id: uuid(),
    name: 'เบิร์น',
    item: 'iPhone 17 PM',
    totalAmount: 32500,
    paidAmount: 32500,
    installmentAmount: 3250,
    status: 'paid',
    payments: [
      { id: uuid(), amount: 3250, date: '01/04/2568' },
      { id: uuid(), amount: 3250, date: '01/05/2568' },
      { id: uuid(), amount: 3250, date: '01/06/2568' },
      { id: uuid(), amount: 3250, date: '01/07/2568' },
      { id: uuid(), amount: 3250, date: '01/08/2568' },
      { id: uuid(), amount: 3250, date: '01/09/2568' },
      { id: uuid(), amount: 3250, date: '01/10/2568' },
      { id: uuid(), amount: 3250, date: '01/11/2568' },
      { id: uuid(), amount: 3250, date: '01/12/2568' },
      { id: uuid(), amount: 3250, date: '28/02/2569' },
    ],
    lastUpdated: '28/02/2569',
  },
  {
    id: uuid(),
    name: 'ปอน',
    item: 'iPad mini 6',
    totalAmount: 17900,
    paidAmount: 17900,
    installmentAmount: null,
    status: 'paid',
    payments: [
      { id: uuid(), amount: 17900, date: '28/02/2569', note: 'จ่ายครบทั้งก้อน' },
    ],
    lastUpdated: '28/02/2569',
  },
];
