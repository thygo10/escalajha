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
import { getAbsoluteSundayIndex, getAbsoluteHolidayIndex } from '../../app/domain/shared/year-month';

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

    // Mapa de feriados: dia -> { nome, index, proibido, dataStr }
    const feriadosMap = new Map<number, { nome: string; index: number; proibido: boolean; dataStr: string }>();
    if (options.feriados) {
      for (const fer of options.feriados) {
        const d = new Date(fer.data + 'T00:00:00');
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          const absHolidayIdx = getAbsoluteHolidayIndex(fer.data, options.feriados);
          feriadosMap.set(d.getDate(), { nome: fer.nome, index: absHolidayIdx, proibido: !!fer.proibido, dataStr: fer.data });
        }
      }
    }

    // Mapa de afastamentos / férias: funcionarioId -> Map<dia, TipoDiaSigla>
    const afastamentosMap = new Map<string, Map<number, TipoDiaSigla>>();
    if (options.afastamentos) {
      for (const af of options.afastamentos) {
        const dIni = new Date(af.dataInicio + 'T00:00:00');
        const dFim = new Date(af.dataFim + 'T00:00:00');
        const funcMap = afastamentosMap.get(af.funcionarioId) || new Map<number, TipoDiaSigla>();

        for (let d = 1; d <= diasNoMes; d++) {
          const curDate = new Date(year, month - 1, d);
          if (curDate >= dIni && curDate <= dFim) {
            const siglaAf: TipoDiaSigla = (af.motivo?.toUpperCase().includes('FERIAS') || af.motivo?.toUpperCase().includes('FÉRIAS')) ? 'FR' : 'AF';
            funcMap.set(d, siglaAf);
          }
        }
        afastamentosMap.set(af.funcionarioId, funcMap);
      }
    }

    // -------------------------------------------------------------------------
    // FASE 1: Alocação Matriz por Colaborador com Índice Absoluto
    // -------------------------------------------------------------------------
    const codigosGrupos = options.rodizioConfig?.codigosGrupos || ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const getGroupIndex = (codigo?: string, defaultIdx: number = 0): number => {
      if (!codigo) return defaultIdx;
      const upper = codigo.trim().toUpperCase();
      if (upper === 'AB') return -2; // Marcação especial Grupo AB Coringa
      const foundIdx = codigosGrupos.indexOf(upper);
      return foundIdx >= 0 ? foundIdx : defaultIdx;
    };

    const qtdGruposDom = options.rodizioConfig?.quantidadeGrupos || 3;

    ativos.forEach((func, idx) => {
      totalNosExplorados++;
      const diasMatriz: Record<number, TipoDiaSigla> = {};
      explicacoes[func.matricula] = {};

      const estadoInicial = carryOverManager.getEstado(func.id) || carryOverManager.getEstado(func.matricula);

      const domGroupIdx = getGroupIndex(func.grupo_domingo, idx % qtdGruposDom);
      const ferGroupIdx = getGroupIndex(func.grupo_feriado, idx % 2);

      const consecutivosCarry = Math.min(estadoInicial.diasConsecutivosAcumulados || 0, 6);

      for (let dia = 1; dia <= diasNoMes; dia++) {
        const dateObj = new Date(year, month - 1, dia);
        const diaSemana = dateObj.getDay(); // 0 = Dom

        const feriadoInfo = feriadosMap.get(dia);
        const ehFeriado = !!feriadoInfo;
        const siglaAfast = (func.id ? afastamentosMap.get(func.id)?.get(dia) : undefined) || (func.matricula ? afastamentosMap.get(func.matricula)?.get(dia) : undefined);

        let sigla: TipoDiaSigla = 'T';

        if (siglaAfast) {
          sigla = siglaAfast;
        } else if (feriadoInfo?.proibido) {
          sigla = 'FE';
        } else if (ehFeriado) {
          const absFerIdx = feriadoInfo.index;
          const effGroupIdx = Math.max(0, ferGroupIdx);
          const trabalhaFeriado = (absFerIdx % 2 === effGroupIdx);
          sigla = trabalhaFeriado ? 'TF' : 'F';
        } else if (diaSemana === 0) {
          const absSunIdx = getAbsoluteSundayIndex(year, month, dia);
          let trabalhaDomingo = false;

          if (domGroupIdx === -2) {
            // Coringa AB: Trabalha nos domingos A e B (absSunIdx % 3 !== 2), folga em C
            trabalhaDomingo = (absSunIdx % qtdGruposDom) !== 2;
          } else if (func.genero === 'F' && options.usarRegraDomingoCustomizada) {
            // CLT Art. 386 (Mulheres: quinzenal 1T:1F)
            trabalhaDomingo = ((absSunIdx + Math.max(0, domGroupIdx)) % 2 !== 0);
          } else {
            // 1T:2F Padrão
            const effGroupIdx = Math.max(0, domGroupIdx);
            trabalhaDomingo = (absSunIdx % qtdGruposDom) === (effGroupIdx % qtdGruposDom);
          }

          sigla = trabalhaDomingo ? 'TD' : 'FD';
        } else {
          // Dias úteis: alocação 6x1 proporcional
          const domNoFimDaSemana = dia + (7 - diaSemana);
          let trabalhaProximoDomingo = false;
          if (domNoFimDaSemana <= diasNoMes) {
            const absSunIdx = getAbsoluteSundayIndex(year, month, domNoFimDaSemana);
            const effGroupIdx = Math.max(0, domGroupIdx);
            trabalhaProximoDomingo = (absSunIdx % qtdGruposDom) === (effGroupIdx % qtdGruposDom);
          }

          const diaFolgaSemanal = 2 + (idx % 4);
          if (trabalhaProximoDomingo && diaSemana === diaFolgaSemanal) {
            const stAnt = diasMatriz[dia - 1];
            const ehTrabAnt = !stAnt || stAnt === 'T' || stAnt === 'TD' || stAnt === 'TF';
            if (ehTrabAnt) {
              sigla = 'F';
            }
          }
        }

        diasMatriz[dia] = sigla;
      }

      // Reparo de Dias Consecutivos (CLT Max 6)
      let consec = consecutivosCarry;
      for (let d = 1; d <= diasNoMes; d++) {
        const s = diasMatriz[d];
        if (s === 'T' || s === 'TD' || s === 'TF') {
          consec++;
          if (consec > 6) {
if (s === 'TD') {
  diasMatriz[d] = 'FD';
  consec = 0;
} else if (s === 'TF') {
  diasMatriz[d] = 'FE';
  consec = 0;
} else {
  diasMatriz[d] = 'F';
  consec = 0;
}
          }
        } else {
          consec = 0;
        }
      }

      resultadoItens.push({
        matricula: func.matricula,
        nome: func.nome,
        setor: func.setor,
        turno: func.turno,
        genero: func.genero,
        cargo: func.cargo,
        rodizio_id: func.rodizio_id,
        grupo_domingo: func.grupo_domingo,
        grupo_feriado: func.grupo_feriado,
        dias: diasMatriz
      });
    });

    // Atualiza estados de transição com o streak final do mês
    resultadoItens.forEach(item => {
      let finalConsec = 0;
      for (let d = diasNoMes; d >= 1; d--) {
        const s = item.dias[d];
        if (s === 'T' || s === 'TD' || s === 'TF') finalConsec++;
        else break;
      }
      const prevEst = carryOverManager.getEstado(item.matricula);
      carryOverManager.setEstado(item.matricula, {
        ...prevEst,
        diasConsecutivosAcumulados: finalConsec
      });
    });

    return {
      status: 'SUCCESS',
      tempoExecucaoMs: Date.now() - inicioMs,
      scoreQualidade: 100,
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
