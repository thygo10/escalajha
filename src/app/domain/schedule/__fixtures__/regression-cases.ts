import type { ScheduleEntry, ScheduleContext } from '../schedule.types';
import { createYearMonth } from '../../shared/year-month';
import { INITIAL_FUNCIONARIOS, INITIAL_FERIADOS } from '../../../models/mock-data';

export interface RegressionCase {
  id: string;
  description: string;
  sector: string;
  employees: typeof INITIAL_FUNCIONARIOS;
  month: ReturnType<typeof createYearMonth>;
  holidays: typeof INITIAL_FERIADOS;
  expectedViolationCount: number;
  expectedViolationTypes?: string[];
}

export const regressionCases: RegressionCase[] = [
  {
    id: 'BUG-001',
    description: 'CLT Art. 67 — Frente de Caixa Jan/2026 não deve ter violações',
    sector: 'Frente de Caixa',
    employees: INITIAL_FUNCIONARIOS.filter(f => f.setor === 'Frente de Caixa' && f.ativo),
    month: createYearMonth(2026, 1),
    holidays: INITIAL_FERIADOS,
    expectedViolationCount: 0,
  },
  {
    id: 'BUG-002',
    description: 'CLT Art. 67 — Frente de Caixa Fev/2026 não deve ter violações',
    sector: 'Frente de Caixa',
    employees: INITIAL_FUNCIONARIOS.filter(f => f.setor === 'Frente de Caixa' && f.ativo),
    month: createYearMonth(2026, 2),
    holidays: INITIAL_FERIADOS,
    expectedViolationCount: 0,
  },
  {
    id: 'BUG-003',
    description: 'Padaria (Produção) — max 1 folga/dia em dias úteis',
    sector: 'Padaria (Produção)',
    employees: INITIAL_FUNCIONARIOS.filter(f => f.setor === 'Padaria (Produção)' && f.ativo),
    month: createYearMonth(2026, 3),
    holidays: INITIAL_FERIADOS,
    expectedViolationCount: 0,
  },
  {
    id: 'BUG-004',
    description: 'Fiscal de Caixa — duplas de abertura/fechamento',
    sector: 'Fiscal de Caixa',
    employees: INITIAL_FUNCIONARIOS.filter(f => f.setor === 'Fiscal de Caixa' && f.ativo),
    month: createYearMonth(2026, 4),
    holidays: INITIAL_FERIADOS,
    expectedViolationCount: 0,
  },
  {
    id: 'BUG-005',
    description: 'Açougue — regras de domingo para mulheres (CLT 386)',
    sector: 'Açougue',
    employees: INITIAL_FUNCIONARIOS.filter(f => f.setor === 'Açougue' && f.ativo),
    month: createYearMonth(2026, 5),
    holidays: INITIAL_FERIADOS,
    expectedViolationCount: 0,
  },
  {
    id: 'BUG-006',
    description: 'Natal (25/12) como FE para todos',
    sector: 'Frente de Caixa',
    employees: INITIAL_FUNCIONARIOS.filter(f => f.setor === 'Frente de Caixa' && f.ativo),
    month: createYearMonth(2026, 12),
    holidays: [
      ...INITIAL_FERIADOS,
      { id: 'natal-2026', nome: 'Natal', data: '2026-12-25', tipo: 'Nacional' as const, funcionamento_proibido: true },
    ],
    expectedViolationCount: 0,
  },
];
