import type { ScheduleRule, ScheduleEntry, ScheduleContext, Violation } from '../schedule.types';
import { isTrabalho } from '../schedule.types';

export class ConsecutiveWorkRule implements ScheduleRule {
  id = 'CLT_ART_67';
  description = 'Max 6 consecutive work days (CLT Art. 67)';

  validate(entries: ScheduleEntry[], context: ScheduleContext): Violation[] {
    const violations: Violation[] = [];
    const totalDays = new Date(context.month.year, context.month.month, 0).getDate();

    for (const entry of entries) {
      let consec = 0;
      for (let d = 1; d <= totalDays; d++) {
        if (isTrabalho(entry.dias[d])) {
          consec++;
          if (consec > 6) {
            violations.push({
              type: this.id,
              severity: 'error',
              message: `${entry.nome} trabalhou ${consec} dias consecutivos (máx 6)`,
              entry,
              day: d,
            });
          }
        } else {
          consec = 0;
        }
      }
    }
    return violations;
  }
}
