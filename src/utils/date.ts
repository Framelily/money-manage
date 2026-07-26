import dayjs from 'dayjs';
import { MONTHS_BE, type MonthBE } from '@/types';

export function toBuddhistYear(year: number): number {
  return year + 543;
}

export function toGregorianYear(bYear: number): number {
  return bYear - 543;
}

export function formatDateBE(date: dayjs.Dayjs | Date | string): string {
  const d = dayjs(date);
  const day = d.format('DD');
  const month = d.format('MM');
  const year = toBuddhistYear(d.year());
  return `${day}/${month}/${year}`;
}

export function todayBE(): string {
  return formatDateBE(dayjs());
}

export function getVisibleMonths(yearBE: number, showPast: boolean): MonthBE[] {
  const now = new Date();
  const isCurrentYear = yearBE === toBuddhistYear(now.getFullYear());
  if (showPast || !isCurrentYear) return MONTHS_BE;
  // MONTHS_BE is ordered ม.ค. first, so its indices match Date#getMonth().
  // Slicing at the current index keeps the current month visible.
  return MONTHS_BE.slice(now.getMonth());
}
