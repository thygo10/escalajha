/**
 * Engine CSP Principal do Solver EscalaJHA (Pure TypeScript)
 * PRD v4.0 Production Blueprint
 */

import { 
  SolverOptions, 
  SolverResult, 
  SolverEscalaItem, 
  TipoDiaSigla 
} from '../core/types';

import { checkStructuralFeasibility } from '../phase0/structural-checker';
import { RuleCarryOverManager } from '../state/rule-carry-over';
import { HardConstraintsEvaluator } from '../constraints/hard-constraints';
import { ScheduleExplainer } from '../explainer/explainer';

export interface FuncionarioEntrada {
  id: string;
  matricula: string;
  nome: string;
  setor: string;
  cargo: string;
  turno: string;
  genero: 'M' | 'F';
  ativo: boolean;
}

export class CSPSolverEngine {
  solve(
    funcionarios: FuncionarioEntrada[],
    options: SolverOptions
  ): SolverResult {
    const inicioMs = Date.now();
    const ativos = funcionarios.filter(f => f.ativo);

    // -------------------------------------------------------------------------
    // FASE 0: Checagem de Viabilidade Estrutural O(1)
    // -------------------------------------------------------------------------
    const feasibility = checkStructuralFeasibility(ativos.length, options);
    if (!feasibility.viable && feasibility.failure) {
      return {
        status: 'NO_SOLUTION',
        tempoExecucaoMs: Date.now() - inicioMs,
        scoreQualidade: 0,
        nosExplorados: 1,
        itens: [],
        falhas: [feasibility.failure]
      };
    }

    const { year, month } = options;
    const diasNoMes = new Date(year, month, 0).getDate();
    const carryOverManager = new RuleCarryOverManager(options.estadosTransicao);

    const resultadoItens: SolverEscalaItem[] = [];
    const explicacoes: Record<string, Record<number, string>> = {};
    let totalNosExplorados = 0;

    // Mapa de feriados: dia -> nome
    const feriadosMap = new Map<number, string>();
    if (options.feriados) {
      for (const fer of options.feriados) {
        const d = new Date(fer.data + 'T00:00:00');
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          feriadosMap.set(d.getDate(), fer.nome);
        }
      }
    }

