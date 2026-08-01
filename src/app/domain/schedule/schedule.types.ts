import type { YearMonth } from '../shared/year-month';

export type TipoDia = 'T' | 'TD' | 'TF' | 'F' | 'FD' | 'FE' | 'AF' | 'FR';

export function isTrabalho(t: TipoDia): boolean {
  return t === 'T' || t === 'TD' || t === 'TF';
}

export function isFolga(t: TipoDia): boolean {
  return t === 'F' || t === 'FD' || t === 'FE' || t === 'AF' || t === 'FR';
}

export function isFolgaNormal(t: TipoDia): boolean {
  return t === 'F' || t === 'FD' || t === 'FE';
}

export interface ScheduleEntry {
  matricula: string;
  nome: string;
  setor: string;
  turno: string;
  genero: 'M' | 'F';
  cargo?: string;
  rodizioId?: string;
  grupoDomingo?: string;
  grupoFeriado?: string;
  setoresCobertura?: string[];
  dias: Record<number, TipoDia>;
}

export interface Employee {
  id?: string;
  loja_id: string;
  primeiro_nome: string;
  matricula_aleatoria: string;
  setor: string;
  cargo: string;
  turno_padrao: string;
  genero: 'M' | 'F';
  ativo: boolean;
  rodizio_id?: string;
  grupo_domingo?: string;
  grupo_feriado?: string;
  grupo?: string;
  setores_cobertura?: string[];
}

export interface Holiday {
  id: string;
  nome: string;
  data: string;
  tipo: 'Nacional' | 'Estadual' | 'Municipal' | 'Ponto Facultativo';
  abrangencia?: string;
  descricao?: string;
  funcionamento_proibido: boolean;
}

export interface TurnoConfig {
  id: string;
  nome: string;
  entrada: string;
  saida: string;
  intervaloMinutos: number;
  cargaHorariaLiquidaMinutos: number;
  excedeLimiteDiario?: boolean;
}

export interface PeakHourRequirement {
  sectorId: string;
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
  minEmployees: number;
  idealEmployees?: number;
}

export interface HourlyCoverage {
  startTime: string;
  endTime: string;
  activeCount: number;
  onBreakEmployeeIds: string[];
}

export interface CoverageGap {
  date: string;
  startTime: string;
  endTime: string;
  required: number;
  actual: number;
  shortfall: number;
}

export interface ShiftBlock {
  startTime: string;
  endTime: string;
  requiredCount: number;
  assignedEmployeeIds: string[];
}

export interface AllocatorCriterion {
  id: string;
  label: string;
  fn: (entry: ScheduleEntry, context: ScheduleContext) => number;
}

export interface ScheduleConfig {
  minFolgas: number;
  maxFolgas: number;
  maxConsecutiveWorkDays: number;
  minBreakBetweenShiftsMinutes: number;
  allocatorPriority: string[];
  optimizationPasses: number;
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  minFolgas: 4,
  maxFolgas: 5,
  maxConsecutiveWorkDays: 6,
  minBreakBetweenShiftsMinutes: 660,
  allocatorPriority: [
    'longestStreak',
    'leastMonthlyHours',
    'deterministicTiebreaker',
  ],
  optimizationPasses: 0,
};

export interface ScheduleContext {
  month: YearMonth;
  employees: Employee[];
  holidays: Holiday[];
  requirements: PeakHourRequirement[];
  turnosConfigs: TurnoConfig[];
  config: ScheduleConfig;
  previousMonthHistory?: Record<string, TipoDia[]>;
  historicoMesAnterior?: Record<string, TipoDia[]>;
  leaveEvents?: LeaveEvent[];
}

export interface LeaveEvent {
  id?: string;
  matricula: string;
  tipo: 'FERIAS' | 'ATESTADO' | 'LICENCA' | 'FOLGA_COMPENSATORIA';
  data_inicio: string;
  data_fim: string;
  observacao?: string;
}

export interface Violation {
  type: string;
  severity: 'error' | 'warning';
  message: string;
  entry?: ScheduleEntry;
  day?: number;
}

export interface ScheduleScore {
  total: number;
  coverage: number;
  fairness: number;
  violations: number;
  warnings: string[];
  balance: {
    sundayDistribution: number;
    averageLoad: number;
    loadStdDev: number;
  };
}

export interface ScheduleMetrics {
  coveragePercent: number;
  sundaysDistributed: number;
  averageLoad: number;
  loadStdDev: number;
  folgasCount: number;
  estimatedOvertimeMinutes: number;
}

export interface GenerateScheduleResult {
  entries: ScheduleEntry[];
  coverageGaps: CoverageGap[];
  score: ScheduleScore;
  violations: Violation[];
}

export interface SectorStrategy {
  id: string;
  getRules(): ScheduleRule[];
  getMinEmployeesForDay(context: ScheduleContext, day: number, isSunday: boolean, isHoliday: boolean): number;
  canGrantDayOff(entry: ScheduleEntry, day: number, context: ScheduleContext, currentDayOffCount: number): boolean;
}

export interface ScheduleRule {
  id: string;
  description: string;
  validate(entries: ScheduleEntry[], context: ScheduleContext): Violation[];
}
