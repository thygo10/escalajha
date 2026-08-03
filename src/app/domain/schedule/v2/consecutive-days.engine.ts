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
        // É OBRIGATÓRIO conceder folga para quebrar a sequência.
        // Prioridade: folga retroativa num dia 'T' limpo (sem folgas adjacentes,
        // sem folga picada, sem domingo), começando do próprio dia d. A âncora
        // (domingo trabalhado TD / feriado TF) NUNCA é convertida se houver alternativa.
        let targetDay = -1;
        for (let back = 0; back <= 5; back++) {
          const candidate = d - back;
          if (candidate < 1) break;
          if (resultDias[candidate] !== 'T') continue;
          const hasAdjacentRest = isRestDay(resultDias[candidate - 1]) || isRestDay(resultDias[candidate + 1]);
          const hasPicada = isRestDay(resultDias[candidate - 2]) || isRestDay(resultDias[candidate + 2]);
          if (hasAdjacentRest || hasPicada) continue;
          targetDay = candidate;
          break;
        }

        if (targetDay > 0) {
          resultDias[targetDay] = 'F';
          motivos[targetDay] = 'Ajuste obrigatório CLT Art. 67: Limite de 6 dias consecutivos superado.';
          currentConsecutive = d - targetDay;
        } else if (currentTipo === 'TD' || currentTipo === 'TF') {
          // Sem alternativa retroativa: converter a âncora (último recurso)
          resultDias[d] = currentTipo === 'TD' ? 'FD' : 'F';
          motivos[d] = 'Ajuste obrigatório CLT Art. 67: Limite de 6 dias consecutivos superado (sem dia retroativo disponível).';
          currentConsecutive = 0;
        } else {
          resultDias[d] = 'F';
          motivos[d] = 'Ajuste obrigatório CLT Art. 67: Limite de 6 dias consecutivos superado.';
          currentConsecutive = 0;
        }
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
