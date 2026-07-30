import { Injectable } from '@angular/core';
import { Funcionario, EscalaItem, TipoDia, Feriado, ValidacaoEscalaResultado, TurnoConfig, EstadoTransicao, EventoAfastamento, RegraConformidade, HorarioPresenca, ResumoFuncionarioMetrics } from '../models/types';
import { EscalaValidatorService } from './escala-validator.service';
import { generateSchedule } from '../domain/schedule/schedule-generator';
import type { Employee, Holiday, LeaveEvent } from '../domain/schedule/schedule.types';
import type { YearMonth } from '../domain/shared/year-month';
import { CSPSolverEngine, FuncionarioEntrada } from '../../solver/search/csp-solver';
import { SolverOptions } from '../../solver/core/types';


export interface OpcionesGeracaoEscala {
  permitirDoisDiasConsecutivos?: boolean;
  diasPermitidosFolga?: number[];
  feriados?: Feriado[];
  minFuncionariosPorDia?: number;
  minFuncionariosDomingo?: number;
  minFuncionariosFeriado?: number;
  minOperadoresPorHora?: number;
  modeloEscala?: string;
  estadosTransicao?: Map<string, EstadoTransicao>;
  afastamentos?: EventoAfastamento[];
  regrasConformidade?: RegraConformidade[];
  historicoMesAnterior?: Record<string, TipoDia[]>;
  turnosConfigs?: TurnoConfig[];
  horarioFuncionamento?: import('../models/types').HorarioFuncionamento;
  seed?: number;
}

@Injectable({
  providedIn: 'root'
})
export class EscalaGeneratorService {

  private readonly scheduleCache = new Map<string, EscalaItem[]>();

  constructor(private readonly validatorService: EscalaValidatorService) { }

  clearAllCache(): void {
    this.scheduleCache.clear();
  }

  invalidateCache(ano: number, mes: number): void {
    this.scheduleCache.clear();
  }

  private _generateCacheKey(year: number, month: number, employees: Funcionario[], options?: Partial<OpcionesGeracaoEscala>): string {
    const payload = {
      ano: year,
      mes: month,
      funcs: employees.map(f => ({ id: f.matricula_aleatoria, turno: f.turno_padrao, ativo: f.ativo, setor: f.setor })),
      feriados: options?.feriados || [],
      turnos: options?.turnosConfigs || []
    };
    return this._simpleHash(JSON.stringify(payload));
  }

  private _simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.codePointAt(i) ?? 0;
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  gerarEscalaMensalCached(
    employees: Funcionario[],
    year: number,
    month: number,
    options?: Partial<OpcionesGeracaoEscala>
  ): EscalaItem[] {
    const cacheKey = this._generateCacheKey(year, month, employees, options);
    if (this.scheduleCache.has(cacheKey)) {
      return this.scheduleCache.get(cacheKey)!;
    }

    const result = this.gerarEscalaMensal(employees, year, month, options);
    this.scheduleCache.set(cacheKey, result);
    return result;
  }

