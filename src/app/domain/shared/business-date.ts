import type { YearMonth } from './year-month';

export interface BusinessDate {
  year: number;
  month: number;
  day: number;
}

export function createBusinessDate(year: number, month: number, day: number): BusinessDate {
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) throw new Error(`Invalid day ${day} for month ${month}/${year}`);
  return { year, month, day };
}

export function businessDateFromStr(dateStr: string): BusinessDate {
  const parts = dateStr.split('-');
  return createBusinessDate(Number(parts[0]), Number(parts[1]), Number(parts[2]));
}

export function businessDateToYearMonth(d: BusinessDate): YearMonth {
  return { year: d.year, month: d.month };
}

export function businessDateToStr(d: BusinessDate): string {
  const mm = String(d.month).padStart(2, '0');
  const dd = String(d.day).padStart(2, '0');
  return `${d.year}-${mm}-${dd}`;
}

export function businessDateDayOfWeek(d: BusinessDate): number {
  return new Date(d.year, d.month - 1, d.day).getDay();
}

export function isSundayDate(d: BusinessDate): boolean {
  return businessDateDayOfWeek(d) === 0;
}
