import { Feriado, TipoDia } from '../../../models/types';
import { YearMonth, isSunday, getAbsoluteHolidayIndex } from '../../shared/year-month';

export interface HolidayAssignment {
  day: number;
  tipo: TipoDia; // 'FE' (Feriado Fechado), 'TF' (Trabalho Feriado) ou 'F' (Folga Feriado)
  feriadoNome: string;
}

/**
 * Calcula a atribuição de feriados para o mês conforme os Grupos A e B.
 * - Feriado fechado (loja fechada): FE para todos, vence qualquer atribuição.
 * - Feriado aberto em dia útil: alternância global A/B por índice absoluto
 *   do feriado aberto (1º aberto do ano = A trabalha, 2º = B trabalha, ...).
 * - Feriado aberto em domingo: a rotação 1T:2F de domingo tem precedência;
 *   nenhuma atribuição é emitida (o domingo já decidiu TD/FD).
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

  monthHolidays.forEach(h => {
    const dayNumber = Number.parseInt(h.data.split('-')[2], 10);

    if (h.funcionamento_proibido) {
      // Loja fechada
      assignments.push({
        day: dayNumber,
        tipo: 'FE',
        feriadoNome: h.nome
      });
    } else if (isSunday(month, dayNumber)) {
      // Domingo + feriado aberto: rotação de domingo tem precedência
      return;
    } else {
      // Feriado Aberto em dia útil: Alternância global A/B (igual motor v1)
      const absHolidayIdx = getAbsoluteHolidayIndex(h.data, holidays as Array<{ data: string; funcionamento_proibido?: boolean }>);
      const groupIdx = normalizedGroup === 'B' ? 1 : 0;
      const isWorked = (absHolidayIdx % 2) === groupIdx;

      assignments.push({
        day: dayNumber,
        tipo: isWorked ? 'TF' : 'F',
        feriadoNome: h.nome
      });
    }
  });

  return assignments;
}
