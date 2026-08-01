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
  sectorRule?: SectorRuleConfig
): CoverageViolation[] {
  const violations: CoverageViolation[] = [];
  const totalDays = totalDaysInMonth(month);

  const minDaily = sectorRule?.minFuncionariosDia ?? 1;
  const minSunday = sectorRule?.minFuncionariosDomingo ?? minDaily;

  for (let d = 1; d <= totalDays; d++) {
    const isSun = isSunday(month, d);
    const requiredMin = isSun ? minSunday : minDaily;

    const workingCount = items.filter(it => isWorkDay(it.dias[d])).length;

    if (workingCount < requiredMin) {
      violations.push({
        code: 'MIN_COVERAGE_NOT_MET',
        message: `Dia ${d} (${isSun ? 'Domingo' : 'Dia útil'}): ${workingCount} funcionários trabalhando, mínimo necessário é ${requiredMin}.`,
        severity: 'WARNING',
        day: d
      });
    }
  }

  return violations;
}
