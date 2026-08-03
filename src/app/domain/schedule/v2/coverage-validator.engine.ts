import { Feriado } from '../../../models/types';
import { YearMonth, totalDaysInMonth, isSunday } from '../../shared/year-month';
import { ScheduleV2Item, SectorRuleConfig } from './schedule-v2.types';
import { isWorkDay } from './consecutive-days.engine';

export interface CoverageViolation {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  day: number;
}

export function validateSectorCoverage(
  month: YearMonth,
  items: ScheduleV2Item[],
  sectorRule?: SectorRuleConfig,
  opts: { enforce?: boolean; holidays?: Feriado[] } = {}
): CoverageViolation[] {
  const violations: CoverageViolation[] = [];
  const totalDays = totalDaysInMonth(month);
  const { enforce = false, holidays = [] } = opts;

  const minDaily = sectorRule?.minFuncionariosDia ?? 1;
  const minSunday = sectorRule?.minFuncionariosDomingo ?? minDaily;
  const minHoliday = sectorRule?.minFuncionariosFeriado ?? minDaily;

  const closedHolidayDays = new Set<number>();
  const openHolidayDays = new Set<number>();
  holidays.forEach(h => {
    if (!h?.data) return;
    const parts = h.data.split('-');
    if (Number(parts[0]) === month.year && Number(parts[1]) === month.month) {
      const day = Number(parts[2]);
      if (h.funcionamento_proibido) closedHolidayDays.add(day);
      else openHolidayDays.add(day);
    }
  });

  const severity: 'ERROR' | 'WARNING' = enforce ? 'ERROR' : 'WARNING';

  for (let d = 1; d <= totalDays; d++) {
    if (closedHolidayDays.has(d)) continue;

    const isSun = isSunday(month, d);
    const requiredMin = isSun
      ? minSunday
      : openHolidayDays.has(d)
        ? minHoliday
        : minDaily;

    const workingCount = items.filter(it => isWorkDay(it.dias[d])).length;

    if (workingCount < requiredMin) {
      violations.push({
        code: 'MIN_COVERAGE_NOT_MET',
        message: `Dia ${d} (${isSun ? 'Domingo' : openHolidayDays.has(d) ? 'Feriado' : 'Dia útil'}): ${workingCount} funcionários trabalhando, mínimo necessário é ${requiredMin}.`,
        severity,
        day: d
      });
    }
  }

  return violations;
}
