import { Funcionario, Feriado, TipoDia, GrupoFolgaCompensatoria } from '../../../models/types';
import { YearMonth } from '../../shared/year-month';

export interface SectorRuleConfig {
  setor: string;
  minFuncionariosDia?: number;
  minFuncionariosDomingo?: number;
  minFuncionariosFeriado?: number;
  permitirFolgaSabado?: boolean;
}

export interface EmployeeMonthState {
  employeeId: string;
  year: number;
  month: number;
  consecutiveDaysAtStart: number; // Days worked at end of previous month
  lastSundayWorked?: string;       // YYYY-MM-DD
  lastHolidayWorked?: string;      // YYYY-MM-DD
  grupoDomingo: string;
  grupoFeriado: string;
  grupoFolgaCompensatoria: GrupoFolgaCompensatoria;
}

export interface ScheduleV2Item {
  funcionarioId: string;
  matricula: string;
  nome: string;
  setor: string;
  setorId?: string;
  turno: string;
  genero: 'M' | 'F';
  cargo?: string;
  grupoDomingo: string;
  grupoFeriado: string;
  grupoFolgaCompensatoria: GrupoFolgaCompensatoria;
  dias: Record<number, TipoDia>;
  motivosAlteracao?: Record<number, string>;
}

export interface V2LeaveEvent {
  matricula: string;
  tipo: 'FERIAS' | 'ATESTADO' | 'LICENCA';
  data_inicio: string; // 'YYYY-MM-DD'
  data_fim: string;   // 'YYYY-MM-DD'
  observacao?: string;
}

export interface GeneratorV2Input {
  employees: Funcionario[];
  month: YearMonth;
  holidays?: Feriado[];
  turnosConfigs?: any[];
  sectorRule?: SectorRuleConfig;
  minFuncionariosDia?: number;
  minFuncionariosDomingo?: number;
  minFuncionariosFeriado?: number;
  leaveEvents?: V2LeaveEvent[];
  previousStates?: Record<string, Partial<EmployeeMonthState>>;
}

export interface GeneratorV2Result {
  month: YearMonth;
  setor: string;
  items: ScheduleV2Item[];
  endStates: Record<string, EmployeeMonthState>;
  violations: Array<{
    code: string;
    message: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    employeeId?: string;
    day?: number;
  }>;
  isValid: boolean;
}
