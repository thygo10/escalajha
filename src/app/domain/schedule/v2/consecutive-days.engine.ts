import { TipoDia } from '../../../models/types';
import { YearMonth, totalDaysInMonth } from '../../shared/year-month';

export interface ConsecutiveDaysAdjustmentResult {
  dias: Record<number, TipoDia>;
  motivosAlteracao: Record<number, string>;
  consecutiveDaysAtEnd: number;
}

export function isWorkDay(tipo?: TipoDia): boolean {
  return tipo === 'T' || tipo === 'TD' || tipo === 'TF';
}

export function isRestDay(tipo?: TipoDia): boolean {
  return tipo === 'F' || tipo === 'FD' || tipo === 'FE' || tipo === 'AF' || tipo === 'FR';
}

/**
 * Valida e ajusta a escala para garantir estritamente que NENHUM funcionário
 * trabalhe 7 ou mais dias consecutivos (Art. 67 CLT - Máximo 6 dias).
 *
 * Leva em consideração os dias já trabalhados no final do mês anterior.
 */
export function enforceMaxConsecutiveDays(
  month: YearMonth,
  diasMap: Record<number, TipoDia>,
  consecutiveDaysAtStart: number = 0
): ConsecutiveDaysAdjustmentResult {
  const totalDays = totalDaysInMonth(month);
  const resultDias: Record<number, TipoDia> = { ...diasMap };
  const motivos: Record<number, string> = {};

  let currentConsecutive = consecutiveDaysAtStart;

  for (let d = 1; d <= totalDays; d++) {
    const currentTipo = resultDias[d] || 'T';

    if (isWorkDay(currentTipo)) {
      currentConsecutive++;

      if (currentConsecutive >= 7) {
        // VIOLAÇÃO CLT! É o 7º dia consecutivo de trabalho.
        // É OBRIGATÓRIO conceder folga neste dia.
        if (currentTipo === 'TD') {
          resultDias[d] = 'FD';
        } else {
          resultDias[d] = 'F';
        }

        motivos[d] = 'Ajuste obrigatório CLT Art. 67: Limite de 6 dias consecutivos superado.';
        currentConsecutive = 0;
      }
    } else {
      // Dia de descanso/afastamento reseta o contador
      currentConsecutive = 0;
    }
  }

  return {
    dias: resultDias,
    motivosAlteracao: motivos,
    consecutiveDaysAtEnd: currentConsecutive
  };
}
