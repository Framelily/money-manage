import dayjs from 'dayjs';

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
