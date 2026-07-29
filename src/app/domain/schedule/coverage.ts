import type { ScheduleEntry, HourlyCoverage, CoverageGap, PeakHourRequirement, ScheduleContext } from './schedule.types';
import { isTrabalho } from './schedule.types';
import type { TurnoConfig } from './schedule.types';
import { timeToMinutes, extractLunchInterval } from '../shared/shift-window';

export function computeHourlyCoverage(entries: ScheduleEntry[], date: string, turnosConfigs?: TurnoConfig[]): HourlyCoverage[] {
  const coverage: HourlyCoverage[] = [];
  const parts = date.split('-');
  const day = Number(parts[2]);

  if (!turnosConfigs || turnosConfigs.length === 0) {
    const activeCount = entries.filter(e => isTrabalho(e.dias[day])).length;
    return [{
      startTime: '07:00',
      endTime: '22:00',
      activeCount,
      onBreakEmployeeIds: [],
    }];
  }

  for (let h = 7; h <= 22; h++) {
    const startTime = `${String(h).padStart(2, '0')}:00`;
    const endTime = h < 22 ? `${String(h + 1).padStart(2, '0')}:00` : '22:00';

    const active = entries.filter(entry => {
      if (!isTrabalho(entry.dias[day])) return false;
      const cfg = turnosConfigs.find(t => t.nome === entry.turno || entry.turno.includes(t.entrada));
      if (!cfg) return true;

      const horaMin = h * 60;
      const entradaMin = timeToMinutes(cfg.entrada);
      const saidaMin = timeToMinutes(cfg.saida);
      const { inicio: almocoIni, fim: almocoFim } = extractLunchInterval(cfg.nome, cfg.entrada, cfg.saida, cfg.intervaloMinutos);

      return horaMin >= entradaMin && horaMin < saidaMin &&
        !(horaMin >= almocoIni && horaMin < almocoFim);
    });

    coverage.push({
      startTime,
      endTime,
      activeCount: active.length,
      onBreakEmployeeIds: [],
    });
  }

  return coverage;
}

export function findCoverageGaps(
  coverage: HourlyCoverage[],
  requirements: PeakHourRequirement[],
): CoverageGap[] {
  if (requirements.length === 0) return [];
  const gaps: CoverageGap[] = [];

  for (const req of requirements) {
    for (const slot of coverage) {
      if (slot.startTime >= req.startTime && slot.endTime <= req.endTime) {
        if (slot.activeCount < req.minEmployees) {
          gaps.push({
            date: '',
            startTime: slot.startTime,
            endTime: slot.endTime,
            required: req.minEmployees,
            actual: slot.activeCount,
            shortfall: req.minEmployees - slot.activeCount,
          });
        }
      }
    }
  }

  return gaps;
}

export function computeCoverageMetrics(
  entries: ScheduleEntry[],
  context: ScheduleContext,
): { coveragePercent: number; gaps: CoverageGap[] } {
  const totalDays = new Date(context.month.year, context.month.month, 0).getDate();
  let totalSlots = 0;
  let coveredSlots = 0;
  const allGaps: CoverageGap[] = [];

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${context.month.year}-${String(context.month.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const coverage = computeHourlyCoverage(entries, dateStr, context.turnosConfigs);
    const gaps = findCoverageGaps(coverage, context.requirements);

    for (const slot of coverage) {
      totalSlots++;
      const hasGap = gaps.some(g => g.startTime === slot.startTime);
      if (!hasGap) coveredSlots++;
    }

    allGaps.push(...gaps.map(g => ({ ...g, date: dateStr })));
  }

  return {
    coveragePercent: totalSlots > 0 ? (coveredSlots / totalSlots) * 100 : 100,
    gaps: allGaps,
  };
}
