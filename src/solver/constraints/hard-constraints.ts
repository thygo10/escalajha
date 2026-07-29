/**
 * Hard Constraints Auditor & Evaluator (CLT/CCT Inviolável)
 * PRD v4.0 Production Blueprint
 */

import { TipoDiaSigla } from '../core/types';

export class HardConstraintsEvaluator {
  /**
   * H1: Interjornada Mínima de 11h
   * Verifica se o intervalo entre a saída do dia anterior e a entrada do dia atual é >= 11h.
   */
  static validarInterjornada(
    saidaDiaAnteriorStr?: string,
    entradaDiaAtualStr?: string
  ): boolean {
    if (!saidaDiaAnteriorStr || !entradaDiaAtualStr) return true;

    const [hSaida, mSaida] = saidaDiaAnteriorStr.split(':').map(Number);
    const [hEntrada, mEntrada] = entradaDiaAtualStr.split(':').map(Number);

    const minutosSaida = hSaida * 60 + mSaida;
    const minutosEntrada = (hEntrada + 24) * 60 + mEntrada; // adiciona 24h para o dia seguinte

    const descansoMinutos = minutosEntrada - minutosSaida;
    return descansoMinutos >= 11 * 60; // 660 minutos
  }

  /**
   * H2: Teto de 6 Dias Consecutivos
   * Verifica se adicionar mais um dia de trabalho estoura o limite de 6 dias sem folga.
   */
  static validarDiasConsecutivos(
    historicoRecente: TipoDiaSigla[], // Dias anteriores em ordem cronológica
    proximoDiaTrabalho: boolean
  ): boolean {
    if (!proximoDiaTrabalho) return true;

    let consecutivos = 0;
    for (let i = historicoRecente.length - 1; i >= 0; i--) {
      const dia = historicoRecente[i];
      if (dia === 'T' || dia === 'TD' || dia === 'TF') {
        consecutivos++;
      } else {
        break; // encontrou folga
      }
    }

    return consecutivos < 6; // Se já tem 6, não pode trabalhar o 7º dia!
  }

  /**
   * H3: Teto Semanal Rígido de 44h
   * Garante que a soma das horas trabalhadas na semana (Domingo a Sábado) não ultrapasse 44h.
   */
  static validarCargaSemanal(
    horasAcumuladasSemana: number,
    horasNovoDia: number
  ): boolean {
    return (horasAcumuladasSemana + horasNovoDia) <= 44.0;
  }

  /**
   * Converte sigla do dia para boleano (se trabalhou ou não).
   */
  static ehDiaTrabalho(sigla: TipoDiaSigla): boolean {
    return sigla === 'T' || sigla === 'TD' || sigla === 'TF';
  }
}
