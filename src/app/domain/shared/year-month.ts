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

/**
 * Fonte única da verdade para a quantidade de folgas esperadas e permitidas no mês.
 * Mês de 5 domingos -> Mínimo 5 folgas programáveis (F/FD), Máximo 6.
 * Mês de 4 domingos -> Mínimo 4 folgas programáveis (F/FD), Máximo 5.
 */
export function calcularFolgasEsperadasNoMes(year: number, month: number): { minFolgas: number; maxFolgas: number; qtdDomingos: number } {
  const sundays = getSundays({ year, month });
  const qtdDomingos = sundays.length;
  const minFolgas = qtdDomingos >= 5 ? 5 : 4;
  const maxFolgas = qtdDomingos >= 5 ? 6 : 5;
  return { minFolgas, maxFolgas, qtdDomingos };
}

/**
 * Retorna o índice contínuo global do domingo desde a data-base de referência (07/01/2024 - Domingo 0).
 * Garante que a sequência de domingos A/B/C nunca reinicie na virada do mês.
 */
export function getAbsoluteSundayIndex(year: number, month: number, day: number): number {
  const targetDate = new Date(Date.UTC(year, month - 1, day));
  const anchorDate = new Date(Date.UTC(2024, 0, 7)); // Sunday Jan 7, 2024
  const diffMs = targetDate.getTime() - anchorDate.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  return Math.floor(diffDays / 7);
}

/**
 * Retorna o índice contínuo global de um feriado aberto dentro da lista cronológica completa de feriados da loja.
 */
export function getAbsoluteHolidayIndex(
  holidayDate: string,
  allHolidays: { data: string; funcionamento_proibido?: boolean }[]
): number {
  const openHolidaysSorted = [...allHolidays]
    .filter(f => !f.funcionamento_proibido)
    .map(f => f.data)
    .sort((a, b) => a.localeCompare(b));
  
  const idx = openHolidaysSorted.indexOf(holidayDate);
  if (idx >= 0) return idx;

  // Se a data específica não for encontrada na lista filtrada, calcula um hash ordenado determinístico
  return Math.abs(holidayDate.split('-').reduce((acc, part) => acc + Number(part), 0)) % 100;
}

