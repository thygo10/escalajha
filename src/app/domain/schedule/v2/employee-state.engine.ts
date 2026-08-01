import { EmployeeMonthState } from './schedule-v2.types';
import { YearMonth } from '../../shared/year-month';

export function initializeEmployeeStates(
  employees: Array<{ id?: string; matricula_aleatoria: string; grupo_domingo: string; grupo_feriado: string; grupo_folga_semanal: string }>,
  month: YearMonth,
  previousStates?: Record<string, Partial<EmployeeMonthState>>
): Record<string, EmployeeMonthState> {
  const result: Record<string, EmployeeMonthState> = {};

  for (const emp of employees) {
    const key = emp.id || emp.matricula_aleatoria;
    const prev = previousStates?.[key] || {};

    result[key] = {
      employeeId: key,
      year: month.year,
      month: month.month,
      consecutiveDaysAtStart: prev.consecutiveDaysAtStart ?? 0,
      lastSundayWorked: prev.lastSundayWorked,
      lastHolidayWorked: prev.lastHolidayWorked,
      grupoDomingo: emp.grupo_domingo,
      grupoFeriado: emp.grupo_feriado,
      grupoFolgaSemanal: emp.grupo_folga_semanal
    };
  }

  return result;
}
