import type { ScheduleEntry, ScheduleContext } from './schedule.types';
import type { PlanningResult } from './planner';

export function allocateEmployees(plan: PlanningResult, context: ScheduleContext): ScheduleEntry[] {
  return createEntries(context);
}

function createEntries(context: ScheduleContext): ScheduleEntry[] {
  const { year, month } = context.month;
  const totalDays = new Date(year, month, 0).getDate();

  // Mapear feriados
  const feriadosSet = new Set<number>();
  if (context.holidays) {
    context.holidays.forEach(h => {
      const d = new Date(h.data + 'T00:00:00');
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        feriadosSet.add(d.getDate());
      }
    });
  }

  return context.employees.map((emp, empIdx) => {
    const dias: Record<number, any> = {};
    let domCount = 0;
    let diasConsecutivos = 0;

    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, month - 1, day);
      const isSunday = dateObj.getDay() === 0;
      const isHoliday = feriadosSet.has(day);

      if (isSunday) {
        domCount++;
        // Matriz de 3 Grupos para Domingo (1T : 2F)
        const grupo = (empIdx % 3);
        const trabalhaDom = (domCount % 3 === grupo);
        if (trabalhaDom) {
          dias[day] = isHoliday ? 'TF' : 'TD';
          diasConsecutivos++;
        } else {
          dias[day] = 'FD';
          diasConsecutivos = 0;
        }
      } else if (isHoliday) {
        const trabalhaFer = (empIdx % 2 === 0);
        if (trabalhaFer) {
          dias[day] = 'TF';
          diasConsecutivos++;
        } else {
          dias[day] = 'FE';
          diasConsecutivos = 0;
        }
      } else {
        // Garantir no máximo 6 dias consecutivos de trabalho
        if (diasConsecutivos >= 6) {
          dias[day] = 'F';
          diasConsecutivos = 0;
        } else {
          dias[day] = 'T';
          diasConsecutivos++;
        }
      }
    }

    return {
      matricula: emp.matricula_aleatoria,
      nome: emp.primeiro_nome,
      setor: emp.setor,
      turno: emp.turno_padrao || '08:00 às 17:00',
      genero: emp.genero || 'F',
      dias,
    };
  });
}

