import type { ScheduleEntry, ScheduleContext, ShiftBlock } from './schedule.types';
import type { PlanningResult } from './planner';

export function allocateEmployees(plan: PlanningResult, context: ScheduleContext): ScheduleEntry[] {
  const entries = createEntries(context);
  return entries;
}

function createEntries(context: ScheduleContext): ScheduleEntry[] {
  return context.employees.map(emp => ({
    matricula: emp.matricula_aleatoria,
    nome: emp.primeiro_nome,
    setor: emp.setor,
    turno: emp.turno_padrao,
    genero: emp.genero,
    dias: {},
  }));
}
