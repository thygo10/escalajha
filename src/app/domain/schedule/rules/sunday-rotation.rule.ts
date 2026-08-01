import type { ScheduleRule, ScheduleEntry, ScheduleContext, Violation } from '../schedule.types';
import { isSunday } from '../../shared/year-month';

export class SundayRotationRule implements ScheduleRule {
  id = 'SUNDAY_ROTATION';
  description = 'No consecutive worked Sundays (1T:2F general, CLT 386 for women in bakery/butcher)';

  validate(entries: ScheduleEntry[], context: ScheduleContext): Violation[] {
    const violations: Violation[] = [];
    const { year, month } = context.month;
    const totalDays = new Date(year, month, 0).getDate();

    const sundays: number[] = [];
    for (let d = 1; d <= totalDays; d++) {
      if (isSunday(context.month, d)) sundays.push(d);
    }

    for (const entry of entries) {
      const workedSundays = sundays.filter(d =>
        entry.dias[d] === 'TD' || entry.dias[d] === 'TF'
      );

      const isExceptionSector = entry.setor?.toLowerCase().includes('padaria') ||
        entry.setor?.toLowerCase().includes('acougue') ||
        entry.setor?.toLowerCase().includes('açougue');

      if (!isExceptionSector) {
        for (let i = 0; i < workedSundays.length - 1; i++) {
          if (workedSundays[i + 1] - workedSundays[i] <= 7) {
            violations.push({
              type: this.id,
              severity: 'error',
              message: `${entry.nome} trabalhou domingos consecutivos (dias ${workedSundays[i]} e ${workedSundays[i + 1]})`,
              entry,
              day: workedSundays[i + 1],
            });
          }
        }
      } else if (entry.genero === 'F') {
        for (let i = 0; i < workedSundays.length - 1; i++) {
          if (workedSundays[i + 1] - workedSundays[i] <= 7) {
            violations.push({
              type: 'CLT_386',
              severity: 'error',
              message: `${entry.nome} (Feminino) trabalhou domingos consecutivos violando CLT Art. 386`,
              entry,
              day: workedSundays[i + 1],
            });
          }
        }
      }
    }
    return violations;
  }
}
