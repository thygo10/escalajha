import { Feriado, TipoDia } from '../../../models/types';
import { YearMonth } from '../../shared/year-month';

export interface HolidayAssignment {
  day: number;
  tipo: TipoDia; // 'FE' (Feriado Fechado), 'TF' (Trabalho Feriado) ou 'F' (Folga Feriado)
  feriadoNome: string;
}

/**
 * Calcula a atribuição de feriados para o mês conforme os Grupos A e B.
 */
export function calculateHolidayAssignments(
  month: YearMonth,
  grupoFeriado: string,
  holidays: Feriado[] = []
): HolidayAssignment[] {
  if (!holidays || holidays.length === 0) return [];

  const normalizedGroup = (grupoFeriado || 'A').toUpperCase();
  const assignments: HolidayAssignment[] = [];

  // Filtra feriados do mês atual
  const monthHolidays = holidays.filter(h => {
    if (!h.data) return false;
    const parts = h.data.split('-');
    const hYear = Number.parseInt(parts[0], 10);
    const hMonth = Number.parseInt(parts[1], 10);
    return hYear === month.year && hMonth === month.month;
  });

  monthHolidays.forEach((h, index) => {
    const dayNumber = Number.parseInt(h.data.split('-')[2], 10);

    if (h.funcionamento_proibido) {
      // Loja fechada
      assignments.push({
        day: dayNumber,
        tipo: 'FE',
        feriadoNome: h.nome
      });
    } else {
      // Feriado Aberto: Alternância por grupo (A vs B)
      // index 0-based
      const isGroupAWorked = index % 2 === 0;
      let isWorked = false;

      if (normalizedGroup === 'A') {
        isWorked = isGroupAWorked;
      } else {
        isWorked = !isGroupAWorked;
      }

      assignments.push({
        day: dayNumber,
        tipo: isWorked ? 'TF' : 'F',
        feriadoNome: h.nome
      });
    }
  });

  return assignments;
}
