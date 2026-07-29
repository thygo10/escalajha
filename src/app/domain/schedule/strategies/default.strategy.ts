import type { SectorStrategy, ScheduleRule, ScheduleEntry, ScheduleContext } from '../schedule.types';
import { ConsecutiveWorkRule } from '../rules/consecutive-work.rule';
import { SundayRotationRule } from '../rules/sunday-rotation.rule';

export class DefaultSectorStrategy implements SectorStrategy {
  id = 'default';

  getRules(): ScheduleRule[] {
    return [
      new ConsecutiveWorkRule(),
      new SundayRotationRule(),
    ];
  }

  getMinEmployeesForDay(context: ScheduleContext, day: number, isSunday: boolean, isHoliday: boolean): number {
    const sectorName = context.employees[0]?.setor?.toLowerCase() || '';
    const isFrontEnd = sectorName.includes('caixa') && !sectorName.includes('fiscal');
    if (isFrontEnd) return 6;
    if (sectorName.includes('fiscal')) return 2;
    return 2;
  }

  canGrantDayOff(entry: ScheduleEntry, day: number, context: ScheduleContext, currentDayOffCount: number): boolean {
    const maxFolgas = 5;
    if (currentDayOffCount >= maxFolgas) return false;
    return true;
  }
}
