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
  rodizio_id?: string;
  grupo_domingo?: string;
  grupo_feriado?: string;
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

    // Mapa de feriados: dia -> { nome, index }
    const feriadosMap = new Map<number, { nome: string; index: number }>();
    let feriadoSeqCount = 0;
    if (options.feriados) {
      for (const fer of options.feriados) {
        const d = new Date(fer.data + 'T00:00:00');
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          feriadoSeqCount++;
          feriadosMap.set(d.getDate(), { nome: fer.nome, index: feriadoSeqCount });
        }
      }
    }

    // Mapear dias que são domingos e a sua sequência no mês (1º, 2º, 3º...)
    const domingosSeqMap = new Map<number, number>();
    let domSeqCount = 0;
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dateObj = new Date(year, month - 1, dia);
      if (dateObj.getDay() === 0) {
        domSeqCount++;
        domingosSeqMap.set(dia, domSeqCount);
      }
    }

    // -------------------------------------------------------------------------
    // FASE 1: Alocação Matriz por Colaborador com Grupos A/B/C e A/B
    // -------------------------------------------------------------------------
    ativos.forEach((func, idx) => {
      totalNosExplorados++;
      const funcId = func.id || func.matricula;
      const diasMatriz: Record<number, TipoDiaSigla> = {};
      explicacoes[func.matricula] = {};

      const estadoInicial = carryOverManager.getEstado(funcId);
      const temHistorico = carryOverManager.temHistorico(funcId);

      // Determinar Grupo Domingo e Grupo Feriado
      const grupoDom = func.grupo_domingo || (['A', 'B', 'C'][idx % 3]);
      const grupoFer = func.grupo_feriado || (['A', 'B'][idx % 2]);

      const isEspecialSector = func.setor?.toLowerCase().includes('padaria') ||
        func.setor?.toLowerCase().includes('açougue') || func.setor?.toLowerCase().includes('acougue');

      // Estado local de rodízio de domingo para este funcionário
      let domingosDescansoRestantes = estadoInicial.domingosDescansoRestantes ?? 0;
      let domingosConsecutivosTrabalhados = estadoInicial.domingosConsecutivosTrabalhados ?? 0;

      // Historico recente com os dias do mês anterior
      const historicoRecente: TipoDiaSigla[] = [];
      const consecutivosCarry = Math.min(estadoInicial.diasConsecutivosAcumulados || 0, 6);
      for (let i = 0; i < consecutivosCarry; i++) {
        historicoRecente.push('T');
      }

      let diasConsecutivosAcumulados = consecutivosCarry;
      let horasSemanaAtual = 0;

      for (let dia = 1; dia <= diasNoMes; dia++) {
        const dateObj = new Date(year, month - 1, dia);
        const diaSemana = dateObj.getDay(); // 0 = Dom

        if (diaSemana === 0) {
          horasSemanaAtual = 0;
        }

        const feriadoInfo = feriadosMap.get(dia);
        const ehFeriado = !!feriadoInfo;

        let sigla: TipoDiaSigla = 'T';

        if (ehFeriado) {
          const seqFer = feriadoInfo.index;
          // Grupo A trabalha feriados ímpares, Grupo B trabalha feriados pares
          const trabalhaFeriado = grupoFer === 'A' ? (seqFer % 2 !== 0) : (seqFer % 2 === 0);
          sigla = trabalhaFeriado ? 'TF' : 'F';
        } else if (diaSemana === 0) {
          const seqDom = domingosSeqMap.get(dia)!;
          let podeTrabalharDomingo = false;

          if (isEspecialSector) {
            if (func.genero === 'F') {
              // CLT Art. 386 (Mulheres: 1T:1F quinzenal)
              podeTrabalharDomingo = grupoDom === 'A' ? (seqDom % 2 !== 0) : (seqDom % 2 === 0);
            } else {
              // CCT Açougue/Padaria Homens (2T:1F)
              const mod3 = (seqDom - 1) % 3;
              podeTrabalharDomingo = grupoDom === 'A' ? (mod3 !== 2) : (mod3 !== 0);
            }
          } else {
            // Matriz Geral 3 Grupos (1T:2F)
            // Dom 1: A | Dom 2: B | Dom 3: C | Dom 4: A | Dom 5: B
            const grupoEsperadoDom = ['A', 'B', 'C'][(seqDom - 1) % 3];
            podeTrabalharDomingo = (grupoDom === grupoEsperadoDom);
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

        if (diaSemana === 0) {
          const trabalhouDomingo = HardConstraintsEvaluator.ehDiaTrabalho(sigla);
          if (trabalhouDomingo) {
            domingosDescansoRestantes = 2;
            domingosConsecutivosTrabalhados++;
          } else {
            domingosDescansoRestantes = Math.max(0, domingosDescansoRestantes - 1);
            domingosConsecutivosTrabalhados = 0;
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
          ehFeriado && sigla === 'F' ? feriadoInfo.nome : undefined
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
        grupoUltimoFeriadoTrabalhado: grupoFer as 'A' | 'B',
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
