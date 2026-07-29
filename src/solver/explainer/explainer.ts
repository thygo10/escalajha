/**
 * Motor de Explicabilidade Técnica das Escalas (PRD v4.0)
 * Gera a justificativa legal/operacional em linguagem natural para cada folga ou turno.
 */

import { TipoDiaSigla } from '../core/types';

export class ScheduleExplainer {
  static gerarMotivoDia(
    tipoDia: TipoDiaSigla,
    diaSemana: number, // 0 = Domingo, 1 = Segunda...
    consecutivosAntes: number,
    genero: 'M' | 'F',
    feriadoNome?: string
  ): string {
    if (feriadoNome) {
      return `Folga concedida em virtude do feriado [${feriadoNome}] por revezamento alternado de grupo.`;
    }

    switch (tipoDia) {
      case 'FD':
        return `Folga de Domingo concedida para cumprimento do descanso semanal remunerado (DSR) e regra de rodízio dominical.`;
      case 'F':
        if (consecutivosAntes >= 5) {
          return `Folga DSR concedida obrigatoriamente para cumprir o teto legal da CLT de no máximo 6 dias de trabalho consecutivos.`;
        }
        return `Folga semanal DSR alocada para manutenção do espaçamento equilibrado de descansos no mês.`;
      case 'FE':
        return `Folga estipulada em acordo de compensação de jornada semanal (teto de 44h).`;
      case 'T':
      case 'TD':
      case 'TF':
        return `Escala normal de trabalho em turno regular.`;
      default:
        return `Alocação operacional regular.`;
    }
  }
}
