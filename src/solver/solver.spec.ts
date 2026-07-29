import { describe, it, expect } from 'vitest';
import { checkStructuralFeasibility } from './phase0/structural-checker';
import { CSPSolverEngine, FuncionarioEntrada } from './search/csp-solver';
import { HardConstraintsEvaluator } from './constraints/hard-constraints';

describe('CSPSolverEngine & Core Solver (PRD v4.0)', () => {
  describe('Fase 0: Structural Feasibility Checker', () => {
    it('deve retornar NO_SOLUTION (RULE_CONFLICT) quando o efetivo for insuficiente para domingo 1x2', () => {
      // Exemplo: 2 caixas com mínimo de 1 no domingo (regra 1x2 exige 3)
      const res = checkStructuralFeasibility(2, {
        year: 2026,
        month: 8,
        minFuncionariosDomingo: 1,
        usarRegraDomingoCustomizada: false
      });

      expect(res.viable).toBe(false);
      expect(res.failure?.categoria).toBe('RULE_CONFLICT');
      expect(res.failure?.restricaoViolada).toBe('RODIZIO_DOMINGO_1X2_INCOMPATIVEL');
    });

    it('deve aprovar viabilidade se o efetivo for suficiente para domingo 1x2', () => {
      const res = checkStructuralFeasibility(3, {
        year: 2026,
        month: 8,
        minFuncionariosDomingo: 1,
        usarRegraDomingoCustomizada: false
      });

      expect(res.viable).toBe(true);
    });
  });

  describe('Hard Constraints Evaluator (CLT)', () => {
    it('deve proibir trabalhar mais de 6 dias consecutivos', () => {
      const historico6dias: ('T' | 'F')[] = ['T', 'T', 'T', 'T', 'T', 'T'];
      const podeTrabalhar7o = HardConstraintsEvaluator.validarDiasConsecutivos(historico6dias, true);
      expect(podeTrabalhar7o).toBe(false);
    });

    it('deve permitir trabalhar se houve folga recente', () => {
      const historicoComFolga: ('T' | 'F')[] = ['T', 'T', 'F', 'T', 'T', 'T'];
      const podeTrabalhar = HardConstraintsEvaluator.validarDiasConsecutivos(historicoComFolga, true);
      expect(podeTrabalhar).toBe(true);
    });

    it('deve proibir estourar 44h semanais', () => {
      const horasAtuais = 40;
      const podeNovoDia = HardConstraintsEvaluator.validarCargaSemanal(horasAtuais, 7.33);
      expect(podeNovoDia).toBe(false);
    });
  });

  describe('CSPSolverEngine Execution', () => {
    it('deve gerar escala com 0 infração para equipe válida', () => {
      const funcs: FuncionarioEntrada[] = [
        { id: '1', matricula: '100001', nome: 'João', setor: 'Caixa', cargo: 'Caixa', turno: '08:00 às 16:20', genero: 'M', ativo: true },
        { id: '2', matricula: '100002', nome: 'Maria', setor: 'Caixa', cargo: 'Caixa', turno: '08:00 às 16:20', genero: 'F', ativo: true },
        { id: '3', matricula: '100003', nome: 'Carlos', setor: 'Caixa', cargo: 'Caixa', turno: '08:00 às 16:20', genero: 'M', ativo: true }
      ];

      const solver = new CSPSolverEngine();
      const res = solver.solve(funcs, {
        year: 2026,
        month: 8,
        minFuncionariosPorDia: 1
      });

      expect(res.status).toBe('SUCCESS');
      expect(res.itens.length).toBe(3);
      expect(res.scoreQualidade).toBeGreaterThanOrEqual(90);

      // Verificar que nenhum funcionário trabalhou 7 dias seguidos
      res.itens.forEach(item => {
        let maxConsecutivos = 0;
        let atualConsecutivos = 0;
        Object.values(item.dias).forEach(sigla => {
          if (sigla === 'T' || sigla === 'TD' || sigla === 'TF') {
            atualConsecutivos++;
            if (atualConsecutivos > maxConsecutivos) maxConsecutivos = atualConsecutivos;
          } else {
            atualConsecutivos = 0;
          }
        });
        expect(maxConsecutivos).toBeLessThanOrEqual(6);
      });
    });
  });
});
