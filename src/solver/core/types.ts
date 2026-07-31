/**
 * EscalaJHA Solver Core Types (Pure TypeScript)
 * PRD v4.0 Production Blueprint
 */

export type ExecutionStatus = 'SUCCESS' | 'NO_SOLUTION' | 'TIMEOUT' | 'PARTIAL' | 'CANCELLED';

export type ConstraintFailureCategory = 
  | 'RESOURCE_SHORTAGE'
  | 'RULE_CONFLICT'
  | 'TENANT_CONFIGURATION'
  | 'INVALID_PARAMETERS'
  | 'MISSING_HISTORY';

export interface ConstraintFailure {
  categoria: ConstraintFailureCategory;
  restricaoViolada: string;
  detalhes: string;
}

export interface FuncionarioEstadoRegra {
  funcionarioId: string;
  ultimoDomingoTrabalhado?: string; // YYYY-MM-DD
  domingosDescansoRestantes: number; // 0, 1 ou 2
  domingosConsecutivosTrabalhados?: number; // Para regra 3x1 (Homens)
  grupoUltimoFeriadoTrabalhado: 'A' | 'B';
  diasConsecutivosAcumulados: number; // Carry-over do mês anterior
}

export interface SolverRodizioConfig {
  domingosTrabalhados: number;
  domingosFolga: number;
  quantidadeGrupos: number;
  usaGrupo: boolean;
  codigosGrupos?: string[];
}

export interface SolverOptions {
  year: number;
  month: number; // 1-12
  minFuncionariosPorDia?: number;
  minFuncionariosDomingo?: number;
  modeloEscala?: '6x1' | '5x1' | 'FLEXIVEL_CSP';
  rodizioConfig?: SolverRodizioConfig;
  seed?: number;
  usarRegraDomingoCustomizada?: boolean;
  estadosTransicao?: Map<string, FuncionarioEstadoRegra>;
  feriados?: { data: string; nome: string; proibido?: boolean }[];
  afastamentos?: { funcionarioId: string; dataInicio: string; dataFim: string; motivo: string }[];
  turnosConfigs?: { id: string; nome: string; inicio: string; fim: string; intervaloMinutos: number }[];
  timeoutMs?: number; // Padrão 30.000 ms
}

export type TipoDiaSigla = 'T' | 'TD' | 'TF' | 'F' | 'FD' | 'FE' | 'AF' | 'FR';

export interface SolverEscalaItem {
  matricula: string;
  nome: string;
  setor: string;
  turno: string;
  genero: 'M' | 'F';
  cargoExercido?: string;
  dias: Record<number, TipoDiaSigla>;
}

export interface SolverResult {
  status: ExecutionStatus;
  tempoExecucaoMs: number;
  scoreQualidade: number; // 0 a 100
  nosExplorados: number;
  itens: SolverEscalaItem[];
  falhas: ConstraintFailure[];
  explicacoes?: Record<string, Record<number, string>>; // [matricula][dia] => motivo
  estadosSaida?: Map<string, FuncionarioEstadoRegra>;
}
