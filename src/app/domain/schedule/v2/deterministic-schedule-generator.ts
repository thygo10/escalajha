import { TipoDia } from '../../../models/types';
import { totalDaysInMonth } from '../../shared/year-month';
import { GeneratorV2Input, GeneratorV2Result, ScheduleV2Item, EmployeeMonthState } from './schedule-v2.types';
import { validateAndNormalizeEmployeeGroups } from './group-validator.engine';
import { initializeEmployeeStates } from './employee-state.engine';
import { calculateSundayAssignments } from './sunday.engine';
import { calculateHolidayAssignments } from './holiday.engine';
import { assignWeeklyRests } from './weekly-rest.engine';
import { enforceMaxConsecutiveDays } from './consecutive-days.engine';
import { validateSectorCoverage } from './coverage-validator.engine';

/**
 * Motor Determinístico de Escalas - EscalaJHA v2
 * 
 * Substitui algoritmos heurísticos/solver por um pipeline determinístico em camadas
 * baseado em regras de negócio estritas acordadas com o RH.
 */
export function generateDeterministicSchedule(input: GeneratorV2Input): GeneratorV2Result {
  const { employees, month, holidays = [], sectorRule, previousStates } = input;
  const setor = employees.length > 0 ? employees[0].setor : 'Setor Único';
  const totalDays = totalDaysInMonth(month);

  // 1. Validação e Normalização de Grupos
  const groupValidation = validateAndNormalizeEmployeeGroups(employees);
  if (!groupValidation.isValid) {
    return {
      month,
      setor,
      items: [],
      endStates: {},
      violations: groupValidation.errors.map(err => ({ code: 'INVALID_GROUP', message: err, severity: 'ERROR' })),
      isValid: false
    };
  }

  // 2. Inicialização do Estado Inter-meses
  const normalizedEmployees = groupValidation.validatedEmployees;
  const initialStates = initializeEmployeeStates(normalizedEmployees, month, previousStates);
  const endStates: Record<string, EmployeeMonthState> = {};

  const items: ScheduleV2Item[] = [];
  const allViolations: Array<{ code: string; message: string; severity: 'ERROR' | 'WARNING' | 'INFO'; employeeId?: string; day?: number }> = [];

  // Registrar warnings de grupos normalizados
  groupValidation.warnings.forEach(warn => {
    allViolations.push({ code: 'GROUP_WARNING', message: warn, severity: 'WARNING' });
  });

  // 3. Processamento Individual por Funcionário
  for (const emp of normalizedEmployees) {
    const key = emp.id || emp.matricula_aleatoria;
    const empState = initialStates[key];

    // Passo 3.1: Domingos (Rotação 1T:2F)
    const sundayAssignments = calculateSundayAssignments(month, emp.grupo_domingo);

    // Passo 3.2: Feriados (Alternância A/B ou Fechado FE)
    const holidayAssignments = calculateHolidayAssignments(month, emp.grupo_feriado, holidays);

    // Montar mapa base inicial para o mês
    const diasMap: Record<number, TipoDia> = {};
    for (let d = 1; d <= totalDays; d++) {
      diasMap[d] = 'T'; // Default trabalho em dia comum
    }

    // Aplicar atribuições de domingos
    sundayAssignments.forEach(sa => {
      diasMap[sa.day] = sa.tipo;
    });

    // Aplicar atribuições de feriados
    holidayAssignments.forEach(ha => {
      diasMap[ha.day] = ha.tipo;
    });

    // Passo 3.3: Folgas Compensatórias Semanais
    // Regra Ouro DSR: Folga na semana APENAS quando trabalhou no domingo daquela semana
    const diasWithWeeklyRest = assignWeeklyRests(month, diasMap, emp.grupo_folga_compensatoria);

    // Passo 3.4: Regra Soberana - Máximo 6 Dias Consecutivos (Art. 67 CLT)
    const consecutiveResult = enforceMaxConsecutiveDays(
      month,
      diasWithWeeklyRest,
      empState.consecutiveDaysAtStart
    );

    // Atualizar estado final do mês para este funcionário
    let lastSunWorked: string | undefined = empState.lastSundayWorked;
    let lastHolWorked: string | undefined = empState.lastHolidayWorked;

    sundayAssignments.forEach(sa => {
      if (sa.tipo === 'TD') {
        const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(sa.day).padStart(2, '0')}`;
        lastSunWorked = dateStr;
      }
    });

    holidayAssignments.forEach(ha => {
      if (ha.tipo === 'TF') {
        const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(ha.day).padStart(2, '0')}`;
        lastHolWorked = dateStr;
      }
    });

    endStates[key] = {
      ...empState,
      consecutiveDaysAtStart: consecutiveResult.consecutiveDaysAtEnd,
      lastSundayWorked: lastSunWorked,
      lastHolidayWorked: lastHolWorked
    };

    items.push({
      funcionarioId: key,
      matricula: emp.matricula_aleatoria,
      nome: emp.primeiro_nome,
      setor: emp.setor,
      setorId: emp.setor_id,
      turno: emp.turno_padrao,
      genero: emp.genero,
      cargo: emp.cargo,
      grupoDomingo: emp.grupo_domingo,
      grupoFeriado: emp.grupo_feriado,
      grupoFolgaCompensatoria: emp.grupo_folga_compensatoria,
      dias: consecutiveResult.dias,
      motivosAlteracao: consecutiveResult.motivosAlteracao
    });
  }

  // 4. Validação de Cobertura de Setor
  const coverageViolations = validateSectorCoverage(month, items, sectorRule);
  coverageViolations.forEach(cv => {
    allViolations.push(cv);
  });

  const hasErrors = allViolations.some(v => v.severity === 'ERROR');

  return {
    month,
    setor,
    items,
    endStates,
    violations: allViolations,
    isValid: !hasErrors
  };
}
