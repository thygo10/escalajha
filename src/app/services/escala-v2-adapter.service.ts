import { Injectable } from '@angular/core';
import { Funcionario, EscalaItem, TipoDia, ValidacaoEscalaResultado, TurnoConfig, Feriado, HorarioPresenca, ResumoFuncionarioMetrics, HorarioFuncionamento } from '../models/types';
import { generateDeterministicSchedule } from '../domain/schedule/v2/deterministic-schedule-generator';
import { GeneratorV2Input, ScheduleV2Item, SectorRuleConfig } from '../domain/schedule/v2/schedule-v2.types';
import { EscalaGeneratorService } from './escala-generator.service';

/**
 * Adapter that exposes the same public API the Dashboard expects from the old
 * `EscalaGeneratorService` but delegates schedule generation to the V2
 * deterministic engine. All auxiliary/metric methods are delegated to the
 * original `EscalaGeneratorService` to avoid duplication.
 */
@Injectable({ providedIn: 'root' })
export class EscalaV2AdapterService {

  constructor(private readonly legacy: EscalaGeneratorService) {}

  // -------------------------------------------------------------------------
  // Cache management – delegate to the legacy service so both caches are kept
  // in sync (the legacy service's cache is keyed the same way).
  // -------------------------------------------------------------------------

  clearAllCache(): void {
    this.legacy.clearAllCache();
  }

  invalidateCache(ano: number, mes: number): void {
    this.legacy.invalidateCache(ano, mes);
  }

  // -------------------------------------------------------------------------
  // Schedule generation – V2 engine
  // -------------------------------------------------------------------------

  /**
   * Mirrors `EscalaGeneratorService.gerarEscalaMensalCached`.
   * Runs the V2 deterministic engine and returns an EscalaItem[] array
   * compatible with the Dashboard's existing UI.
   */
  gerarEscalaMensal(
    employees: Funcionario[],
    year: number,
    month: number,
    options?: Partial<{
      permitirDoisDiasConsecutivos?: boolean;
      diasPermitidosFolga?: number[];
      feriados?: Feriado[];
      minFuncionariosPorDia?: number;
      minFuncionariosDomingo?: number;
      minFuncionariosFeriado?: number;
      minOperadoresPorHora?: number;
      modeloEscala?: string;
      estadosTransicao?: Map<string, any>;
      afastamentos?: any[];
      regrasConformidade?: any[];
      historicoMesAnterior?: Record<string, TipoDia[]>;
      turnosConfigs?: TurnoConfig[];
      horarioFuncionamento?: HorarioFuncionamento;
      seed?: number;
    }>
  ): EscalaItem[] {
    const hasExplicitCoverage =
      options?.minFuncionariosPorDia !== undefined ||
      options?.minFuncionariosDomingo !== undefined ||
      options?.minFuncionariosFeriado !== undefined;

    const sectorRule: SectorRuleConfig | undefined = hasExplicitCoverage
      ? {
          setor: employees[0]?.setor ?? 'Setor',
          minFuncionariosDia: options?.minFuncionariosPorDia,
          minFuncionariosDomingo: options?.minFuncionariosDomingo,
          minFuncionariosFeriado: options?.minFuncionariosFeriado
        }
      : undefined;

    const input: GeneratorV2Input = {
      employees: employees as any,
      month: { year, month },
      holidays: (options?.feriados ?? []) as any,
      sectorRule,
      leaveEvents: (options?.afastamentos ?? []) as any,
      previousStates: this.buildPreviousStates(options?.historicoMesAnterior)
    };

    const v2Result = generateDeterministicSchedule(input);

    const matriculaMap = new Map(employees.map(e => [e.matricula_aleatoria, e]));

    const escalaItems: EscalaItem[] = v2Result.items.map((v2: ScheduleV2Item) => {
      const emp = matriculaMap.get(v2.matricula);
      return {
        funcionarioId: v2.funcionarioId,
        matricula: v2.matricula,
        nome: v2.nome,
        setor: v2.setor,
        setor_id: v2.setorId,
        turno: v2.turno,
        genero: v2.genero,
        cargo: v2.cargo,
        rodizio_id: emp?.rodizio_id,
        grupo_domingo: v2.grupoDomingo,
        grupo_feriado: v2.grupoFeriado,
        grupo_folga_compensatoria: v2.grupoFolgaCompensatoria,
        dias: v2.dias as Record<number, TipoDia>,
      } as any;
    });

    return escalaItems;
  }

  gerarEscalaMensalCached(
    employees: Funcionario[],
    year: number,
    month: number,
    options?: Parameters<EscalaV2AdapterService['gerarEscalaMensal']>[3]
  ): EscalaItem[] {
    // V2 engine is already deterministic; cache invalidation is handled
    // by the legacy service. Simply generate and return.
    return this.gerarEscalaMensal(employees, year, month, options);
  }

  // -------------------------------------------------------------------------
  // Validation – delegate to legacy (wraps EscalaValidatorService)
  // -------------------------------------------------------------------------

  validarEscala(
    itens: EscalaItem[],
    ano: number,
    mes: number,
    minRequerido: number = 2,
    turnosConfigs: TurnoConfig[] = [],
    feriados: Feriado[] = [],
    opcoesExtra?: any
  ): ValidacaoEscalaResultado {
    return this.legacy.validarEscala(itens, ano, mes, minRequerido, turnosConfigs, feriados, opcoesExtra);
  }

  // -------------------------------------------------------------------------
  // Metric helpers – delegate to legacy (wraps EscalaValidatorService)
  // -------------------------------------------------------------------------

  calcularCargaHorariaLiquida(entrada: string, saida: string, intervaloMinutos: number) {
    return this.legacy.calcularCargaHorariaLiquida(entrada, saida, intervaloMinutos);
  }

  calcularPresencaPorFaixaHoraria(itens: EscalaItem[], turnosConfigs: TurnoConfig[], dia: number): HorarioPresenca[] {
    return this.legacy.calcularPresencaPorFaixaHoraria(itens, turnosConfigs, dia);
  }

  calcularResumoMetrics(itens: EscalaItem[], funcionarios: Funcionario[], turnosConfigs: TurnoConfig[], ano: number, mes: number): ResumoFuncionarioMetrics[] {
    return this.legacy.calcularResumoMetrics(itens, funcionarios, turnosConfigs, ano, mes);
  }

  extrairHistoricoMesAnterior(itens: EscalaItem[]): Record<string, TipoDia[]> {
    return this.legacy.extrairHistoricoMesAnterior(itens);
  }

  /**
   * Converte o histórico do mês anterior (últimos dias por matrícula) no estado
   * inter-meses esperado pelo motor V2 (dias consecutivos acumulados no fim do mês).
   */
  private buildPreviousStates(
    historico?: Record<string, TipoDia[]>
  ): Record<string, { consecutiveDaysAtStart: number }> | undefined {
    if (!historico) return undefined;

    const res: Record<string, { consecutiveDaysAtStart: number }> = {};
    for (const [mat, dias] of Object.entries(historico)) {
      let consec = 0;
      for (let i = dias.length - 1; i >= 0; i--) {
        const d = dias[i];
        if (d === 'T' || d === 'TD' || d === 'TF') consec++;
        else break;
      }
      res[mat] = { consecutiveDaysAtStart: consec };
    }
    return res;
  }
}
