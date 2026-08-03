import { TipoDia } from '../../../models/types';
import { YearMonth, getSundays } from '../../shared/year-month';

export interface SundayAssignment {
  day: number;
  tipo: TipoDia; // 'TD' (Trabalho Domingo) ou 'FD' (Folga Domingo)
}

/**
 * Retorna os dias de domingo do mês com o status 'TD' ou 'FD' para o grupo informado.
 * Rotação 1T:2F (Grupos A, B, C) para setores com 3 grupos.
 * Rotação 2T:1F (exceção CCT Padaria/Açougue, setores com 2 grupos):
 * - Homens: trabalham 2 de cada 3 domingos;
 * - Mulheres: trabalham 1 de cada 3 domingos (CLT Art. 386).
 */
export function calculateSundayAssignments(
  month: YearMonth,
  grupoDomingo: string,
  opts?: { genero?: 'M' | 'F'; twoGroups?: boolean }
): SundayAssignment[] {
  const sundays = getSundays(month);
  const normalizedGroup = (grupoDomingo || 'A').toUpperCase();
  const genero = opts?.genero ?? 'M';
  const twoGroups = opts?.twoGroups ?? false;

  const groupIdx = normalizedGroup === 'B' ? 1 : 0;

  return sundays.map((dayNumber, index) => {
    // index 0-based: s = index + 1
    const s = index + 1;
    let isWorked = false;

    if (twoGroups) {
      if (genero === 'M') {
        isWorked = (s % 3) !== (groupIdx % 3); // 2T:1F — folga 1 de cada 3 domingos
      } else {
        isWorked = (s % 3) === (groupIdx % 3); // CLT 386 — 1T:2F
      }
    } else if (normalizedGroup === 'A') {
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
