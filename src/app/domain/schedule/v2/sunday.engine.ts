import { TipoDia } from '../../../models/types';
import { YearMonth, getSundays } from '../../shared/year-month';

export interface SundayAssignment {
  day: number;
  tipo: TipoDia; // 'TD' (Trabalho Domingo) ou 'FD' (Folga Domingo)
}

/**
 * Retorna os dias de domingo do mês com o status 'TD' ou 'FD' para o grupo informado.
 * Rotação 1T : 2F (Grupos A, B, C)
 */
export function calculateSundayAssignments(
  month: YearMonth,
  grupoDomingo: string
): SundayAssignment[] {
  const sundays = getSundays(month);
  const normalizedGroup = (grupoDomingo || 'A').toUpperCase();

  return sundays.map((dayNumber, index) => {
    // index 0-based: s = index + 1
    const s = index + 1;
    let isWorked = false;

    if (normalizedGroup === 'A') {
      isWorked = s % 3 === 1; // 1º, 4º, 7º domingos...
    } else if (normalizedGroup === 'B') {
      isWorked = s % 3 === 2; // 2º, 5º, 8º domingos...
    } else if (normalizedGroup === 'C') {
      isWorked = s % 3 === 0; // 3º, 6º, 9º domingos...
    } else {
      // Default fallback se for grupo customizado: grupo A
      isWorked = s % 3 === 1;
    }

    return {
      day: dayNumber,
      tipo: isWorked ? 'TD' : 'FD'
    };
  });
}
