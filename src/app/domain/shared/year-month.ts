export interface YearMonth {
  year: number;
  month: number;
}

export function createYearMonth(year: number, month: number): YearMonth {
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
  if (year < 2000 || year > 2100) throw new Error(`Invalid year: ${year}`);
  return { year, month };
}

export function totalDaysInMonth(ym: YearMonth): number {
  return new Date(ym.year, ym.month, 0).getDate();
}

export function firstDayOfWeek(ym: YearMonth): number {
  return new Date(ym.year, ym.month - 1, 1).getDay();
}

export function isSunday(ym: YearMonth, day: number): boolean {
  return new Date(ym.year, ym.month - 1, day).getDay() === 0;
}

export function getSundays(ym: YearMonth): number[] {
  const sundays: number[] = [];
  const total = totalDaysInMonth(ym);
  for (let d = 1; d <= total; d++) {
    if (isSunday(ym, d)) sundays.push(d);
  }
  return sundays;
}

export function nextMonth(ym: YearMonth): YearMonth {
  if (ym.month === 12) return { year: ym.year + 1, month: 1 };
  return { year: ym.year, month: ym.month + 1 };
}

export function previousMonth(ym: YearMonth): YearMonth {
  if (ym.month === 1) return { year: ym.year - 1, month: 12 };
  return { year: ym.year, month: ym.month - 1 };
}
