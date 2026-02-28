import type { Baht } from '@/types';

export function formatBaht(n: Baht | null | undefined): string {
  if (n === null || n === undefined) return '-';
  return `฿${formatNumber(n)}`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '-';
  const neg = n < 0;
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return neg ? `-${formatted}` : formatted;
}
