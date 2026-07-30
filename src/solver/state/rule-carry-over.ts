/**
 * Rule-Based Carry-Over State Machine (PRD v4.0)
 * Gerencia a continuidade temporal inter-mensal por estado de regras.
 */

import { FuncionarioEstadoRegra } from '../core/types';

export class RuleCarryOverManager {
  private readonly estados = new Map<string, FuncionarioEstadoRegra>();

  constructor(initialStates?: Map<string, FuncionarioEstadoRegra>) {
    if (initialStates) {
      initialStates.forEach((val, key) => this.estados.set(key, { ...val }));
    }
  }

  temHistorico(funcionarioId: string): boolean {
    return this.estados.has(funcionarioId);
  }

  exportarEstados(): Map<string, FuncionarioEstadoRegra> {
    const copia = new Map<string, FuncionarioEstadoRegra>();
    this.estados.forEach((val, key) => copia.set(key, { ...val }));
    return copia;
  }

  getEstado(funcionarioId: string): FuncionarioEstadoRegra {
    if (!this.estados.has(funcionarioId)) {
      return {
        funcionarioId,
        domingosDescansoRestantes: 0,
        domingosConsecutivosTrabalhados: 0,
        grupoUltimoFeriadoTrabalhado: 'A',
        diasConsecutivosAcumulados: 0
      };
    }
    return this.estados.get(funcionarioId)!;
  }

  setEstado(funcionarioId: string, estado: Partial<FuncionarioEstadoRegra>): void {
    const atual = this.getEstado(funcionarioId);
    this.estados.set(funcionarioId, {
      ...atual,
      ...estado
    });
  }

  /**
   * Calcula quantos dias de trabalho consecutivos o funcionário já traz do fim do mês anterior.
   */
  getDiasConsecutivosIniciais(funcionarioId: string): number {
    return this.getEstado(funcionarioId).diasConsecutivosAcumulados || 0;
  }

  /**
   * Verifica se o funcionário DEVE obrigatoriamente folgar no domingo do mês atual por dívida de descanso do mês anterior.
   */
  deveFolgarDomingoPorDivida(funcionarioId: string, dataDomingoStr: string): boolean {
    const estado = this.getEstado(funcionarioId);
    if (estado.domingosDescansoRestantes > 0) {
      return true;
    }
    return false;
  }

  /**
   * Atualiza a máquina de estados após a alocação de um domingo.
   */
  registrarAlocacaoDomingo(funcionarioId: string, dataDomingoStr: string, foiTrabalho: boolean, regra: '1x2' | '1x1' | '3x1'): void {
    const estado = this.getEstado(funcionarioId);
    if (foiTrabalho) {
      const descansosNessesários = regra === '1x2' ? 2 : 1;
      this.setEstado(funcionarioId, {
        ultimoDomingoTrabalhado: dataDomingoStr,
        domingosDescansoRestantes: descansosNessesários
      });
    } else {
      const descansosRestantes = Math.max(0, estado.domingosDescansoRestantes - 1);
      this.setEstado(funcionarioId, {
        domingosDescansoRestantes: descansosRestantes
      });
    }
  }
}
