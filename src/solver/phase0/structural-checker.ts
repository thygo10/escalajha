/**
 * Structural Feasibility Checker (Fase 0 - O(1))
 * PRD v4.0 Production Blueprint
 */

import { ConstraintFailure, SolverOptions } from '../core/types';

export interface FeasibilityCheckResult {
  viable: boolean;
  failure?: ConstraintFailure;
}

export function checkStructuralFeasibility(
  totalFuncionarios: number,
  options: SolverOptions
): FeasibilityCheckResult {
  if (totalFuncionarios <= 0) {
    return {
      viable: false,
      failure: {
        categoria: 'RESOURCE_SHORTAGE',
        restricaoViolada: 'EFETIVO_ZERO',
        detalhes: 'Não há funcionários ativos no setor para gerar a escala.'
      }
    };
  }

  const minDomingo = options.minFuncionariosDomingo ?? options.minFuncionariosPorDia ?? 1;

  // Checagem da Regra Padrão de Domingos (1x2 -> Trabalha 1, folga 2):
  // Para manter a rotação 1x2, cada vaga no domingo requer um pool de no mínimo 3 funcionários.
  const poolRequerido1x2 = minDomingo * 3;

  if (!options.usarRegraDomingoCustomizada && totalFuncionarios < poolRequerido1x2) {
    return {
      viable: false,
      failure: {
        categoria: 'RULE_CONFLICT',
        restricaoViolada: 'RODIZIO_DOMINGO_1X2_INCOMPATIVEL',
        detalhes: `O setor possui ${totalFuncionarios} colaboradores, mas a regra de domingo 1x2 exige no mínimo ${poolRequerido1x2} colaboradores para cobrir ${minDomingo} vaga(s) por domingo sem gerar infração legal. Ajuste o efetivo ou altere a regra do setor.`
      }
    };
  }

  return { viable: true };
}
