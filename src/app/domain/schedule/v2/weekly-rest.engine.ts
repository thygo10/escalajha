import { TipoDia } from '../../../models/types';
import { YearMonth, totalDaysInMonth, isSunday } from '../../shared/year-month';

const GROUP_DAY_MAP: Record<string, number> = {
  'S1': 1, // Segunda-feira
  'S2': 2, // Terça-feira
  'S3': 3, // Quarta-feira
  'S4': 4, // Quinta-feira
  'S5': 5  // Sexta-feira
};

function getDayOfWeek(ym: YearMonth, day: number): number {
  return new Date(ym.year, ym.month - 1, day).getDay();
}

/**
 * Atribui a folga compensatória semanal (entre Segunda e Sexta)
 * APENAS nas semanas em que o funcionário TRABALHOU no domingo.
 */
export function assignWeeklyRests(
  month: YearMonth,
  diasMap: Record<number, TipoDia>,
  grupoFolgaCompensatoria: string
): Record<number, TipoDia> {
  const totalDays = totalDaysInMonth(month);
  const result: Record<number, TipoDia> = { ...diasMap };

  // Identifica todos os domingos do mês
  const sundayDays: number[] = [];
  for (let d = 1; d <= totalDays; d++) {
    if (isSunday(month, d)) {
      sundayDays.push(d);
    }
  }

  const preferredWeekday = GROUP_DAY_MAP[(grupoFolgaCompensatoria || 'S1').toUpperCase()] ?? 5; // Default Sexta

  sundayDays.forEach((sunDay) => {
    const isWorked = result[sunDay] === 'TD' || result[sunDay] === 'T';

    if (isWorked) {
      // Funcionário TRABALHOU no domingo -> adquire direito a 1 folga compensatória na semana.
      // Identifica os dias úteis (Segunda a Sexta) da semana referente a esse domingo.
      // Priorizamos a janela de Segunda a Sexta que ANTECEDE o domingo (semana de Seg a Dom),
      // pois se o domingo anterior foi FD (folga), o período entre a última folga e este domingo
      // acumulou 6 dias consecutivos. Dar a folga na sexta antes do domingo previne o 7º dia!

      const candidateWeekdaysPreceding: number[] = [];
      for (let offset = 6; offset >= 1; offset--) {
        const candidate = sunDay - offset;
        if (candidate >= 1 && !isSunday(month, candidate)) {
          const dow = getDayOfWeek(month, candidate);
          if (dow >= 1 && dow <= 5) { // Segunda (1) a Sexta (5)
            candidateWeekdaysPreceding.push(candidate);
          }
        }
      }

      const candidateWeekdaysFollowing: number[] = [];
      for (let offset = 1; offset <= 5; offset++) {
        const candidate = sunDay + offset;
        if (candidate <= totalDays && !isSunday(month, candidate)) {
          const dow = getDayOfWeek(month, candidate);
          if (dow >= 1 && dow <= 5) {
            candidateWeekdaysFollowing.push(candidate);
          }
        }
      }

      // Escolhe a janela válida (Preceding primeiro se tiver pelo menos 3 dias úteis no mês, senão Following)
      let candidateWeekdays = candidateWeekdaysPreceding;
      if (candidateWeekdaysPreceding.length < 3 && candidateWeekdaysFollowing.length > 0) {
        candidateWeekdays = candidateWeekdaysFollowing;
      }

      if (candidateWeekdays.length > 0) {
        // Tenta encontrar o dia preferencial do grupo na janela selecionada
        let targetDay = candidateWeekdays.find(d => getDayOfWeek(month, d) === preferredWeekday);

        // Se o dia preferencial não estiver disponível na janela primária, tenta na janela secundária
        if (!targetDay) {
          const secondaryCandidates = candidateWeekdays === candidateWeekdaysPreceding ? candidateWeekdaysFollowing : candidateWeekdaysPreceding;
          targetDay = secondaryCandidates.find(d => getDayOfWeek(month, d) === preferredWeekday);
        }

        // Se ainda assim não encontrou ou o dia for feriado FE, pega o primeiro dia útil disponível
        if (!targetDay || result[targetDay] === 'FE') {
          targetDay = candidateWeekdays.find(d => result[d] !== 'FE' && result[d] !== 'FD');
        }

        if (targetDay && result[targetDay] !== 'FE') {
          result[targetDay] = 'F';
        }
      }
    }
  });

  return result;
}