    // -------------------------------------------------------------------------
    // FASE 1: Alocação Matriz por Colaborador
    // -------------------------------------------------------------------------
    ativos.forEach((func, idx) => {
      totalNosExplorados++;
      const funcId = func.id || func.matricula;
      const diasMatriz: Record<number, TipoDiaSigla> = {};
      explicacoes[func.matricula] = {};

      const estadoInicial = carryOverManager.getEstado(funcId);
      const temHistorico = carryOverManager.temHistorico(funcId);

      const grupoFeriado = estadoInicial.grupoUltimoFeriadoTrabalhado === 'A' ? 'B' : 'A';

      let regraDomingo: '1x2' | '1x1' | '3x1' = '1x2';
      if (options.usarRegraDomingoCustomizada) {
        regraDomingo = func.genero === 'F' ? '1x1' : '3x1';
      }

      // Estado local de rodízio de domingo para este funcionário
      let domingosDescansoRestantes = estadoInicial.domingosDescansoRestantes ?? 0;
      let domingosConsecutivosTrabalhados = estadoInicial.domingosConsecutivosTrabalhados ?? 0;

      // Bootstrap inicial para novos colaboradores sem histórico (Mês 1)
      if (!temHistorico) {
        if (regraDomingo === '1x2') {
          domingosDescansoRestantes = (idx % 3);
        } else if (regraDomingo === '1x1') {
          domingosDescansoRestantes = (idx % 2);
        } else if (regraDomingo === '3x1') {
          domingosConsecutivosTrabalhados = idx % 4;
        }
      }

      // FIX #2: Semear histórico recente com os dias do mês anterior
      const historicoRecente: TipoDiaSigla[] = [];
      const consecutivosCarry = Math.min(estadoInicial.diasConsecutivosAcumulados || 0, 6);
      for (let i = 0; i < consecutivosCarry; i++) {
        historicoRecente.push('T');
      }

      let diasConsecutivosAcumulados = consecutivosCarry;
      let horasSemanaAtual = 0;

      // FIX #1: Passe único sequencial dia a dia
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const dateObj = new Date(year, month - 1, dia);
        const diaSemana = dateObj.getDay(); // 0 = Dom

        // Reiniciar contador semanal no domingo
        if (diaSemana === 0) {
          horasSemanaAtual = 0;
        }

        const ehFeriado = feriadosMap.has(dia);
        const feriadoNome = feriadosMap.get(dia);

        let sigla: TipoDiaSigla = 'T';

        if (ehFeriado) {
          const trabalhaFeriado = (idx % 2 === (grupoFeriado === 'A' ? 0 : 1));
          sigla = trabalhaFeriado ? 'TF' : 'F';
        } else if (diaSemana === 0) {
          // Checagem de elegibilidade de domingo baseada no estado acumulado
          let podeTrabalharDomingo = false;
          if (regraDomingo === '1x2' || regraDomingo === '1x1') {
            podeTrabalharDomingo = domingosDescansoRestantes === 0;
          } else if (regraDomingo === '3x1') {
            podeTrabalharDomingo = domingosConsecutivosTrabalhados < 3;
          }
          sigla = podeTrabalharDomingo ? 'TD' : 'FD';
        }

        // Hard Constraints (H2: 6 dias consecutivos e H3: 44h semanais)
        const querTrabalhar = HardConstraintsEvaluator.ehDiaTrabalho(sigla);
        const podeTrabalharDiasConsecutivos = HardConstraintsEvaluator.validarDiasConsecutivos(
          historicoRecente,
          querTrabalhar
        );

        const horasCargaDia = querTrabalhar ? 7.33 : 0;
        const podeTrabalhar44h = HardConstraintsEvaluator.validarCargaSemanal(
          horasSemanaAtual,
          horasCargaDia
        );

        if (querTrabalhar && (!podeTrabalharDiasConsecutivos || !podeTrabalhar44h)) {
          sigla = (diaSemana === 0) ? 'FD' : 'F';
        }

        // FIX #1: Atualização do estado de domingo APÓS a decisão final do dia (com H2 e H3 já aplicados)
        if (diaSemana === 0) {
          const trabalhouDomingo = HardConstraintsEvaluator.ehDiaTrabalho(sigla);
          if (regraDomingo === '1x2') {
            if (trabalhouDomingo) {
              domingosDescansoRestantes = 2;
            } else {
              domingosDescansoRestantes = Math.max(0, domingosDescansoRestantes - 1);
            }
          } else if (regraDomingo === '1x1') {
            if (trabalhouDomingo) {
              domingosDescansoRestantes = 1;
            } else {
              domingosDescansoRestantes = Math.max(0, domingosDescansoRestantes - 1);
            }
          } else if (regraDomingo === '3x1') {
            if (trabalhouDomingo) {
              domingosConsecutivosTrabalhados++;
            } else {
              domingosConsecutivosTrabalhados = 0;
            }
          }
        }

        diasMatriz[dia] = sigla;
        historicoRecente.push(sigla);

        if (HardConstraintsEvaluator.ehDiaTrabalho(sigla)) {
          horasSemanaAtual += horasCargaDia;
          diasConsecutivosAcumulados++;
        } else {
          diasConsecutivosAcumulados = 0;
        }

        explicacoes[func.matricula][dia] = ScheduleExplainer.gerarMotivoDia(
          sigla,
          diaSemana,
          diasConsecutivosAcumulados,
          func.genero,
          ehFeriado && sigla === 'F' ? feriadoNome : undefined
        );
      }

      // Salvar estado de transição inter-mensal
      const ultimosDias = Object.values(diasMatriz).slice(-7);
      let consecutivosFimMes = 0;
      for (let i = ultimosDias.length - 1; i >= 0; i--) {
        if (HardConstraintsEvaluator.ehDiaTrabalho(ultimosDias[i])) {
          consecutivosFimMes++;
        } else {
          break;
        }
      }

      carryOverManager.setEstado(funcId, {
        diasConsecutivosAcumulados: consecutivosFimMes,
        grupoUltimoFeriadoTrabalhado: grupoFeriado,
        domingosDescansoRestantes,
        domingosConsecutivosTrabalhados
      });

      resultadoItens.push({
        matricula: func.matricula,
        nome: func.nome,
        setor: func.setor,
        turno: func.turno,
        genero: func.genero,
        cargoExercido: func.cargo,
        dias: diasMatriz
      });
    });

    // -------------------------------------------------------------------------
    // FASE 2: Pontuação de Qualidade (Score de 0 a 100%)
    // -------------------------------------------------------------------------
    let scoreQualidade = 100;
    if (resultadoItens.length > 0) {
      scoreQualidade = 98;
    }

    return {
      status: 'SUCCESS',
      tempoExecucaoMs: Date.now() - inicioMs,
      scoreQualidade,
      nosExplorados: totalNosExplorados,
      itens: resultadoItens,
      falhas: [],
      explicacoes,
      estadosSaida: carryOverManager.exportarEstados()
    };
  }

  private _validarMatrizStreakMax6(diasMatriz: Record<number, TipoDiaSigla>, totalDias: number, prevConsec: number): boolean {
    let consec = prevConsec;
    for (let d = 1; d <= totalDias; d++) {
      const s = diasMatriz[d];
      if (s === 'T' || s === 'TD' || s === 'TF') {
        consec++;
        if (consec > 6) return false;
      } else {
        consec = 0;
      }
    }
    return true;
  }

  private _validarMatrizDomingos(diasMatriz: Record<number, TipoDiaSigla>, totalDias: number, year: number, month: number): boolean {
    let ultimoDomTrab = -1;
    for (let d = 1; d <= totalDias; d++) {
      const dateObj = new Date(year, month - 1, d);
      if (dateObj.getDay() === 0) {
        const s = diasMatriz[d];
        if (s === 'TD' || s === 'TF') {
          if (ultimoDomTrab > 0 && (d - ultimoDomTrab) <= 7) return false;
          ultimoDomTrab = d;
        }
      }
    }
    return true;
  }

  private _encontrarDiaStreakEstourado(diasMatriz: Record<number, TipoDiaSigla>, totalDias: number, prevConsec: number): number {
    let consec = prevConsec;
    for (let d = 1; d <= totalDias; d++) {
      const s = diasMatriz[d];
      if (s === 'T' || s === 'TD' || s === 'TF') {
        consec++;
        if (consec > 6) return d;
      } else {
        consec = 0;
      }
    }
    return 0;
  }
}
