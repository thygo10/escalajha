import type { ShiftBlock, ScheduleEntry, PeakHourRequirement, ScheduleContext, TurnoConfig } from './schedule.types';

export interface PlanningResult {
  blocks: ShiftBlock[];
  requiredCount: number;
}

export function planShiftBlocks(context: ScheduleContext): PlanningResult {
  const requiredCount = determineRequiredCount(context);
  const blocks = buildShiftBlocks(context, requiredCount);
  return { blocks, requiredCount };
}

function determineRequiredCount(context: ScheduleContext): number {
  const sectorName = context.employees[0]?.setor?.toLowerCase() || '';
  const isFrontEnd = sectorName.includes('caixa') && !sectorName.includes('fiscal');
  if (isFrontEnd) return Math.max(6, context.employees.length > 10 ? 8 : 6);
  if (sectorName.includes('fiscal')) return Math.min(context.employees.length, 2);
  return Math.min(context.employees.length, Math.ceil(context.employees.length * 0.8));
}

function buildShiftBlocks(context: ScheduleContext, requiredCount: number): ShiftBlock[] {
  const turnos = context.turnosConfigs;
  if (!turnos || turnos.length === 0) {
    return [{
      startTime: '07:00',
      endTime: '22:00',
      requiredCount,
      assignedEmployeeIds: [],
    }];
  }

  return turnos.map(t => ({
    startTime: t.entrada,
    endTime: t.saida,
    requiredCount: Math.ceil(requiredCount / turnos.length),
    assignedEmployeeIds: [],
  }));
}
