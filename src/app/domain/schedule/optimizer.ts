import type { ScheduleEntry, ScheduleContext } from './schedule.types';
import { isTrabalho, isFolgaNormal } from './schedule.types';

export function optimizeSchedule(entries: ScheduleEntry[], context: ScheduleContext): ScheduleEntry[] {
  const passes = context.config?.optimizationPasses ?? 0;
  if (passes <= 0) return entries;

  let optimized = entries.map(e => ({ ...e, dias: { ...e.dias } }));

  for (let pass = 0; pass < passes; pass++) {
    optimized = optimizationPass(optimized, context);
  }

  return optimized;
}

function optimizationPass(entries: ScheduleEntry[], context: ScheduleContext): ScheduleEntry[] {
  const totalDays = new Date(context.month.year, context.month.month, 0).getDate();
  const result = entries.map(e => ({ ...e, dias: { ...e.dias } }));

  for (let d = 1; d <= totalDays; d++) {
    const workers = result.filter(e => isTrabalho(e.dias[d]));
    const rested = result.filter(e => isFolgaNormal(e.dias[d]));

    if (workers.length <= 1 || rested.length === 0) continue;

    for (const worker of workers) {
      const workerStreak = countConsecutiveBefore(worker, d);
      if (workerStreak < 5) continue;

      for (const rester of rested) {
        if (trySwap(worker, rester, d, result, totalDays)) break;
      }
    }
  }

  return result;
}

function countConsecutiveBefore(entry: ScheduleEntry, day: number): number {
  let count = 0;
  for (let d = day - 1; d >= 1; d--) {
    if (isTrabalho(entry.dias[d])) count++;
    else break;
  }
  return count;
}

function trySwap(
  worker: ScheduleEntry,
  rester: ScheduleEntry,
  day: number,
  allEntries: ScheduleEntry[],
  totalDays: number,
): boolean {
  const workerAfter = { ...worker, dias: { ...worker.dias, [day]: 'F' as const } };
  const resterAfter = { ...rester, dias: { ...rester.dias, [day]: 'T' as const } };

  let workerMaxConsec = 0;
  let curConsec = 0;
  for (let d = 1; d <= totalDays; d++) {
    if (isTrabalho(workerAfter.dias[d])) {
      curConsec++;
      workerMaxConsec = Math.max(workerMaxConsec, curConsec);
    } else {
      curConsec = 0;
    }
  }

  let resterMaxConsec = 0;
  curConsec = 0;
  for (let d = 1; d <= totalDays; d++) {
    if (isTrabalho(resterAfter.dias[d])) {
      curConsec++;
      resterMaxConsec = Math.max(resterMaxConsec, curConsec);
    } else {
      curConsec = 0;
    }
  }

  if (workerMaxConsec <= 6 && resterMaxConsec <= 6) {
    worker.dias[day] = 'F';
    rester.dias[day] = 'T';
    return true;
  }

  return false;
}