  gerarEscalaMensal(
    employees: Funcionario[],
    year: number,
    month: number,
    options?: Partial<OpcionesGeracaoEscala>
  ): EscalaItem[] {
    const solverEngine = new CSPSolverEngine();
    
    // Converter funcionarios de entrada para o formato do Solver
    const funcEntrada: FuncionarioEntrada[] = employees.map(f => ({
      id: f.id || f.matricula_aleatoria,
      matricula: f.matricula_aleatoria,
      nome: f.primeiro_nome,
      setor: f.setor,
      cargo: f.cargo,
      turno: f.turno_padrao || '08:00 às 16:20',
      genero: f.genero || 'F',
      ativo: f.ativo ?? true
    }));

    // Solver Options
    const solverOpts: SolverOptions = {
      year,
      month,
      minFuncionariosPorDia: options?.minFuncionariosPorDia,
      feriados: (options?.feriados || []).map(fer => ({
        data: fer.data,
        nome: fer.nome,
        proibido: fer.funcionamento_proibido
      }))
    };

    const solverResult = solverEngine.solve(funcEntrada, solverOpts);

    if (solverResult.status !== 'NO_SOLUTION' && solverResult.itens.length > 0) {
      const val = this.validatorService.validarEscala(
        solverResult.itens as EscalaItem[],
        year,
        month,
        options?.minFuncionariosPorDia ?? 2,
        options?.turnosConfigs || [],
        options?.feriados || [],
        {
          historicoMesAnterior: options?.historicoMesAnterior,
          minDomingo: options?.minFuncionariosDomingo,
          minFeriado: options?.minFuncionariosFeriado,
          permitirDoisDiasConsecutivos: options?.permitirDoisDiasConsecutivos
        }
      );
      if (val.valida && val.totalErros === 0) {
        return solverResult.itens as EscalaItem[];
      }
    }

    // Fallback para o gerador de segurança comprovado generateSchedule
    const result = generateSchedule({
      employees: employees as Employee[],
      month: { year, month } as YearMonth,
      holidays: (options?.feriados || []) as Holiday[],
      turnosConfigs: (options?.turnosConfigs || []) as any,
      minFuncionariosPorDia: options?.minFuncionariosPorDia,
      minFuncionariosDomingo: options?.minFuncionariosDomingo,
      minFuncionariosFeriado: options?.minFuncionariosFeriado,
      horarioFuncionamento: options?.horarioFuncionamento,
      modeloEscala: options?.modeloEscala,
      leaveEvents: (options?.afastamentos || []) as LeaveEvent[],
      historicoMesAnterior: options?.historicoMesAnterior,
      seed: options?.seed
    });
    return result.entries as EscalaItem[];
  }

  // -------------------------------------------------------------------------
  // 🌉 MÉTODOS DE FACADE / RECOMPATIBILIDADE PARA O DASHBOARD E TESTES
  // -------------------------------------------------------------------------

  validarEscala(
    itens: EscalaItem[],
    ano: number,
    mes: number,
    minRequerido: number = 2,
    turnosConfigs: TurnoConfig[] = [],
    feriados: Feriado[] = [],
    opcoesExtra?: Record<string, TipoDia[]> | { historicoMesAnterior?: Record<string, TipoDia[]>; minDomingo?: number }
  ): ValidacaoEscalaResultado {
    return this.validatorService.validarEscala(itens, ano, mes, minRequerido, turnosConfigs, feriados, opcoesExtra);
  }

  calcularCargaHorariaLiquida(entrada: string, saida: string, intervaloMinutos: number) {
    return this.validatorService.calcularCargaHorariaLiquida(entrada, saida, intervaloMinutos);
  }

  calcularPresencaPorFaixaHoraria(itens: EscalaItem[], turnosConfigs: TurnoConfig[], dia: number): HorarioPresenca[] {
    return this.validatorService.calcularPresencaPorFaixaHoraria(itens, turnosConfigs, dia);
  }

  calcularResumoMetrics(itens: EscalaItem[], funcionarios: Funcionario[], turnosConfigs: TurnoConfig[], ano: number, mes: number): ResumoFuncionarioMetrics[] {
    return this.validatorService.calcularResumoMetrics(itens, funcionarios, turnosConfigs, ano, mes);
  }

  extrairHistoricoMesAnterior(itens: EscalaItem[]): Record<string, TipoDia[]> {
    const res: Record<string, TipoDia[]> = {};
    if (!itens) return res;
    itens.forEach(item => {
      if (item.matricula && item.dias) {
        const diasKeys = Object.keys(item.dias).map(Number).sort((a, b) => a - b);
        const ultimosDias = diasKeys.slice(-7).map(d => item.dias[d]);
        res[item.matricula] = ultimosDias;
      }
    });
    return res;
  }
}